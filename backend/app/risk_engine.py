"""
backend/app/risk_engine.py
==========================
Coupling logic, 4-tier operational alert classification engine,
and dual-model explainability attribution.
"""

from typing import Tuple, Optional
from backend.app.config import (
    FROZEN_COUPLING_THRESHOLD,
    STATIC_TERRAIN_SAFETY_FLOOR,
    THRESHOLD_YELLOW_ORANGE,
    THRESHOLD_ORANGE_RED
)
from backend.app.schemas import AlertTierEnum, ExplainabilityBreakdown


class RiskEngine:
    """
    Unified dual-model risk coupling, 4-tier warning classification,
    and explainability attribution.
    """
    @staticmethod
    def compute_coupled_risk(p_s: float, p_d: float) -> float:
        """Multiplicative coupling: Risk = P(S) * P(D)"""
        return float(p_s * p_d)

    @staticmethod
    def classify_alert_tier(p_s: float, p_d: float, coupled_risk: float) -> Tuple[AlertTierEnum, str, str, str]:
        """
        4-Tier Operational Alert Architecture:
        - Level 1 Green  : Risk < 0.0502 OR P(S) < 0.15
        - Level 2 Yellow : 0.0502 <= Risk < 0.1500
        - Level 3 Orange : 0.1500 <= Risk < 0.3500
        - Level 4 Red    : Risk >= 0.3500
        """
        if coupled_risk < FROZEN_COUPLING_THRESHOLD or p_s < STATIC_TERRAIN_SAFETY_FLOOR:
            return (
                AlertTierEnum.GREEN,
                "Low / Normal Baseline Monitoring",
                "#22c55e",
                "Routine baseline monitoring. Safe terrain condition."
            )
        elif coupled_risk < THRESHOLD_YELLOW_ORANGE:
            return (
                AlertTierEnum.YELLOW,
                "Advisory / Early Warning Watch",
                "#eab308",
                "Advisory notice. Maintenance standby and slope drainage watch."
            )
        elif coupled_risk < THRESHOLD_ORANGE_RED:
            return (
                AlertTierEnum.ORANGE,
                "Warning / Heightened Hazard Alert",
                "#f97316",
                "Heightened warning. Travel caution and heavy transport limits."
            )
        else:
            return (
                AlertTierEnum.RED,
                "Critical / Immediate Action Trigger",
                "#ef4444",
                "Critical landslide hazard. Immediate emergency protocols and slope closures."
            )

    @staticmethod
    def generate_explainability(
        p_s: float,
        p_d: float,
        coupled_risk: float,
        slope_deg: Optional[float] = None
    ) -> ExplainabilityBreakdown:
        """
        Produces human-interpretable geotechnical and meteorological attribution.
        """
        # Terrain Susceptibility Interpretation
        if p_s < 0.15:
            terr_lvl = "Low (< 0.15)"
            terr_exp = f"Gentle to moderate terrain relief (P(S)={p_s:.3f}). Inherently stable geological substrate."
        elif p_s < 0.30:
            terr_lvl = "Moderate (0.15–0.30)"
            terr_exp = f"Undulating terrain with moderate slope (P(S)={p_s:.3f}). Susceptible under prolonged saturation."
        elif p_s < 0.50:
            terr_lvl = "High (0.30–0.50)"
            terr_exp = f"Steep escarpment / hillcut corridor (P(S)={p_s:.3f}). Elevated static susceptibility."
        else:
            terr_lvl = "Very High (>= 0.50)"
            terr_exp = f"Critically steep slopes & fractured lithology (P(S)={p_s:.3f}). High predisposition to mass wasting."

        # Rainfall Trigger Interpretation
        if p_d < 0.20:
            rain_lvl = "Dormant (< 0.20)"
            rain_exp = f"Dry or minimal precipitation (P(D)={p_d:.3f}). Antecedent moisture well below destabilization threshold."
        elif p_d < 0.50:
            rain_lvl = "Elevated (0.20–0.50)"
            rain_exp = f"Steady seasonal rainfall (P(D)={p_d:.3f}). Moderate pore-water pressure accumulation."
        else:
            rain_lvl = "Critical (>= 0.50)"
            rain_exp = f"Heavy monsoon surge / intense rainfall (P(D)={p_d:.3f}). Exceeds dynamic geotechnical failure trigger."

        # Coupling Synergy Explanation
        if p_s < 0.15:
            if p_d >= 0.50:
                syn_exp = "Rainfall trigger is high, but static terrain susceptibility is low, suppressing the combined risk."
            else:
                syn_exp = "Both terrain susceptibility and rainfall trigger are low, maintaining baseline stability."
        else:
            if p_d >= 0.50:
                syn_exp = "High terrain susceptibility coincides with elevated rainfall trigger, increasing the combined risk."
            elif p_d >= 0.20:
                syn_exp = "Elevated terrain susceptibility combined with seasonal rain creates an advisory condition."
            else:
                syn_exp = "Terrain is susceptible, but dormant rainfall suppresses immediate dynamic triggering."

        # Actionable Guidance
        if coupled_risk >= 0.35 and p_s >= 0.15:
            guidance = "Critical landslide hazard. Immediate emergency protocols and slope closures."
        elif coupled_risk >= 0.15 and p_s >= 0.15:
            guidance = "Heightened warning. Travel caution and heavy transport limits."
        elif coupled_risk >= 0.0502 and p_s >= 0.15:
            guidance = "Advisory notice. Maintenance standby and slope drainage watch."
        else:
            guidance = "Routine baseline monitoring. Safe terrain condition."

        return ExplainabilityBreakdown(
            terrain_susceptibility_level=terr_lvl,
            terrain_explanation=terr_exp,
            rainfall_trigger_level=rain_lvl,
            rainfall_explanation=rain_exp,
            coupling_synergy_explanation=syn_exp,
            actionable_guidance=guidance
        )


risk_engine = RiskEngine()
