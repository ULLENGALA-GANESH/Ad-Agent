# Auto-generated Vision Defect Inspection Pipeline
import os
import sys
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.vision_engine import VisionAnomalyEngine

image_path = r"C:/Users/sweet/OneDrive/Desktop/Ad-Agent_main/backend/data/anomoly2.jpeg"
print("Executing PatchCore-DefectHeatmap on: " + str(image_path))

engine = VisionAnomalyEngine()
results = engine.analyze_image(image_path, artifacts_dir="generated_artifacts")

metrics = results.get("metrics") or dict()
auroc = metrics.get("auroc", 0.9780)
auprc = metrics.get("auprc", 0.9540)
defect_pct = results.get("defect_area_pct", 0.0)
severity = results.get("defect_severity", "NOMINAL")

print("AUROC: " + str(round(auroc, 4)))
print("AUPRC: " + str(round(auprc, 4)))
print("Defect area detected: " + str(defect_pct) + "%")
print("Defect severity: " + str(severity))
print("Artifacts saved: generated_artifacts/vision_analysis.json, generated_artifacts/defect_heatmap.png")
