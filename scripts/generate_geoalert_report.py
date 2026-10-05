#!/usr/bin/env python3
"""
GEOALERT: Comprehensive Architectural, Scientific, and Engineering Lifecycle Report
==================================================================================
Generates a fully formatted Microsoft Word (.docx) document containing:
- All 14 sections of the GEOALERT platform documentation
- Formatted tables with styling
- Flowchart/architecture diagrams (rendered via matplotlib)
- Mathematical formulas
- Color-coded tier legends
- Complete verification matrix

Author: GEOALERT Team
"""

import os
import sys
import io
import textwrap
from pathlib import Path

# Fix Windows console encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# --- Imports ---
from docx import Document
from docx.shared import Inches, Pt, Cm, RGBColor, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.enum.section import WD_ORIENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.patheffects as pe
import numpy as np

# ============================================================
# CONFIGURATION
# ============================================================
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "docs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE = OUTPUT_DIR / "GEOALERT_Complete_Report.docx"
TEMP_IMG_DIR = OUTPUT_DIR / "_temp_report_images"
TEMP_IMG_DIR.mkdir(parents=True, exist_ok=True)

# Color palette
COLORS = {
    'primary': RGBColor(0x0F, 0x17, 0x2A),       # Dark navy
    'secondary': RGBColor(0x64, 0x74, 0x8B),      # Muted slate
    'accent_blue': RGBColor(0x38, 0x6D, 0xB0),    # Brand blue
    'green': RGBColor(0x16, 0xA3, 0x4A),
    'yellow': RGBColor(0xCA, 0x8A, 0x04),
    'orange': RGBColor(0xEA, 0x58, 0x0C),
    'red': RGBColor(0xDC, 0x26, 0x26),
    'white': RGBColor(0xFF, 0xFF, 0xFF),
    'light_gray': RGBColor(0xF1, 0xF5, 0xF9),
    'table_header': RGBColor(0x1E, 0x29, 0x3B),
    'table_alt': RGBColor(0xF8, 0xFA, 0xFC),
}

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def set_cell_shading(cell, color_hex: str):
    """Apply background shading to a table cell."""
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{color_hex}" w:val="clear"/>')
    cell._tc.get_or_add_tcPr().append(shading)


def set_cell_border(cell, **kwargs):
    """Set cell borders. Kwargs: top, bottom, left, right, each a dict with sz, val, color."""
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = parse_xml(f'<w:tcBorders {nsdecls("w")}></w:tcBorders>')
    for edge, attrs in kwargs.items():
        element = parse_xml(
            f'<w:{edge} {nsdecls("w")} w:val="{attrs.get("val", "single")}" '
            f'w:sz="{attrs.get("sz", 4)}" w:space="0" '
            f'w:color="{attrs.get("color", "000000")}"/>'
        )
        tcBorders.append(element)
    tcPr.append(tcBorders)


def add_styled_table(doc, headers, rows, col_widths=None, bold_first_col=False, 
                     highlight_col=None, first_col_bold_color=None):
    """Add a professional styled table with header shading and alternating rows."""
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.style = 'Table Grid'

    # Header row
    hdr_row = table.rows[0]
    for i, header in enumerate(headers):
        cell = hdr_row.cells[i]
        cell.text = ''
        p = cell.paragraphs[0]
        run = p.add_run(header)
        run.bold = True
        run.font.size = Pt(9)
        run.font.color.rgb = COLORS['white']
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        set_cell_shading(cell, '1E293B')

    # Data rows
    for row_idx, row_data in enumerate(rows):
        data_row = table.rows[row_idx + 1]
        for col_idx, value in enumerate(row_data):
            cell = data_row.cells[col_idx]
            cell.text = ''
            p = cell.paragraphs[0]
            run = p.add_run(str(value))
            run.font.size = Pt(8.5)
            run.font.color.rgb = COLORS['primary']
            
            if bold_first_col and col_idx == 0:
                run.bold = True
                if first_col_bold_color:
                    run.font.color.rgb = first_col_bold_color
            
            if highlight_col is not None and col_idx == highlight_col:
                run.bold = True
                run.font.color.rgb = COLORS['accent_blue']
            
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER if col_idx > 0 else WD_ALIGN_PARAGRAPH.LEFT
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            
            # Alternating row shading
            if row_idx % 2 == 1:
                set_cell_shading(cell, 'F8FAFC')

    # Set column widths if provided
    if col_widths:
        for row in table.rows:
            for i, width in enumerate(col_widths):
                row.cells[i].width = Inches(width)

    return table


def add_heading_styled(doc, text, level=1):
    """Add a heading with custom styling."""
    heading = doc.add_heading(text, level=level)
    for run in heading.runs:
        run.font.color.rgb = COLORS['primary']
    return heading


def add_body_text(doc, text, bold=False, italic=False, color=None, size=Pt(10.5)):
    """Add a paragraph of body text."""
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.size = size
    run.font.color.rgb = color or COLORS['primary']
    p.paragraph_format.space_after = Pt(6)
    p.paragraph_format.line_spacing = Pt(15)
    return p


def add_formula_block(doc, formula_text, label=None):
    """Add a centered formula block with optional label."""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(formula_text)
    run.bold = True
    run.font.size = Pt(12)
    run.font.color.rgb = COLORS['accent_blue']
    run.font.name = 'Cambria Math'
    if label:
        label_run = p.add_run(f'    ({label})')
        label_run.font.size = Pt(9)
        label_run.font.color.rgb = COLORS['secondary']
        label_run.italic = True
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(12)
    return p


def add_bullet_list(doc, items, bold_prefix=False):
    """Add a bulleted list. Items can be plain strings or (bold_part, rest) tuples."""
    for item in items:
        p = doc.add_paragraph(style='List Bullet')
        if isinstance(item, tuple):
            bold_run = p.add_run(item[0])
            bold_run.bold = True
            bold_run.font.size = Pt(10)
            bold_run.font.color.rgb = COLORS['primary']
            rest_run = p.add_run(item[1])
            rest_run.font.size = Pt(10)
            rest_run.font.color.rgb = COLORS['primary']
        else:
            run = p.add_run(item)
            run.font.size = Pt(10)
            run.font.color.rgb = COLORS['primary']
        p.paragraph_format.space_after = Pt(3)


def add_numbered_list(doc, items):
    """Add a numbered list."""
    for i, item in enumerate(items, 1):
        p = doc.add_paragraph(style='List Number')
        if isinstance(item, tuple):
            bold_run = p.add_run(item[0])
            bold_run.bold = True
            bold_run.font.size = Pt(10)
            rest_run = p.add_run(item[1])
            rest_run.font.size = Pt(10)
        else:
            run = p.add_run(item)
            run.font.size = Pt(10)
        p.paragraph_format.space_after = Pt(3)


def add_callout_box(doc, text, box_type='NOTE'):
    """Add a styled callout box (NOTE, WARNING, IMPORTANT)."""
    colors_map = {
        'NOTE': ('ℹ️', 'E0F2FE', '0369A1'),
        'WARNING': ('⚠️', 'FEF3C7', '92400E'),
        'IMPORTANT': ('❗', 'FEE2E2', '991B1B'),
        'SUCCESS': ('✅', 'DCFCE7', '166534'),
    }
    icon, bg, fg = colors_map.get(box_type, colors_map['NOTE'])
    
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.rows[0].cells[0]
    set_cell_shading(cell, bg)
    p = cell.paragraphs[0]
    run = p.add_run(f'{icon}  {box_type}: ')
    run.bold = True
    run.font.size = Pt(9.5)
    run.font.color.rgb = RGBColor(int(fg[:2], 16), int(fg[2:4], 16), int(fg[4:], 16))
    run2 = p.add_run(text)
    run2.font.size = Pt(9.5)
    run2.font.color.rgb = RGBColor(int(fg[:2], 16), int(fg[2:4], 16), int(fg[4:], 16))
    doc.add_paragraph()  # spacer


def add_code_block(doc, code_text, language=''):
    """Add a code block with monospace font and gray background."""
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.rows[0].cells[0]
    set_cell_shading(cell, 'F1F5F9')
    p = cell.paragraphs[0]
    if language:
        lang_run = p.add_run(f'  [{language}]\n')
        lang_run.bold = True
        lang_run.font.size = Pt(8)
        lang_run.font.color.rgb = COLORS['secondary']
        lang_run.font.name = 'Consolas'
    run = p.add_run(code_text)
    run.font.size = Pt(8)
    run.font.name = 'Consolas'
    run.font.color.rgb = COLORS['primary']
    doc.add_paragraph()  # spacer


# ============================================================
# DIAGRAM GENERATORS (matplotlib)
# ============================================================

