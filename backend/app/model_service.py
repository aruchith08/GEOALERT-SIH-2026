"""
backend/app/model_service.py
============================
Safe, single-instance loading and prediction services for frozen Model A and Model B.
Strictly read-only; never retrains, refits, or mutates the frozen production artifacts.
"""

import hashlib
import numpy as np
import pandas as pd
import joblib
from typing import Tuple, Dict, Any

from backend.app.config import (
    MODEL_A_PATH, MODEL_B_PATH,
    EXPECTED_MODEL_A_SHA256, EXPECTED_MODEL_B_SHA256,
    STATIC_FEATURES, DYNAMIC_FEATURES
)

# Unpickler patch for sklearn 1.6 compatibility
import sklearn.compose._column_transformer
if not hasattr(sklearn.compose._column_transformer, '_RemainderColsList'):
    class _RemainderColsList(list):
        pass
    sklearn.compose._column_transformer._RemainderColsList = _RemainderColsList


def compute_file_sha256(filepath: str) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


class ModelService:
    """
    Singleton service managing the frozen production Model A and Model B artifacts.
    """
    def __init__(self):
        self.model_a = None
        self.model_b = None
        self.model_a_hash = None
        self.model_b_hash = None
        self.model_a_verified = False
        self.model_b_verified = False
        self.is_loaded = False

    def load_models(self):
        if self.is_loaded:
            return

        if not MODEL_A_PATH.exists():
            raise FileNotFoundError(f"Model A artifact not found at: {MODEL_A_PATH}")
        if not MODEL_B_PATH.exists():
            raise FileNotFoundError(f"Model B artifact not found at: {MODEL_B_PATH}")

        # Compute SHA-256 hashes
        self.model_a_hash = compute_file_sha256(str(MODEL_A_PATH))
        self.model_b_hash = compute_file_sha256(str(MODEL_B_PATH))

        # Verify cryptographic integrity
        if self.model_a_hash != EXPECTED_MODEL_A_SHA256:
            raise ValueError(
                f"CRITICAL INTEGRITY FAILURE: Model A hash mismatch! "
                f"Observed: {self.model_a_hash} vs Expected: {EXPECTED_MODEL_A_SHA256}"
            )
        self.model_a_verified = True

        if self.model_b_hash != EXPECTED_MODEL_B_SHA256:
            raise ValueError(
                f"CRITICAL INTEGRITY FAILURE: Model B hash mismatch! "
                f"Observed: {self.model_b_hash} vs Expected: {EXPECTED_MODEL_B_SHA256}"
            )
        self.model_b_verified = True

        # Load pipelines in read-only state
        self.model_a = joblib.load(MODEL_A_PATH)
        self.model_b = joblib.load(MODEL_B_PATH)
        self.is_loaded = True
        print("[ModelService] Loaded and cryptographically verified Model A & Model B [PASS]")

    def predict_static_susceptibility(self, static_dict: Dict[str, Any]) -> float:
        """
        Runs Model A pipeline on the 16 validated static environmental features.
        Returns P(S) in [0.0, 1.0].
        """
        if not self.is_loaded:
            self.load_models()

        row = {}
        for col in STATIC_FEATURES:
            val = static_dict.get(col)
            if val is None:
                raise ValueError(f"Missing required static feature: {col}")
            if col in ["landcover_code", "lithology_code"]:
                row[col] = str(val)
            else:
                row[col] = float(val)

        df = pd.DataFrame([row])
        proba = self.model_a.predict_proba(df[STATIC_FEATURES])[0, 1]
        return float(np.clip(proba, 0.0, 1.0))

    def predict_dynamic_trigger(self, dynamic_dict: Dict[str, Any]) -> float:
        """
        Runs Model B pipeline on the 10 validated CHIRPS precipitation predictors.
        Returns P(D) in [0.0, 1.0].
        """
        if not self.is_loaded:
            self.load_models()

        row = []
        for col in DYNAMIC_FEATURES:
            val = dynamic_dict.get(col)
            if val is None:
                raise ValueError(f"Missing required dynamic rainfall feature: {col}")
            row.append(float(val))

        arr = np.array([row], dtype=np.float32)
        proba = self.model_b.predict_proba(arr)[0, 1]
        return float(np.clip(proba, 0.0, 1.0))


# Global singleton instance
model_service = ModelService()