def generate_system_architecture_diagram():
    """Generate the complete system architecture flowchart."""
    fig, ax = plt.subplots(1, 1, figsize=(16, 22))
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 22)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')
    
    # Title
    ax.text(8, 21.3, 'GEOALERT — Complete System Architecture', fontsize=18, 
            fontweight='bold', ha='center', va='center', color='#0F172A',
            fontfamily='sans-serif')
    ax.text(8, 20.9, 'Decoupled Dual-Model Landslide Risk Intelligence Platform', fontsize=11,
            ha='center', va='center', color='#64748B', style='italic')
    
    # ---- TOP ROW: RAW INPUTS ----
    # Static Data Box
    static_box = FancyBboxPatch((0.5, 18.5), 6.5, 2.0, boxstyle="round,pad=0.15",
                                 facecolor='#DBEAFE', edgecolor='#2563EB', linewidth=2)
    ax.add_patch(static_box)
    ax.text(3.75, 19.9, 'STATIC TERRAIN & SOIL DATA', fontsize=10, fontweight='bold',
            ha='center', va='center', color='#1E3A5F')
    static_items = [
        '• SRTM 30m DEM',
        '• SoilGrids 250m Properties',
        '• ESA WorldCover 10m',
        '• GSI 1:50k Lithology',
        '• HydroSHEDS & OSM Infra'
    ]
    for i, item in enumerate(static_items):
        ax.text(1.0, 19.35 - i*0.28, item, fontsize=7.5, ha='left', va='center', color='#1E3A5F')
    
    # Dynamic Data Box
    dynamic_box = FancyBboxPatch((9.0, 18.5), 6.5, 2.0, boxstyle="round,pad=0.15",
                                  facecolor='#FEF3C7', edgecolor='#D97706', linewidth=2)
    ax.add_patch(dynamic_box)
    ax.text(12.25, 19.9, 'DYNAMIC SATELLITE PRECIPITATION', fontsize=10, fontweight='bold',
            ha='center', va='center', color='#78350F')
    dynamic_items = [
        '• CHIRPS 0.05° Daily Precipitation',
        '• Historical Daily GeoTIFF (2007–2026)',
        '• Real-Time Rainfall Telemetry',
    ]
    for i, item in enumerate(dynamic_items):
        ax.text(9.5, 19.35 - i*0.28, item, fontsize=7.5, ha='left', va='center', color='#78350F')
    
    # Arrows down
    ax.annotate('', xy=(3.75, 17.0), xytext=(3.75, 18.5),
                arrowprops=dict(arrowstyle='->', color='#2563EB', lw=2.5))
    ax.annotate('', xy=(12.25, 17.0), xytext=(12.25, 18.5),
                arrowprops=dict(arrowstyle='->', color='#D97706', lw=2.5))
    
    # ---- FEATURE EXTRACTION ----
    feat_static = FancyBboxPatch((0.5, 15.5), 6.5, 1.5, boxstyle="round,pad=0.15",
                                  facecolor='#E0E7FF', edgecolor='#4338CA', linewidth=1.5)
    ax.add_patch(feat_static)
    ax.text(3.75, 16.55, 'GEOMATICS FEATURE EXTRACTION', fontsize=9, fontweight='bold',
            ha='center', va='center', color='#312E81')
    ax.text(3.75, 16.1, '16 Static Features', fontsize=9, ha='center', va='center', color='#4338CA')
    ax.text(3.75, 15.75, 'Elevation, Slope, Aspect, Curvatures,\nTWI, SPI, NDVI, Soil, Roads, Streams, etc.',
            fontsize=7, ha='center', va='center', color='#64748B')
    
    feat_dynamic = FancyBboxPatch((9.0, 15.5), 6.5, 1.5, boxstyle="round,pad=0.15",
                                   facecolor='#FFF7ED', edgecolor='#EA580C', linewidth=1.5)
    ax.add_patch(feat_dynamic)
    ax.text(12.25, 16.55, 'METEOROLOGICAL FEATURE PIPELINE', fontsize=9, fontweight='bold',
            ha='center', va='center', color='#7C2D12')
    ax.text(12.25, 16.1, '10 Dynamic Features', fontsize=9, ha='center', va='center', color='#EA580C')
    ax.text(12.25, 15.75, 'P₀, ARI-3/7/15/30, Max 1d/3d,\nRainy Days 7d/15d/30d',
            fontsize=7, ha='center', va='center', color='#64748B')
    
    # Arrows down
    ax.annotate('', xy=(3.75, 14.0), xytext=(3.75, 15.5),
                arrowprops=dict(arrowstyle='->', color='#4338CA', lw=2.5))
    ax.annotate('', xy=(12.25, 14.0), xytext=(12.25, 15.5),
                arrowprops=dict(arrowstyle='->', color='#EA580C', lw=2.5))
    
    # ---- ML MODELS ----
    model_a = FancyBboxPatch((0.5, 12.5), 6.5, 1.5, boxstyle="round,pad=0.15",
                              facecolor='#DCFCE7', edgecolor='#16A34A', linewidth=2)
    ax.add_patch(model_a)
    ax.text(3.75, 13.55, 'MODEL A — Static Susceptibility', fontsize=10, fontweight='bold',
            ha='center', va='center', color='#14532D')
    ax.text(3.75, 13.1, 'Random Forest (300 trees, depth=12)', fontsize=8, ha='center', 
            va='center', color='#166534')
    ax.text(3.75, 12.75, 'ROC-AUC: 0.9882 | PR-AUC: 0.9884', fontsize=8, ha='center',
            va='center', color='#166534', fontweight='bold')
    
    model_b = FancyBboxPatch((9.0, 12.5), 6.5, 1.5, boxstyle="round,pad=0.15",
                              facecolor='#FEE2E2', edgecolor='#DC2626', linewidth=2)
    ax.add_patch(model_b)
    ax.text(12.25, 13.55, 'MODEL B — Dynamic Rain Trigger', fontsize=10, fontweight='bold',
            ha='center', va='center', color='#7F1D1D')
    ax.text(12.25, 13.1, 'HistGradientBoosting (Calibrated)', fontsize=8, ha='center',
            va='center', color='#991B1B')
    ax.text(12.25, 12.75, 'ROC-AUC: 0.8447 | Recall: 81.08%', fontsize=8, ha='center',
            va='center', color='#991B1B', fontweight='bold')
    
    # Output labels
    ax.text(3.75, 12.1, 'P(S) ∈ [0.0, 1.0]', fontsize=10, fontweight='bold',
            ha='center', va='center', color='#16A34A',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='white', edgecolor='#16A34A'))
    ax.text(12.25, 12.1, 'P(D) ∈ [0.0, 1.0]', fontsize=10, fontweight='bold',
            ha='center', va='center', color='#DC2626',
            bbox=dict(boxstyle='round,pad=0.3', facecolor='white', edgecolor='#DC2626'))
    
    # Converging arrows
    ax.annotate('', xy=(8.0, 10.6), xytext=(3.75, 11.8),
                arrowprops=dict(arrowstyle='->', color='#16A34A', lw=2.5))
    ax.annotate('', xy=(8.0, 10.6), xytext=(12.25, 11.8),
                arrowprops=dict(arrowstyle='->', color='#DC2626', lw=2.5))
    
    # ---- COUPLING ENGINE ----
    coupling = FancyBboxPatch((3.5, 9.2), 9.0, 1.5, boxstyle="round,pad=0.2",
                               facecolor='#FDF4FF', edgecolor='#9333EA', linewidth=2.5)
    ax.add_patch(coupling)
    ax.text(8.0, 10.25, 'DUAL-MODEL COUPLING ENGINE', fontsize=11, fontweight='bold',
            ha='center', va='center', color='#581C87')
    ax.text(8.0, 9.85, 'Risk(x,y,t) = P(S) × P(D)', fontsize=11, fontweight='bold',
            ha='center', va='center', color='#7C3AED', fontfamily='monospace')
    ax.text(8.0, 9.5, 'Safety Floor: P(S) ≥ 0.1500  |  Frozen Cutoff: T = 0.0502',
            fontsize=8, ha='center', va='center', color='#6B21A8')
    
    # Arrow down
    ax.annotate('', xy=(8.0, 7.8), xytext=(8.0, 9.2),
                arrowprops=dict(arrowstyle='->', color='#9333EA', lw=2.5))
    
    # ---- 4-TIER ALERT CLASSIFIER ----
    tier_box = FancyBboxPatch((3.0, 6.0), 10.0, 1.8, boxstyle="round,pad=0.2",
                               facecolor='#F8FAFC', edgecolor='#334155', linewidth=2)
    ax.add_patch(tier_box)
    ax.text(8.0, 7.45, '4-TIER ALERT CLASSIFIER', fontsize=11, fontweight='bold',
            ha='center', va='center', color='#0F172A')
    
    tier_colors = [('#16A34A', 'Level 1: Green  — < 0.0502 or P(S) < 0.15'),
                   ('#CA8A04', 'Level 2: Yellow — 0.0502 ≤ Risk < 0.1500'),
                   ('#EA580C', 'Level 3: Orange — 0.1500 ≤ Risk < 0.3500'),
                   ('#DC2626', 'Level 4: Red      — Risk ≥ 0.3500')]
    for i, (color, label) in enumerate(tier_colors):
        y_pos = 7.1 - i * 0.25
        ax.plot(4.2, y_pos, 'o', color=color, markersize=8)
        ax.text(4.6, y_pos, label, fontsize=7.5, ha='left', va='center', color='#334155')
    
    # Arrow down
    ax.annotate('', xy=(8.0, 4.6), xytext=(8.0, 6.0),
                arrowprops=dict(arrowstyle='->', color='#334155', lw=2.5))
    
    # ---- FASTAPI BACKEND ----
    api_box = FancyBboxPatch((2.5, 3.0), 11.0, 1.6, boxstyle="round,pad=0.2",
                              facecolor='#ECFDF5', edgecolor='#059669', linewidth=2)
    ax.add_patch(api_box)
    ax.text(8.0, 4.2, 'FASTAPI BACKEND REST SERVICE (Port 8000)', fontsize=10, fontweight='bold',
            ha='center', va='center', color='#064E3B')
    endpoints = ['/api/v1/risk/grid', '/api/v1/risk/evaluate-point', '/api/v1/rainfall/scenario',
                 '/api/v1/health', '/api/v1/metadata']
    ax.text(8.0, 3.7, '  |  '.join(endpoints), fontsize=6.5, ha='center', va='center',
            color='#047857', fontfamily='monospace')
    ax.text(8.0, 3.3, '3,156 WGS84 Cells • Real-Time Point Inference • Cryptographic Integrity',
            fontsize=7.5, ha='center', va='center', color='#064E3B')
    
    # Arrow down
    ax.annotate('', xy=(8.0, 1.6), xytext=(8.0, 3.0),
                arrowprops=dict(arrowstyle='->', color='#059669', lw=2.5))
    
    # ---- FRONTEND ----
    frontend_box = FancyBboxPatch((2.0, 0.2), 12.0, 1.4, boxstyle="round,pad=0.2",
                                   facecolor='#EFF6FF', edgecolor='#2563EB', linewidth=2)
    ax.add_patch(frontend_box)
    ax.text(8.0, 1.2, 'GEOALERT LIGHT GLASSMORPHIC WEB GIS (Port 3000)', fontsize=10,
            fontweight='bold', ha='center', va='center', color='#1E3A8A')
    ax.text(8.0, 0.75, 'Next.js 15 • React 19 • Leaflet Canvas • 3-Way Layer Switcher • Dynamic KPIs',
            fontsize=8, ha='center', va='center', color='#3B82F6')
    ax.text(8.0, 0.4, 'Geotechnical Explainability: "Why is this location at risk?"',
            fontsize=7.5, ha='center', va='center', color='#1E40AF', style='italic')
    
    plt.tight_layout(pad=0.5)
    path = TEMP_IMG_DIR / 'system_architecture.png'
    fig.savefig(path, dpi=200, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    return str(path)


def generate_coupling_diagram():
    """Generate the dual-model coupling mechanism diagram."""
    fig, ax = plt.subplots(1, 1, figsize=(14, 8))
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 8)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')
    
    ax.text(7, 7.5, 'Dual-Model Multiplicative Coupling Mechanism', fontsize=16,
            fontweight='bold', ha='center', va='center', color='#0F172A')
    
    # Model A
    model_a = FancyBboxPatch((0.5, 4.5), 4, 2.2, boxstyle="round,pad=0.2",
                              facecolor='#DCFCE7', edgecolor='#16A34A', linewidth=2)
    ax.add_patch(model_a)
    ax.text(2.5, 6.2, 'MODEL A', fontsize=12, fontweight='bold', ha='center', color='#14532D')
    ax.text(2.5, 5.7, 'Static Susceptibility', fontsize=10, ha='center', color='#166534')
    ax.text(2.5, 5.2, 'P(S) ∈ [0.0, 1.0]', fontsize=11, fontweight='bold', ha='center', 
            color='#16A34A', fontfamily='monospace')
    ax.text(2.5, 4.8, '16 Geomorphic Features', fontsize=8, ha='center', color='#64748B')
    
    # Model B
    model_b = FancyBboxPatch((9.5, 4.5), 4, 2.2, boxstyle="round,pad=0.2",
                              facecolor='#FEE2E2', edgecolor='#DC2626', linewidth=2)
    ax.add_patch(model_b)
    ax.text(11.5, 6.2, 'MODEL B', fontsize=12, fontweight='bold', ha='center', color='#7F1D1D')
    ax.text(11.5, 5.7, 'Dynamic Rain Trigger', fontsize=10, ha='center', color='#991B1B')
    ax.text(11.5, 5.2, 'P(D) ∈ [0.0, 1.0]', fontsize=11, fontweight='bold', ha='center',
            color='#DC2626', fontfamily='monospace')
    ax.text(11.5, 4.8, '10 CHIRPS Predictors', fontsize=8, ha='center', color='#64748B')
    
    # Multiplication
    ax.text(7, 5.5, '×', fontsize=40, fontweight='bold', ha='center', va='center', color='#7C3AED')
    
    # Arrow down from multiplication
    ax.annotate('', xy=(7, 3.5), xytext=(7, 4.3),
                arrowprops=dict(arrowstyle='->', color='#7C3AED', lw=3))
    
    # Result
    result = FancyBboxPatch((3.5, 1.5), 7, 2.0, boxstyle="round,pad=0.2",
                             facecolor='#FDF4FF', edgecolor='#9333EA', linewidth=2.5)
    ax.add_patch(result)
    ax.text(7, 3.1, 'Risk(x,y,t) = P(S)ₓᵧ × P(D)ₓᵧₜ', fontsize=13, fontweight='bold',
            ha='center', va='center', color='#581C87', fontfamily='monospace')
    ax.text(7, 2.5, 'Frozen Threshold: T_coup = 0.0502', fontsize=10, ha='center',
            va='center', color='#7C3AED')
    ax.text(7, 2.0, 'Geomorphic Safety Floor: P(S) ≥ 0.1500', fontsize=10, ha='center',
            va='center', color='#7C3AED')
    
    # 2D Risk Matrix annotation
    ax.text(7, 0.8, '71.0% False Alarm Reduction on Untouched Holdout', fontsize=11,
            fontweight='bold', ha='center', va='center', color='#DC2626',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#FEF2F2', edgecolor='#FCA5A5'))
    
    plt.tight_layout(pad=0.5)
    path = TEMP_IMG_DIR / 'coupling_mechanism.png'
    fig.savefig(path, dpi=200, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    return str(path)


def generate_2d_risk_matrix():
    """Generate the 2D Risk Matrix heatmap."""
    fig, ax = plt.subplots(1, 1, figsize=(8, 6))
    
    # Data
    matrix = np.array([
        [0.0, 18.2],
        [0.0, 88.9]
    ])
    
    # Custom colors
    colors = ['#16A34A', '#CA8A04', '#CA8A04', '#DC2626']
    from matplotlib.colors import LinearSegmentedColormap
    cmap = LinearSegmentedColormap.from_list('risk', ['#DCFCE7', '#FEF3C7', '#FED7AA', '#FEE2E2'], N=256)
    
    im = ax.imshow(matrix, cmap=cmap, vmin=0, vmax=100, aspect='auto')
    
    labels = [['0.0%\nFAILURE RATE\n(Safe Baseline)', '18.2%\nFAILURE RATE\n(Steep + Dry)'],
              ['0.0%\nFAILURE RATE\n(Heavy Rain + Stable)', '88.9%\nFAILURE RATE\n(EXTREME DANGER)']]
    
    text_colors = ['#16A34A', '#CA8A04', '#16A34A', '#DC2626']
    
    for i in range(2):
        for j in range(2):
            ax.text(j, i, labels[i][j], ha='center', va='center', fontsize=10,
                    fontweight='bold', color=text_colors[i*2 + j])
    
    ax.set_xticks([0, 1])
    ax.set_xticklabels(['Low P(S) < 0.25', 'High P(S) ≥ 0.50'], fontsize=11, fontweight='bold')
    ax.set_yticks([0, 1])
    ax.set_yticklabels(['Low P(D) < 0.20', 'High P(D) ≥ 0.50'], fontsize=11, fontweight='bold')
    ax.set_xlabel('Static Terrain Susceptibility P(S)', fontsize=12, fontweight='bold', color='#0F172A')
    ax.set_ylabel('Dynamic Rainfall Trigger P(D)', fontsize=12, fontweight='bold', color='#0F172A')
    ax.set_title('2D Empirical Risk Matrix — Holdout Validation', fontsize=14, fontweight='bold', color='#0F172A')
    
    plt.colorbar(im, ax=ax, label='Failure Rate (%)', shrink=0.8)
    plt.tight_layout()
    path = TEMP_IMG_DIR / 'risk_matrix_2d.png'
    fig.savefig(path, dpi=200, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    return str(path)


def generate_4tier_alert_diagram():
    """Generate the 4-tier alert classification visual."""
    fig, ax = plt.subplots(1, 1, figsize=(12, 4))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 4)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')
    
    ax.text(6, 3.7, '4-Tier Alert Classification System', fontsize=14, fontweight='bold',
            ha='center', va='center', color='#0F172A')
    
    tiers = [
        ('Level 1\nGreen', '#16A34A', '< 0.0502\nor P(S) < 0.15', 'Safe / Routine\nMonitoring', 0.5),
        ('Level 2\nYellow', '#CA8A04', '0.0502 ≤ Risk\n< 0.1500', 'Elevated\nAwareness', 3.5),
        ('Level 3\nOrange', '#EA580C', '0.1500 ≤ Risk\n< 0.3500', 'Warning\nPreparation', 6.5),
        ('Level 4\nRed', '#DC2626', 'Risk ≥ 0.3500', 'Critical\nEvacuation', 9.5),
    ]
    
    for label, color, threshold, action, x in tiers:
        box = FancyBboxPatch((x, 0.3), 2.2, 3.0, boxstyle="round,pad=0.15",
                              facecolor=color + '20', edgecolor=color, linewidth=2.5)
        ax.add_patch(box)
        ax.plot(x + 1.1, 2.8, 'o', color=color, markersize=18)
        ax.text(x + 1.1, 2.2, label, fontsize=9, fontweight='bold', ha='center', color=color)
        ax.text(x + 1.1, 1.4, threshold, fontsize=7.5, ha='center', va='center', color='#334155',
                fontfamily='monospace')
        ax.text(x + 1.1, 0.7, action, fontsize=7.5, ha='center', va='center', color='#64748B',
                fontweight='bold')
    
    # Arrows between tiers
    for i in range(3):
        x_start = tiers[i][4] + 2.3
        x_end = tiers[i+1][4] - 0.1
        ax.annotate('', xy=(x_end, 1.8), xytext=(x_start, 1.8),
                    arrowprops=dict(arrowstyle='->', color='#94A3B8', lw=1.5))
    
    plt.tight_layout(pad=0.5)
    path = TEMP_IMG_DIR / 'tier_classification.png'
    fig.savefig(path, dpi=200, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    return str(path)


def generate_spatial_block_map():
    """Generate a schematic map of the 5 spatial blocks."""
    fig, ax = plt.subplots(1, 1, figsize=(10, 7))
    ax.set_xlim(89.5, 93.2)
    ax.set_ylim(24.8, 26.3)
    ax.set_facecolor('#F0F9FF')
    
    blocks = [
        ('Block 1\nWest Garo Hills\n(N=1,037, Train)', 90.2, 25.5, 1.2, 0.6, '#DBEAFE', '#2563EB'),
        ('Block 2\nWest Khasi Hills\n(N=516, Train)', 91.2, 25.7, 0.7, 0.4, '#E0E7FF', '#4338CA'),
        ('Block 3\nEast Khasi / Shillong\n(N=419, HOLDOUT TEST)', 91.7, 25.5, 0.6, 0.5, '#FEE2E2', '#DC2626'),
        ('Block 4\nRi-Bhoi\n(N=715, Train)', 91.6, 26.0, 0.8, 0.2, '#DCFCE7', '#16A34A'),
        ('Block 5\nJaintia Hills\n(N=469, Validation)', 92.3, 25.4, 0.6, 0.5, '#FEF3C7', '#D97706'),
    ]
    
    for label, x, y, w, h, fc, ec in blocks:
        rect = plt.Rectangle((x, y), w, h, facecolor=fc, edgecolor=ec, linewidth=2.5, alpha=0.8)
        ax.add_patch(rect)
        ax.text(x + w/2, y + h/2, label, fontsize=7, ha='center', va='center',
                fontweight='bold', color=ec)
    
    ax.set_xlabel('Longitude (°E)', fontsize=11, fontweight='bold')
    ax.set_ylabel('Latitude (°N)', fontsize=11, fontweight='bold')
    ax.set_title('Spatially Disjoint Block Stratification — Meghalaya', fontsize=13, fontweight='bold', color='#0F172A')
    ax.grid(True, alpha=0.3)
    
    plt.tight_layout()
    path = TEMP_IMG_DIR / 'spatial_blocks.png'
    fig.savefig(path, dpi=200, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    return str(path)


def generate_deployment_architecture():
    """Generate cloud deployment architecture diagram."""
    fig, ax = plt.subplots(1, 1, figsize=(14, 8))
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 8)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')
    
    ax.text(7, 7.5, 'Cloud Deployment Architecture', fontsize=16,
            fontweight='bold', ha='center', va='center', color='#0F172A')
    
    # Docker Compose (local)
    docker = FancyBboxPatch((0.5, 4.5), 3.5, 2.5, boxstyle="round,pad=0.2",
                             facecolor='#DBEAFE', edgecolor='#2563EB', linewidth=2)
    ax.add_patch(docker)
    ax.text(2.25, 6.5, '🐳 Docker Compose', fontsize=10, fontweight='bold', ha='center', color='#1E3A5F')
    ax.text(2.25, 6.0, 'Local Development', fontsize=9, ha='center', color='#3B82F6')
    ax.text(2.25, 5.5, 'docker compose up --build', fontsize=7, ha='center', color='#64748B', fontfamily='monospace')
    ax.text(2.25, 5.0, 'Backend :8000\nFrontend :3000', fontsize=8, ha='center', color='#334155')
    
    # Vercel
    vercel = FancyBboxPatch((5.25, 4.5), 3.5, 2.5, boxstyle="round,pad=0.2",
                             facecolor='#F8FAFC', edgecolor='#0F172A', linewidth=2)
    ax.add_patch(vercel)
    ax.text(7.0, 6.5, '▲ Vercel', fontsize=10, fontweight='bold', ha='center', color='#0F172A')
    ax.text(7.0, 6.0, 'Frontend CDN', fontsize=9, ha='center', color='#64748B')
    ax.text(7.0, 5.5, 'Next.js 15 Standalone', fontsize=8, ha='center', color='#334155')
    ax.text(7.0, 5.0, 'vercel.json\nEdge Functions', fontsize=7, ha='center', color='#64748B', fontfamily='monospace')
    
    # Render
    render = FancyBboxPatch((10.0, 4.5), 3.5, 2.5, boxstyle="round,pad=0.2",
                             facecolor='#ECFDF5', edgecolor='#059669', linewidth=2)
    ax.add_patch(render)
    ax.text(11.75, 6.5, '🚀 Render / Railway', fontsize=10, fontweight='bold', ha='center', color='#064E3B')
    ax.text(11.75, 6.0, 'Backend API', fontsize=9, ha='center', color='#047857')
    ax.text(11.75, 5.5, 'Python 3.12 + uvicorn', fontsize=8, ha='center', color='#334155')
    ax.text(11.75, 5.0, 'render.yaml\nrailway.json', fontsize=7, ha='center', color='#64748B', fontfamily='monospace')
    
    # CORS
    cors_box = FancyBboxPatch((3.5, 2.0), 7.0, 1.5, boxstyle="round,pad=0.2",
                               facecolor='#FDF4FF', edgecolor='#9333EA', linewidth=1.5)
    ax.add_patch(cors_box)
    ax.text(7.0, 3.1, 'Universal Cloud CORS Middleware', fontsize=10, fontweight='bold',
            ha='center', va='center', color='#581C87')
    ax.text(7.0, 2.5, 'allow_origin_regex = r"https?://.*"', fontsize=8, ha='center',
            va='center', color='#7C3AED', fontfamily='monospace')
    
    # GitHub
    github = FancyBboxPatch((4.5, 0.2), 5.0, 1.2, boxstyle="round,pad=0.2",
                              facecolor='#F8FAFC', edgecolor='#334155', linewidth=2)
    ax.add_patch(github)
    ax.text(7.0, 1.0, '🐙 GitHub Repository', fontsize=10, fontweight='bold',
            ha='center', va='center', color='#0F172A')
    ax.text(7.0, 0.55, 'github.com/aruchith08/GEOALERT-SIH-2026', fontsize=8,
            ha='center', va='center', color='#3B82F6', fontfamily='monospace')
    
    # Arrows
    for x_pos in [2.25, 7.0, 11.75]:
        ax.annotate('', xy=(7.0, 3.5), xytext=(x_pos, 4.5),
                    arrowprops=dict(arrowstyle='->', color='#94A3B8', lw=1.5))
    ax.annotate('', xy=(7.0, 1.4), xytext=(7.0, 2.0),
                arrowprops=dict(arrowstyle='->', color='#94A3B8', lw=1.5))
    
    plt.tight_layout(pad=0.5)
    path = TEMP_IMG_DIR / 'deployment_architecture.png'
    fig.savefig(path, dpi=200, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    return str(path)


def generate_data_flow_pipeline():
    """Generate data engineering pipeline flowchart."""
    fig, ax = plt.subplots(1, 1, figsize=(14, 6))
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 6)
    ax.axis('off')
    fig.patch.set_facecolor('#FFFFFF')
    
    ax.text(7, 5.6, 'Data Engineering & Feature Pipeline', fontsize=15,
            fontweight='bold', ha='center', va='center', color='#0F172A')
    
    stages = [
        ('GSI Landslide\nInventory\n(1,052 Records)', '#DBEAFE', '#2563EB', 0.3),
        ('Spatial Block\nStratification\n(5 Disjoint Blocks)', '#E0E7FF', '#4338CA', 3.0),
        ('Feature\nExtraction\n(16 + 10 Features)', '#DCFCE7', '#16A34A', 5.7),
        ('Background\nSampling\n(1:3 Ratio)', '#FEF3C7', '#D97706', 8.4),
        ('ML Training\n& Calibration\n(RF + HGB)', '#FEE2E2', '#DC2626', 11.1),
    ]
    
    for label, fc, ec, x in stages:
        box = FancyBboxPatch((x, 1.5), 2.5, 3.5, boxstyle="round,pad=0.2",
                              facecolor=fc, edgecolor=ec, linewidth=2)
        ax.add_patch(box)
        ax.text(x + 1.25, 3.25, label, fontsize=8.5, fontweight='bold', ha='center',
                va='center', color=ec)
    
    # Arrows
    for i in range(len(stages) - 1):
        x_start = stages[i][3] + 2.6
        x_end = stages[i+1][3] - 0.1
        ax.annotate('', xy=(x_end, 3.25), xytext=(x_start, 3.25),
                    arrowprops=dict(arrowstyle='->', color='#64748B', lw=2))
    
    plt.tight_layout(pad=0.5)
    path = TEMP_IMG_DIR / 'data_pipeline.png'
    fig.savefig(path, dpi=200, bbox_inches='tight', facecolor='white')
    plt.close(fig)
    return str(path)


# ============================================================
# MAIN DOCUMENT BUILDER
# ============================================================

def build_document():
    """Build the complete GEOALERT report document."""
    print("=" * 70)
    print("  GEOALERT — Comprehensive Report Generator")
    print("  Generating Microsoft Word Document (.docx)")
    print("=" * 70)
    
    doc = Document()
    
    # ---- Page Setup ----
    section = doc.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.8)
    section.bottom_margin = Inches(0.8)
    section.left_margin = Inches(0.9)
    section.right_margin = Inches(0.9)
    
    # ---- Style Customization ----
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Calibri'
    font.size = Pt(10.5)
    font.color.rgb = COLORS['primary']
    
    for level in range(1, 5):
        h_style = doc.styles[f'Heading {level}']
        h_style.font.color.rgb = COLORS['primary']
        h_style.font.name = 'Calibri'
    
    # ============================================================
    # TITLE PAGE
    # ============================================================
    print("[1/14] Building Title Page...")
    
    for _ in range(4):
        doc.add_paragraph()
    
    # Title
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('GEOALERT')
    run.font.size = Pt(42)
    run.font.color.rgb = COLORS['primary']
    run.bold = True
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Comprehensive Architectural, Scientific,\nand Engineering Lifecycle Report')
    run.font.size = Pt(18)
    run.font.color.rgb = COLORS['accent_blue']
    
    doc.add_paragraph()
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('AI-Powered Early Warning & Landslide Risk Monitoring')
    run.font.size = Pt(14)
    run.font.color.rgb = COLORS['secondary']
    run.bold = True
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Final Landslide Risk Intelligence Platform')
    run.font.size = Pt(13)
    run.font.color.rgb = COLORS['secondary']
    
    for _ in range(3):
        doc.add_paragraph()
    
    # Metadata table on title page
    meta_items = [
        ('Target Geography', 'Meghalaya & Northeast India'),
        ('Operational Classification', 'Research Decision-Support & Spatio-Temporal Early Warning Platform'),
        ('Repository', 'github.com/aruchith08/GEOALERT-SIH-2026'),
        ('Live Stack', 'Next.js 15 (Port 3000) • FastAPI Python 3.12 (Port 8000) • Docker Compose'),
    ]
    
    table = doc.add_table(rows=len(meta_items), cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, (key, val) in enumerate(meta_items):
        cell_k = table.rows[i].cells[0]
        cell_v = table.rows[i].cells[1]
        cell_k.text = ''
        cell_v.text = ''
        pk = cell_k.paragraphs[0]
        pv = cell_v.paragraphs[0]
        rk = pk.add_run(key)
        rk.bold = True
        rk.font.size = Pt(10)
        rk.font.color.rgb = COLORS['accent_blue']
        rv = pv.add_run(val)
        rv.font.size = Pt(10)
        rv.font.color.rgb = COLORS['primary']
        pk.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        cell_k.width = Inches(2.5)
        cell_v.width = Inches(4.5)
    
    doc.add_page_break()
    
    # ============================================================
    # TABLE OF CONTENTS (Manual)
    # ============================================================
    print("[TOC] Building Table of Contents...")
    add_heading_styled(doc, 'Table of Contents', level=1)
    
    toc_items = [
        '1. Executive Summary & Core Scientific Problem',
        '2. Complete System Architecture & Data Flow',
        '3. Data Engineering & Geomatics Foundation',
        '4. Model A: Static Susceptibility Engineering',
        '5. Model B: Dynamic Rainfall Trigger Engineering',
        '6. Phase 4: Controlled Coupling Experiment & Formulation',
        '7. Phase 4: Spatial Risk Engine, 3,156-Cell Grid & Infrastructure',
        '8. Phase 4: Production FastAPI Backend Engine',
        '9. Phase 4: Frontend Web GIS & Packaging',
        '10. The GEOALERT Transformation & Full ML Dynamic Grounding',
        '11. Cloud DevOps, Deployment & GitHub Release',
        '12. Verification & Integrity Audit Matrix',
        '13. Summary of Key Files & Directory Structure',
        '14. Conclusion & Key Architectural Takeaways',
    ]
    
    for item in toc_items:
        p = doc.add_paragraph()
        run = p.add_run(item)
        run.font.size = Pt(11)
        run.font.color.rgb = COLORS['primary']
        p.paragraph_format.space_after = Pt(4)
    
    doc.add_page_break()
    
    # ============================================================
    # SECTION 1: EXECUTIVE SUMMARY
    # ============================================================
    print("[2/14] Section 1: Executive Summary...")
    
    add_heading_styled(doc, '1. Executive Summary & Core Scientific Problem', level=1)
    
    add_heading_styled(doc, '1.1 The Operational Paradox in Mountainous Terrains', level=2)
    
    add_body_text(doc, 
        'Meghalaya presents one of the most extreme landslide hazards globally. Home to Cherrapunjee '
        '(Sohra) and Mawsynram—the wettest places on Earth—the state receives between 8,000 mm and '
        '12,000 mm of annual precipitation. This intense rainfall interacts with steep, highly fractured '
        'Precambrian gneiss, Cretaceous Shillong Group quartzites, and Tertiary sedimentary strata '
        'across an intensely dissected plateau.')
    
    add_body_text(doc,
        'Conventional early warning systems deployed across India and developing nations rely almost '
        'exclusively on empirical rainfall intensity-duration thresholds (e.g., Caine-type or IMD '
        'district rainfall advisories). These systems suffer from a severe dual failure:')
    
    add_numbered_list(doc, [
        ('Catastrophic False Alarm Ratios (FAR): ', 
         'During an active monsoon surge, 100 mm of rain may fall across an entire district. A rainfall-only '
         'threshold triggers blanket red alerts for the whole region—including flat river floodplains, '
         'gentle valleys, and stable plateau surfaces that physically cannot slide. This triggers alert '
         'fatigue, economic disruption, and public non-compliance.'),
        ('Failure to Resolve Critical Cut Slopes: ',
         'Rainfall alone cannot differentiate between a forested, gentle hillside and a steep, road-cut '
         'cliff with sheared bedrock and poor drainage.'),
    ])
    
    add_heading_styled(doc, '1.2 The Decoupled Dual-Model Solution', level=2)
    
    add_body_text(doc, 
        'GEOALERT resolves this paradigm by strictly decoupling:')
    
    add_bullet_list(doc, [
        ('Model A (Static Environmental/Geomorphic Predisposition): ',
         'Where can a landslide physically happen? Evaluates 16 morphometric, geotechnical, hydrological, '
         'and lithological features to output terrain susceptibility P(S) ∈ [0.0, 1.0].'),
        ('Model B (Dynamic Antecedent Precipitation Trigger): ',
         'Is the current meteorological forcing sufficient to trigger slope failure today? Evaluates 10 '
         'satellite precipitation predictors (CHIRPS) to output trigger probability P(D) ∈ [0.0, 1.0].'),
    ])
    
    add_body_text(doc, 
        'These independent probabilities are unified through a multiplicative coupling formulation:')
    
    add_formula_block(doc, 'Risk(x, y, t) = P(S)ₓᵧ × P(D)ₓᵧₜ', 'Eq. 1')
    
    add_body_text(doc,
        'Governed by a frozen operational threshold T_coup = 0.0502 and a geomorphic safety floor '
        'P(S)_floor = 0.1500, this formulation ensures:')
    
    add_bullet_list(doc, [
        'If terrain susceptibility is negligible (P(S) < 0.1500), risk remains suppressed in Level 1: Green regardless of cloudburst intensity.',
        'If terrain susceptibility is high (P(S) ≥ 0.5000), seasonal monsoon rains push the coupled product into Level 3: Orange or Level 4: Red.',
    ])
    
    add_callout_box(doc, 
        'Result on Untouched Holdout Testing: 71.0% reduction in false alarms compared to dynamic '
        'rainfall models alone, with 0.9526 ROC-AUC and 0.9098 PR-AUC.', 'SUCCESS')
    
    doc.add_page_break()
    
    # ============================================================
    # SECTION 2: SYSTEM ARCHITECTURE
    # ============================================================
    print("[3/14] Section 2: System Architecture...")
    print("  → Generating system architecture diagram...")
    arch_img = generate_system_architecture_diagram()
    
    add_heading_styled(doc, '2. Complete System Architecture & Data Flow', level=1)
    
    add_body_text(doc, 
        'The GEOALERT platform follows a layered architecture separating raw spatial data ingestion, '
        'feature engineering, dual-model inference, coupling, and web presentation layers.')
    
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    run.add_picture(arch_img, width=Inches(6.5))
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Figure 1: GEOALERT Complete System Architecture Flowchart')
    run.italic = True
    run.font.size = Pt(9)
    run.font.color.rgb = COLORS['secondary']
    
    doc.add_page_break()
    
    # ============================================================
    # SECTION 3: DATA ENGINEERING
    # ============================================================
    print("[4/14] Section 3: Data Engineering...")
    print("  → Generating spatial block diagram...")
    blocks_img = generate_spatial_block_map()
    print("  → Generating data pipeline diagram...")
    pipeline_img = generate_data_flow_pipeline()
    
    add_heading_styled(doc, '3. Data Engineering & Geomatics Foundation (Phase 1 & Phase 2)', level=1)
    
    # 3.1
    add_heading_styled(doc, '3.1 Landslide Inventory Acquisition', level=2)
    add_bullet_list(doc, [
        ('Primary Source: ', 'Geological Survey of India (GSI) Bhukosh National Landslide Inventory.'),
        ('Filtering & Spatial Validation: ', 'Filtered strictly to historical slope failures within the bounding box of Meghalaya (Lat: 25.02°N – 26.10°N, Lon: 89.80°E – 92.85°E).'),
        ('Confirmed Failures: ', '1,052 verified landslide records documented between 2007 and 2026.'),
        ('Extraction Code: ', 'Implemented in src/extract_gsi_landslides.py.'),
    ])
    
    # 3.2
    add_heading_styled(doc, '3.2 Spatially Disjoint Block Stratification (Preventing Data Leakage)', level=2)
    add_body_text(doc,
        'A primary flaw in published landslide AI literature is random train/test splitting, which '
        'suffers from severe spatial autocorrelation leakage (training on one side of a hill and testing '
        'on the other side of the same ridge). To guarantee leak-free generalization, the state was '
        'partitioned into 5 geographically separated blocks:')
    
    add_styled_table(doc, 
        ['Spatial Block', 'Regional Geography', 'Grid Cells (N)', 'Role in Training & Holdout'],
        [
            ['Block 1', 'West Garo Hills & South Garo', '1,037', 'Model Training & Background Partition'],
            ['Block 2', 'West Khasi Hills & Nongstoin', '516', 'Model Training & Background Partition'],
            ['Block 3', 'East Khasi Hills (Shillong Plateau)', '419', 'Untouched Primary Holdout Test Set (Zero Leakage)'],
            ['Block 4', 'Ri-Bhoi (Northern Escarpment)', '715', 'Model Training & Background Partition'],
            ['Block 5', 'Jaintia Hills (Cretaceous Escarpment)', '469', 'Geographic Validation Set (Threshold Tuning)'],
            ['Total Statewide', 'State of Meghalaya', '3,156', 'Complete Regional Grid Coverage'],
        ],
        bold_first_col=True
    )
    
    doc.add_paragraph()
    
    # Spatial blocks diagram
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    run.add_picture(blocks_img, width=Inches(5.5))
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Figure 2: Spatially Disjoint Block Stratification Map — Meghalaya')
    run.italic = True
    run.font.size = Pt(9)
    run.font.color.rgb = COLORS['secondary']
    
    doc.add_page_break()
    
    # 3.3
    add_heading_styled(doc, '3.3 Environmental Feature Engineering (16 Static Predictors)', level=2)
    add_body_text(doc, 
        'Engineered via Google Earth Engine (gee/01_srtm_features.js, gee/03_environmental_features.js) '
        'and Python rasterio/geopandas (src/extract_srtm_terrain.py, src/extract_environmental_features.py):')
    
    features_16 = [
        ('Elevation (m): ', 'SRTM 30m Digital Elevation Model. Captures orographic elevation bands (50 m – 1,960 m).'),
        ('Slope Angle (°): ', 'Maximum rate of change in elevation via Horn\'s method. Primary physical driver of shear stress.'),
        ('Aspect (°): ', 'Compass direction of slope face, governing moisture retention and prevailing monsoon wind intercept.'),
        ('Plan Curvature (m⁻¹): ', 'Horizontal slope curvature perpendicular to gradient, indicating flow convergence or divergence.'),
        ('Profile Curvature (m⁻¹): ', 'Vertical slope curvature parallel to gradient, governing flow acceleration and deceleration.'),
        ('Topographic Wetness Index (TWI): ', 'ln(a / tan β) where a is specific catchment area and β is slope angle. Identifies pore-water accumulation zones.'),
        ('Stream Power Index (SPI): ', 'a × tan β. Measures erosive power of overland water flow.'),
        ('Soil Clay Fraction (%): ', 'SoilGrids 250m depth-averaged fraction (0–30 cm). Dictates plastic limit and impermeable shear plane formation.'),
        ('Soil Sand Fraction (%): ', 'SoilGrids 250m depth-averaged fraction. Governs drainage conductivity and cohesionless sliding.'),
        ('Soil Bulk Density (cg/cm³): ', 'Compactness of soil matrix.'),
        ('Soil pH: ', 'Soil chemical acidity, reflecting leaching and weathering intensity.'),
        ('Distance to Road Cuts (m): ', 'Euclidean distance to OpenStreetMap road network. Crucial anthropogenic trigger (toe excavation, road overhangs).'),
        ('Distance to Streams (m): ', 'Euclidean distance to HydroSHEDS drainage channels. Identifies fluvial toe erosion.'),
        ('NDVI Mean: ', 'Sentinel-2 / Landsat annual mean vegetation density. Low values indicate bare scarps and cleared slopes.'),
        ('Land Cover Code (Categorical): ', 'ESA WorldCover 10m (forest, cropland, bare, grassland, built-up).'),
        ('Lithology Major (Categorical): ', 'GSI 1:50,000 lithostratigraphic groups (Precambrian Granite Gneiss, Shillong Quartzite, Tertiary Sandstone/Limestone).'),
    ]
    add_numbered_list(doc, features_16)
    
    # 3.4
    add_heading_styled(doc, '3.4 Controlled Background Observation Strategy (1:3 Design)', level=2)
    add_body_text(doc,
        'To avoid distorting model calibration with unrealistic 1:1 balanced sampling, a controlled '
        '1:3 positive-to-background ratio was enforced:')
    add_bullet_list(doc, [
        ('Positives: ', '1,052 verified slope failure points.'),
        ('Negatives / Background: ', '3,156 pseudo-absence points sampled across non-landslide slopes, '
         'stratified by slope gradient, elevation, and distance to roads (src/create_pseudo_absences.py, '
         'create_pseudo_absences_v2.py).'),
    ])
    
    # Data pipeline diagram
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    run.add_picture(pipeline_img, width=Inches(6.2))
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Figure 3: Data Engineering & Feature Extraction Pipeline')
    run.italic = True
    run.font.size = Pt(9)
    run.font.color.rgb = COLORS['secondary']
    
    doc.add_page_break()
    
    # ============================================================
    # SECTION 4: MODEL A
    # ============================================================
    print("[5/14] Section 4: Model A Engineering...")
    
    add_heading_styled(doc, '4. Model A: Static Susceptibility Engineering (Phase 3)', level=1)
    
    # 4.1
    add_heading_styled(doc, '4.1 Benchmarking & Experimental Design', level=2)
    add_body_text(doc, 'Three experimental regimes were evaluated across Random Forest, XGBoost, and Logistic Regression:')
    add_bullet_list(doc, [
        ('Experiment A (1:1 Ratio): ', '1,052 positives + 1,052 negatives (N=2,104).'),
        ('Experiment B (1:2 Ratio): ', '1,052 positives + 2,104 negatives (N=3,156).'),
        ('Experiment C (1:3 Ratio): ', '1,052 positives + 3,156 negatives (N=4,208).'),
    ])
    
    # 4.2
    add_heading_styled(doc, '4.2 Preprocessing Pipeline', level=2)
    add_body_text(doc, 'Built inside a clean, reproducible Scikit-Learn Pipeline:')
    add_bullet_list(doc, [
        'Categorical columns (landcover_code, lithology_code) encoded via OneHotEncoder(handle_unknown=\'ignore\').',
        'Numerical columns (14 features) standardized via StandardScaler().',
        'Model: RandomForestClassifier(n_estimators=300, max_depth=12, min_samples_split=5, class_weight=\'balanced\', random_state=42).',
    ])
    
    # 4.3
    add_heading_styled(doc, '4.3 Final Model A Results on Untouched Holdout Test Set (Block 3)', level=2)
    add_body_text(doc,
        'Evaluated strictly once on the geographically held-out Shillong Plateau partition '
        '(N=756 samples: 337 Positives, 419 Negatives):')
    
    add_styled_table(doc,
        ['Metric', 'Random Forest (Selected)', 'XGBoost Benchmark', 'Logistic Regression'],
        [
            ['ROC-AUC', '0.9882', '0.9854', '0.8412'],
            ['PR-AUC', '0.9884', '0.9821', '0.7935'],
            ['F1-Score', '0.9433', '0.9388', '0.7810'],
            ['Precision', '94.89%', '94.12%', '76.50%'],
            ['Recall', '93.77%', '93.65%', '79.80%'],
            ['Brier Score', '0.0405', '0.0462', '0.1420'],
            ['Optimal Threshold', '0.2487', '0.2510', '0.5000'],
        ],
        bold_first_col=True, highlight_col=1
    )
    
    doc.add_paragraph()
    add_bullet_list(doc, [
        ('Frozen Production Model A: ', 'models/expC_random_forest.joblib'),
        ('Cryptographic SHA-256: ', '1691cd678c2a9184cf608a9db0e464daee1e9daf237fd2c387b6d936685d5631'),
    ])
    
    doc.add_page_break()
    
    # ============================================================
    # SECTION 5: MODEL B
    # ============================================================
    print("[6/14] Section 5: Model B Engineering...")
    
    add_heading_styled(doc, '5. Model B: Dynamic Rainfall Trigger Engineering (Phase 3c)', level=1)
    
    # 5.1
    add_heading_styled(doc, '5.1 CHIRPS Satellite Telemetry & Predictor Design', level=2)
    add_body_text(doc, 
        'Model B assesses the meteorological triggering probability by extracting 10 antecedent '
        'and instantaneous precipitation metrics from daily CHIRPS 0.05° resolution data:')
    
    predictors_10 = [
        ('rainfall_event_day (P₀ in mm): ', 'Total rainfall on the day of the landslide or observation.'),
        ('ari_3 (mm): ', '3-day Antecedent Rainfall Index with decay factor α=0.84: ARI_k = Σ(i=1 to k) α^i × P_i'),
        ('ari_7 (mm): ', '7-day Antecedent Rainfall Index (short-term soil saturation).'),
        ('ari_15 (mm): ', '15-day Antecedent Rainfall Index (intermediate pore-pressure buildup).'),
        ('ari_30 (mm): ', '30-day Antecedent Rainfall Index (deep groundwater table elevation).'),
        ('max_1day_7d (mm): ', 'Maximum single-day rainfall recorded within the preceding 7 days.'),
        ('max_3day_30d (mm): ', 'Maximum consecutive 3-day rainfall burst recorded within the preceding 30 days.'),
        ('rainy_days_7d (count 0–7): ', 'Number of days with rainfall > 2.5 mm in the last 7 days.'),
        ('rainy_days_15d (count 0–15): ', 'Number of rainy days in the last 15 days.'),
        ('rainy_days_30d (count 0–30): ', 'Number of rainy days in the last 30 days.'),
    ]
    add_numbered_list(doc, predictors_10)
    
    add_formula_block(doc, 'ARI_k = Σ(i=1 to k) α^i × P_i    (α = 0.84)', 'Eq. 2')
    
    # 5.2
    add_heading_styled(doc, '5.2 Leakage Auditing & Controlled Sampling', level=2)
    add_bullet_list(doc, [
        ('Temporal Strictness: ', 'Antecedent windows are strictly calculated prior to and on the event date. No future lookahead is permitted.'),
        ('Controlled Observation Matrix: ', '186 field events across 2007–2026 paired with 558 spatio-temporally matched background observations sampled during active monsoon months across non-failure coordinate-dates.'),
    ])
    
    # 5.3
    add_heading_styled(doc, '5.3 Algorithmic Training & Calibration', level=2)
    add_body_text(doc, 'Model: HistGradientBoostingClassifier(max_iter=100, max_depth=4, min_samples_leaf=15, learning_rate=0.05, l2_regularization=1.0, random_state=42).')
    
    # 5.4
    add_heading_styled(doc, '5.4 Model B Performance & Calibrated Scenarios', level=2)
    add_bullet_list(doc, [
        ('Validation Partition (Block 5 Jaintia Hills): ', 'ROC-AUC: 0.8447, PR-AUC: 0.6225, Recall: 81.08%, Optimal Cutoff: T_opt = 0.2000.'),
        ('Untouched Holdout (Block 3 East Khasi): ', 'ROC-AUC: 0.7653, PR-AUC: 0.6631, Recall: 66.67%.'),
        ('Frozen Production Model B: ', 'models/modelB_production_pipeline.joblib'),
        ('Cryptographic SHA-256: ', 'e30aacc2f83eaca410a9a782089300ef1e920dd21051c042385d6159d97318f2'),
    ])
    
    doc.add_paragraph()
    add_body_text(doc, 'Calibrated Meteorological Presets Output by Model B:', bold=True)
    
    add_styled_table(doc,
        ['Meteorological Scenario', 'P₀ (24h Rain)', 'ARI₃', 'ARI₇', 'ARI₃₀', 'Rainy Days (7d)', 'P(D) Output', 'Trigger State'],
        [
            ['Dry Season (Baseline)', '0.0 mm', '0.0 mm', '0.0 mm', '5.0 mm', '0 days', '0.0189', 'Dormant (< 0.20)'],
            ['Moderate Monsoon', '20.0 mm', '35.0 mm', '70.0 mm', '200.0 mm', '3 days', '0.0240', 'Baseline Saturation'],
            ['Active Monsoon Surge', '45.0 mm', '110.0 mm', '180.0 mm', '520.0 mm', '5 days', '0.6284', 'Critical (≥ 0.50)'],
            ['Extreme Cloudburst', '85.0 mm', '180.0 mm', '290.0 mm', '780.0 mm', '6 days', '0.7477', 'Severe (≥ 0.50)'],
        ],
        bold_first_col=True
    )
    
    doc.add_page_break()
    
    # ============================================================
    # SECTION 6: COUPLING EXPERIMENT
    # ============================================================
    print("[7/14] Section 6: Coupling Experiment...")
    print("  → Generating coupling diagram...")
    coupling_img = generate_coupling_diagram()
    print("  → Generating 2D risk matrix...")
    risk_matrix_img = generate_2d_risk_matrix()
    print("  → Generating tier classification diagram...")
    tier_img = generate_4tier_alert_diagram()
    
    add_heading_styled(doc, '6. Phase 4: Controlled Coupling Experiment & Formulation (Section 32)', level=1)
    
    # 6.1
    add_heading_styled(doc, '6.1 Benchmark of Coupling Formulations (Validation Set Block 5)', level=2)
    add_body_text(doc,
        'Three distinct mathematical coupling mechanisms were benchmarked to fuse P(S) and P(D):')
    
    add_styled_table(doc,
        ['Coupling Method', 'Formula', 'ROC-AUC', 'PR-AUC', 'F1-Score', 'Status'],
        [
            ['Multiplicative', 'Risk = P(S) × P(D)', '0.9830', '0.9583', '0.9091', 'SELECTED ✓'],
            ['Geometric Mean', 'Risk = √(P(S) × P(D))', '0.9830', '0.9583', '0.9091', 'Equivalent'],
            ['Minimum Operator', 'Risk = min(P(S), P(D))', '0.9601', '0.9075', '0.8500', 'Inferior'],
        ],
        bold_first_col=True, highlight_col=5
    )
    
    # Coupling diagram
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    run.add_picture(coupling_img, width=Inches(6.0))
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Figure 4: Dual-Model Multiplicative Coupling Mechanism')
    run.italic = True
    run.font.size = Pt(9)
    run.font.color.rgb = COLORS['secondary']
    
    doc.add_page_break()
    
    # 6.2
    add_heading_styled(doc, '6.2 Retrospective Holdout Proof (Block 3 East Khasi | N=180)', level=2)
    
    add_styled_table(doc,
        ['Evaluation Metric', 'Model B Alone\n(Rainfall Only)', 'Model A Alone\n(Static Only)', 'Coupled A×B', 'Improvement'],
        [
            ['ROC-AUC', '0.7653', '0.9931', '0.9526', '+0.1873 over B'],
            ['PR-AUC', '0.6631', '0.9820', '0.9098', '+0.2467 over B'],
            ['Precision (PPV)', '49.2% (30/61)', '79.6% (43/54)', '80.4% (37/46)', '+31.2% jump'],
            ['Recall (Sensitivity)', '66.7% (30/45)', '95.6% (43/45)', '82.2% (37/45)', 'High preserved'],
            ['Specificity', '77.0% (104/135)', '91.8% (124/135)', '93.3% (126/135)', '+16.3% jump'],
            ['False Positives', '31 False Alarms', '11 False Alarms', '9 False Alarms', '71.0% Eliminated'],
            ['Frozen Threshold', 'T = 0.1800', 'T = 0.2487', 'T_coup = 0.0502', 'Frozen'],
        ],
        bold_first_col=True, highlight_col=3
    )
    
    # 6.3
    add_heading_styled(doc, '6.3 False Alarm Elimination Proof & 2D Risk Matrix', level=2)
    add_body_text(doc,
        'The Mechanism: 23 out of 31 false alarms produced by Model B occurred on gentle slopes or '
        'stable terrain where P(S) < 0.2500. Multiplying by P(S) suppressed the combined risk score '
        'below the trigger threshold T_coup = 0.0502.')
    
    add_body_text(doc, '2D Risk Matrix Empirical Findings:', bold=True)
    add_bullet_list(doc, [
        ('High Static + High Dynamic: ', '88.9% failure rate (Extreme Danger Zone).'),
        ('Low Static + High Dynamic: ', '0.0% failure rate (Heavy monsoon rains over stable valleys & flat plains — zero landslides).'),
        ('High Static + Low Dynamic: ', '18.2% failure rate (Steep slopes during dry/moderate spells).'),
        ('Low Static + Low Dynamic: ', '0.0% failure rate (Safe baseline).'),
    ])
    
    # 2D Risk Matrix diagram
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    run.add_picture(risk_matrix_img, width=Inches(4.5))
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Figure 5: 2D Empirical Risk Matrix — Holdout Validation')
    run.italic = True
    run.font.size = Pt(9)
    run.font.color.rgb = COLORS['secondary']
    
    doc.add_paragraph()
    
    # 4-Tier diagram
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    run.add_picture(tier_img, width=Inches(6.0))
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Figure 6: 4-Tier Alert Classification System')
    run.italic = True
    run.font.size = Pt(9)
    run.font.color.rgb = COLORS['secondary']
    
    doc.add_page_break()
    
    # ============================================================
    # SECTION 7: SPATIAL RISK ENGINE
    # ============================================================
    print("[8/14] Section 7: Spatial Risk Engine...")
    
    add_heading_styled(doc, '7. Phase 4: Spatial Risk Engine, 3,156-Cell Grid & Infrastructure', level=1)
    
    # 7.1
    add_heading_styled(doc, '7.1 Statewide Risk Surface (Section 34)', level=2)
    add_bullet_list(doc, [
        ('Spatial Coverage: ', '3,156 discrete spatial cells in WGS 84 (EPSG:4326) covering all 12 districts and 5 regional blocks of Meghalaya.'),
        ('Deliverable: ', 'data/phase4/section34_spatial_risk/phase4_section34_regional_risk_surface.geojson (1.8 MB).'),
    ])
    
    add_body_text(doc, 'Regional Risk Distribution (Demonstration Active Monsoon Surge Scenario):', bold=True)
    
    add_styled_table(doc,
        ['Regional Block', 'Total Cells', 'Mean P(S)', 'Mean Risk', 'Green', 'Yellow', 'Orange', 'Red', 'Orange+Red %'],
        [
            ['East Khasi Block', '419', '0.1206', '0.0758', '317', '45', '48', '9', '13.6%'],
            ['Jaintia Hills Block', '469', '0.0924', '0.0580', '388', '43', '37', '1', '8.1%'],
            ['Ri-Bhoi Block', '715', '0.0515', '0.0323', '674', '23', '18', '0', '2.5%'],
            ['West Khasi Block', '516', '0.0506', '0.0318', '491', '19', '6', '0', '1.2%'],
            ['Garo Hills Block', '1,037', '0.0282', '0.0177', '1,029', '7', '1', '0', '0.1%'],
            ['Statewide Total', '3,156', '0.0589', '0.0370', '2,899 (91.9%)', '137 (4.3%)', '110 (3.5%)', '10 (0.3%)', '3.8%'],
        ],
        bold_first_col=True
    )
    
    doc.add_paragraph()
    
    # 7.2
    add_heading_styled(doc, '7.2 Critical Transport Corridor Stress Testing (Section 33)', level=2)
    add_body_text(doc, 'Evaluated across 5 arterial highways under multi-scenario precipitation forcing:')
    
    add_styled_table(doc,
        ['Corridor', 'Route', 'Description', 'Length', 'P(S)', 'Dry Season', 'Monsoon Surge', 'Cloudburst'],
        [
            ['CORR_01', 'NH-40', 'Shillong — Guwahati', '103 km', '0.6120', '0.0116 (Green)', '0.3846 (Red)', '0.4576 (Red)'],
            ['CORR_02', 'NH-44/NH-6', 'Jowai — Ratacherra', '142 km', '0.6845', '0.0129 (Green)', '0.4301 (Red)', '0.5118 (Red)'],
            ['CORR_03', 'SH-5', 'Shillong — Cherrapunjee', '54 km', '0.6910', '0.0131 (Green)', '0.4342 (Red)', '0.5167 (Red)'],
            ['CORR_04', 'SH-12', 'Tura — Rongram', '88 km', '0.2454', '0.0046 (Green)', '0.1542 (Orange)', '0.1835 (Orange)'],
            ['CORR_05', 'MDR-22', 'Mairang — Nongstoin', '72 km', '0.4992', '0.0094 (Green)', '0.3137 (Orange)', '0.3733 (Red)'],
        ],
        bold_first_col=True
    )
    
    doc.add_page_break()
    
    # ============================================================
    # SECTION 8: FASTAPI BACKEND
    # ============================================================
    print("[9/14] Section 8: FastAPI Backend...")
    
    add_heading_styled(doc, '8. Phase 4: Production FastAPI Backend Engine (Section 35)', level=1)
    
    add_body_text(doc, 'Built inside backend/app/ adhering to modern REST standards with zero external database dependencies.')
    
    # 8.1
    add_heading_styled(doc, '8.1 API Endpoints Catalog', level=2)
    
    add_styled_table(doc,
        ['Endpoint', 'Method', 'Description'],
        [
            ['/', 'GET', 'Service status and API version'],
            ['/api/v1/health', 'GET', 'Health probe checking Model A & B memory residency'],
            ['/api/v1/metadata', 'GET', 'Cryptographic checksums, feature counts, frozen threshold metadata'],
            ['/api/v1/risk/grid', 'GET', 'Full 3,156-cell GeoJSON with optional block, tier, min-risk filtering'],
            ['/api/v1/risk/grid/summary', 'GET', 'Aggregated block risk tables and high-risk percentages'],
            ['/api/v1/risk/evaluate-point', 'POST', 'Evaluates single coordinate or custom P(S) + dynamic features'],
            ['/api/v1/rainfall/status', 'GET', 'Transparent telemetry status (DEMO_SCENARIO vs live)'],
            ['/api/v1/rainfall/current', 'GET', 'Active meteorological scenario payload'],
            ['/api/v1/rainfall/presets', 'GET', 'Returns 4 calibrated CHIRPS meteorological scenarios'],
            ['/api/v1/rainfall/scenario', 'POST', 'Real-time inference on Model B with 10 dynamic features'],
        ],
        bold_first_col=True
    )
    
    # 8.2
    add_heading_styled(doc, '8.2 Cryptographic Governance Verification', level=2)
    add_body_text(doc,
        'At server startup, the backend verifies the SHA-256 hashes of models/expC_random_forest.joblib '
        'and models/modelB_production_pipeline.joblib. If any byte has been tampered with or retrained, '
        'the server refuses to start.')
    
    add_callout_box(doc, 
        'Model integrity is cryptographically verified at every server startup. Tampered or retrained '
        'models cause immediate startup failure.', 'IMPORTANT')
    
    # 8.3
    add_heading_styled(doc, '8.3 Automated Unit & Regression Tests', level=2)
    add_bullet_list(doc, [
        'Located in backend/tests/test_api.py and backend/tests/test_rainfall_service.py.',
    ])
    add_callout_box(doc, 'Test Results: 17 / 17 unit tests pass (100%) via pytest backend/tests.', 'SUCCESS')
    
    doc.add_page_break()
    
    # ============================================================
    # SECTION 9: FRONTEND WEB GIS
    # ============================================================
    print("[10/14] Section 9: Frontend Web GIS...")
    
    add_heading_styled(doc, '9. Phase 4: Frontend Web GIS & Packaging (Sections 36–38)', level=1)
    
    add_bullet_list(doc, [
        ('Framework: ', 'Next.js 15 App Router, React 19, TypeScript, Tailwind CSS.'),
        ('Cartographic Engine: ', 'Leaflet Canvas rendering 3,156 coordinate markers with interactive clicking, popup inspection, and instant filtering.'),
        ('Packaging: ', 'Multi-stage Docker containerization (docker-compose.yml, backend/Dockerfile, frontend/Dockerfile) enabling one-command local deployment.'),
    ])
    
    add_code_block(doc, 'docker compose up --build', 'bash')
    
    doc.add_page_break()
    
    # ============================================================
    # SECTION 10: GEOALERT TRANSFORMATION
    # ============================================================
    print("[11/14] Section 10: GEOALERT Transformation...")
    
    add_heading_styled(doc, '10. The GEOALERT Transformation & Full ML Dynamic Grounding', level=1)
    
    add_body_text(doc, 
        'During the final production polish, the platform underwent a complete evolution into GEOALERT:')
    
    # 10.1
    add_heading_styled(doc, '10.1 Light Glassmorphic Command Center Design', level=2)
    add_bullet_list(doc, [
        ('Aesthetic: ', 'Shifted from dark UI to a light mode command center.'),
        ('Glassmorphism: ', 'Translucent frosted white cards (bg-white/80 backdrop-blur-md border border-slate-200/90 shadow-sm), dark navy typography (#0f172a), muted slate secondary text (#64748b), and floating pill controls.'),
        ('Custom Brand Vector: ', 'Designed custom SVG topographic contour and alert beacon icon in frontend/public/favicon.svg, frontend/public/favicon.ico, and frontend/components/common/Logo.tsx.'),
        ('Cartographic Basemap: ', 'Replaced generic basemaps with Esri World Light Gray Base, eliminating watermarks and ensuring high contrast for Green, Yellow, Orange, and Red markers.'),
    ])
    
    # 10.2
    add_heading_styled(doc, '10.2 Dynamic Floating GIS Layer Controls', level=2)
    add_body_text(doc, 'Added a 3-way floating pill layer switcher:')
    add_numbered_list(doc, [
        ('Coupled Risk P(S)×P(D): ', 'Default view. Marker color and size reflect final coupled hazard.'),
        ('Terrain P(S): ', 'Isolate Model A static geomorphic susceptibility alone.'),
        ('Rainfall P(D): ', 'Isolate Model B dynamic trigger hazard alone.'),
    ])
    add_body_text(doc, 'Includes a floating glass legend that dynamically changes definitions based on the active layer.')
    
    # 10.3
    add_heading_styled(doc, '10.3 Location Intelligence Inspector with Explainability', level=2)
    add_body_text(doc, 
        'Clicking any cell opens the side inspector panel featuring the "Why is this location at risk?" explainability card:')
    add_bullet_list(doc, [
        ('Terrain Factor: ', 'Attribution to slope angle, elevation, and rock cut proximity.'),
        ('Coupling Synergy: ', 'Explains how terrain and rain interact (e.g., "Rainfall trigger is high, but static terrain susceptibility is low, suppressing the combined risk" vs "High terrain susceptibility coincides with elevated rainfall trigger, multiplying the combined landslide risk").'),
        ('Actionable Protocol: ', 'Emergency slope closure or routine monitoring advisories.'),
    ])
    
    # 10.4
    add_heading_styled(doc, '10.4 Complete ML Dynamic Grounding (Elimination of Mock Values)', level=2)
    add_body_text(doc, 'Every element across the website was grounded directly in the ML models:')
    
    add_numbered_list(doc, [
        ('Dynamic KPI Metrics Cards: ', 
         'Replaced static counts with a live calculation. Dry Season (P(D)=0.0189): 3,156 Green (100%). '
         'Active Monsoon Surge (P(D)=0.6284): 2,899 Green, 137 Yellow, 110 Orange, 10 Red. '
         'Extreme Cloudburst (P(D)=0.7477): Dynamically escalates high-slope cells across Meghalaya.'),
        ('Interactive Infrastructure Lifelines: ', 
         'Added interactive scenario selection on /infrastructure that computes corridor risk dynamically via Model A × Model B.'),
        ('Map Canvas & Popups: ', 
         'Marker radii, colors, and popup metrics dynamically recompute from Model B\'s live P(D) output.'),
    ])
    
    doc.add_page_break()
    
    # ============================================================
    # SECTION 11: CLOUD DEVOPS
    # ============================================================
    print("[12/14] Section 11: Cloud DevOps...")
    print("  → Generating deployment architecture diagram...")
    deploy_img = generate_deployment_architecture()
    
    add_heading_styled(doc, '11. Cloud DevOps, Deployment & GitHub Release', level=1)
    
    # 11.1
    add_heading_styled(doc, '11.1 GitHub Publishing', level=2)
    add_bullet_list(doc, [
        ('Repository: ', 'github.com/aruchith08/GEOALERT-SIH-2026'),
        ('Topics: ', 'machine-learning, fastapi, nextjs, gis, geospatial, disaster-management.'),
        'Complete source code, models, spatial datasets, reports, and scripts tracked on branch main.',
    ])
    
    # 11.2
    add_heading_styled(doc, '11.2 Multi-Cloud Deployment Architecture', level=2)
    add_body_text(doc, 'Configured for zero-config one-click cloud deployment:')
    
    add_heading_styled(doc, 'Frontend on Vercel', level=3)
    add_bullet_list(doc, [
        'Added root vercel.json and frontend/vercel.json.',
        'Environment variable: NEXT_PUBLIC_API_BASE_URL (points to live backend API).',
    ])
    
    add_heading_styled(doc, 'Backend on Render (One-Click Blueprint)', level=3)
    add_bullet_list(doc, [
        'Created render.yaml defining a Python 3.12 web service.',
        'Start command: uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT.',
        'Health check path: /api/v1/health.',
    ])
    
    add_heading_styled(doc, 'Backend on Railway / Heroku', level=3)
    add_bullet_list(doc, [
        'Created railway.json, Procfile, and nixpacks.toml.',
    ])
    
    add_heading_styled(doc, 'Universal Cloud CORS Middleware', level=3)
    add_bullet_list(doc, [
        'Configured allow_origin_regex = r"https?://.*" in backend/app/main.py.',
        'Automatically accepts all Vercel, Render, Railway domains and localhost.',
    ])
    
    add_heading_styled(doc, 'Critical Bug Resolution', level=3)
    add_callout_box(doc, 
        'Discovered and fixed an issue where a generic lib/ pattern in .gitignore omitted frontend/lib/ '
        '(api.ts, constants.ts, types.ts), causing cloud builds to fail with "Module not found: Can\'t resolve '
        '\'@/lib/api\'". Added !frontend/lib/ to .gitignore, tracked all library files, and pushed fix '
        'to GitHub (Commit: fc2ef49).', 'WARNING')
    
    # Deployment architecture diagram
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    run.add_picture(deploy_img, width=Inches(6.0))
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('Figure 7: Multi-Cloud Deployment Architecture')
    run.italic = True
    run.font.size = Pt(9)
    run.font.color.rgb = COLORS['secondary']
    
    doc.add_page_break()
    
    # ============================================================
    # SECTION 12: VERIFICATION MATRIX
    # ============================================================
    print("[13/14] Section 12: Verification & Integrity Audit Matrix...")
    
    add_heading_styled(doc, '12. Verification & Integrity Audit Matrix', level=1)
    
    add_styled_table(doc,
        ['Component / Subsystem', 'Verification Method', 'Status', 'Result / Metric'],
        [
            ['Model A Integrity', 'Cryptographic SHA-256 Hash', 'VERIFIED ✓', '1691cd678c2a...5631'],
            ['Model B Integrity', 'Cryptographic SHA-256 Hash', 'VERIFIED ✓', 'e30aacc2f83e...18f2'],
            ['Section 34 GeoJSON', 'JSON Schema & Cell Count Audit', 'VERIFIED ✓', '3,156 WGS84 Cells (0 NaNs)'],
            ['Coupling Threshold', 'Mathematical Boundary Audit', 'VERIFIED ✓', 'T_coup = 0.0502, P(S)_floor = 0.15'],
            ['Backend API Tests', 'Pytest Regression Suite', 'VERIFIED ✓', '17 / 17 passed (100%)'],
            ['E2E Validation', 'execute_e2e_verification.py', 'VERIFIED ✓', '5 / 5 test suites passed (100%)'],
            ['Frontend Build', 'Next.js 15 Standalone Build', 'VERIFIED ✓', '9 / 9 routes (0 errors)'],
            ['Dashboard Route (/)', 'HTTP Status Probe', 'VERIFIED ✓', 'HTTP 200 OK'],
            ['Risk Map (/risk-map)', 'HTTP Status Probe', 'VERIFIED ✓', 'HTTP 200 OK'],
            ['Analytics (/analytics)', 'HTTP Status Probe', 'VERIFIED ✓', 'HTTP 200 OK'],
            ['Corridors (/infrastructure)', 'HTTP Status Probe', 'VERIFIED ✓', 'HTTP 200 OK'],
            ['Methodology (/methodology)', 'HTTP Status Probe', 'VERIFIED ✓', 'HTTP 200 OK'],
            ['About Page (/about)', 'HTTP Status Probe', 'VERIFIED ✓', 'HTTP 200 OK'],
            ['Favicon (/favicon.svg)', 'HTTP Status Probe', 'VERIFIED ✓', 'HTTP 200 OK'],
            ['Backend Docs (/docs)', 'Swagger UI Probe', 'VERIFIED ✓', 'HTTP 200 OK'],
        ],
        bold_first_col=True
    )
    
    doc.add_page_break()
    
    # ============================================================
    # SECTION 13: DIRECTORY STRUCTURE
    # ============================================================
    print("[14/14] Section 13: Directory Structure & Section 14: Conclusion...")
    
    add_heading_styled(doc, '13. Summary of Key Files & Directory Structure', level=1)
    
    dir_structure = """GEOALERT/
├── backend/
│   ├── app/
│   │   ├── config.py             # Base paths, frozen hashes, CORS regex
│   │   ├── main.py               # FastAPI entry point, lifespan, routers
│   │   ├── model_service.py      # Singleton loader for Model A & Model B
│   │   ├── rainfall_service.py   # Dynamic CHIRPS scenario engine
│   │   ├── risk_engine.py        # Multiplicative coupling formulation
│   │   ├── schemas.py            # Pydantic request & response schemas
│   │   └── routes/               # health, metadata, rainfall, risk, spatial
│   ├── tests/                    # 17 automated Pytest unit tests
│   ├── Dockerfile                # Multi-stage Python 3.12 container
│   └── requirements.txt          # Backend dependencies
├── frontend/
│   ├── app/
│   │   ├── layout.tsx            # GEOALERT branding, typography, metadata
│   │   ├── page.tsx              # Dashboard command center & dynamic KPIs
│   │   ├── risk-map/page.tsx     # Fullscreen GIS map center
│   │   ├── analytics/page.tsx    # Regional block vulnerability ranking
│   │   ├── infrastructure/page.tsx # 5 highway corridor stress tests
│   │   ├── methodology/page.tsx  # Dual-model mathematical architecture
│   │   └── about/page.tsx        # Cryptographic checksums & tech specs
│   ├── components/
│   │   ├── common/               # Navbar, Footer, Logo (SVG Beacon)
│   │   ├── dashboard/            # KPICards, InspectorPanel, RainfallPanel
│   │   └── map/                  # LeafletMap, RiskMapWrapper
│   ├── lib/
│   │   ├── api.ts                # Client API methods with fallback handling
│   │   ├── constants.ts          # Alert tiers, blocks, map center
│   │   └── types.ts              # TypeScript interfaces
│   ├── public/
│   │   ├── favicon.svg           # Vector topographic contour & beacon
│   │   └── data/                 # Regional risk surface GeoJSON fallback
│   ├── Dockerfile                # Next.js standalone container
│   └── vercel.json               # Vercel deployment configuration
├── models/
│   ├── expC_random_forest.joblib # Frozen Model A artifact (16 features)
│   ├── modelB_production_pipeline.joblib # Frozen Model B (10 features)
│   └── metadata files            # Training parameters & feature lists
├── data/
│   ├── phase4/section34_spatial_risk/ # 3,156-cell GeoJSON and CSV
│   └── processed/                # Training, validation, holdout splits
├── docs/
│   └── CLOUD_DEPLOYMENT.md       # Step-by-step Vercel, Render, Railway
├── reports/                      # Historical forensic reports (Sec 14–38)
├── scripts/
│   ├── run_backend.py            # Backend local runner
│   └── e2e_system_test.py        # System verification test
├── docker-compose.yml            # Multi-container local orchestration
├── Procfile                      # Railway / Heroku process definition
├── railway.json                  # Railway deployment configuration
├── render.yaml                   # Render Blueprint for backend API
├── vercel.json                   # Root Vercel build configuration
└── requirements.txt              # Root Python dependencies"""
    
    add_code_block(doc, dir_structure, 'Directory Tree')
    
    doc.add_page_break()
    
    # ============================================================
    # SECTION 14: CONCLUSION
    # ============================================================
    add_heading_styled(doc, '14. Conclusion & Key Architectural Takeaways', level=1)
    
    conclusions = [
        ('1. Scientifically Rigorous: ', 
         'Replaced simplistic, false-alarm-prone rainfall thresholds with an empirically validated '
         'decoupled formulation that eliminated 71.0% of false alarms on untouched field tests.'),
        ('2. Technically Bulletproof: ', 
         'All 3,156 spatial cells and infrastructure stress tests are dynamically evaluated in real-time '
         'by frozen Model A and Model B artifacts. No hardcoded mock values or simulated heuristics remain.'),
        ('3. Production-Ready & Cloud-Deployable: ', 
         'Can be deployed in minutes to Vercel and Render / Railway with zero configuration, universal '
         'CORS support, and Docker Compose readiness.'),
        ('4. Honest & Ethical: ', 
         'Explicitly adheres to responsible AI practices by reporting "DEMO / SCENARIO MODE" when offline, '
         'never claiming unverified live civil warning authorization.'),
    ]
    
    for bold_part, rest in conclusions:
        p = doc.add_paragraph()
        run_b = p.add_run(bold_part)
        run_b.bold = True
        run_b.font.size = Pt(11)
        run_b.font.color.rgb = COLORS['accent_blue']
        run_r = p.add_run(rest)
        run_r.font.size = Pt(10.5)
        run_r.font.color.rgb = COLORS['primary']
        p.paragraph_format.space_after = Pt(8)
    
    doc.add_paragraph()
    
    # Final summary box
    add_callout_box(doc,
        'GEOALERT represents a complete, field-validated, production-ready landslide risk intelligence '
        'platform. Every number, every map marker, every corridor risk score flows directly from frozen '
        'ML models trained on verified GSI field data and CHIRPS satellite precipitation telemetry. '
        'The platform is ready for operational deployment supporting disaster management agencies '
        'across Meghalaya and Northeast India.',
        'SUCCESS')
    
    # ---- Footer on last page ----
    doc.add_paragraph()
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('— End of GEOALERT Comprehensive Report —')
    run.font.size = Pt(11)
    run.font.color.rgb = COLORS['secondary']
    run.italic = True
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('GEOALERT Research & Engineering Team')
    run.font.size = Pt(9)
    run.font.color.rgb = COLORS['secondary']
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run('github.com/aruchith08/GEOALERT-SIH-2026')
    run.font.size = Pt(9)
    run.font.color.rgb = COLORS['accent_blue']
    
    # ============================================================
    # SAVE
    # ============================================================
    doc.save(str(OUTPUT_FILE))
    print()
    print("=" * 70)
    print(f"  ✅ Report generated successfully!")
    print(f"  📄 Output: {OUTPUT_FILE}")
    print(f"  📊 Diagrams saved to: {TEMP_IMG_DIR}")
    print("=" * 70)
    
    # Cleanup temp images
    import shutil
    # Keep the images for reference, but could clean up here if desired
    
    return str(OUTPUT_FILE)


if __name__ == '__main__':
    output_path = build_document()
    print(f"\nDone. Open the file at:\n  {output_path}")
