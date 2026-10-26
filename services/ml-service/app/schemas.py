from typing import List, Tuple, Optional, Dict, Any
from pydantic import BaseModel, Field

class DistressMetrics(BaseModel):
    depth_max_mm: float = Field(..., description="Maximum cavity/crack depression depth in millimeters")
    depth_mean_mm: float = Field(..., description="Mean effective depression depth in millimeters")
    depth_severity: str = Field(..., description="ASTM D6433 Severity Level (Low, Medium, High)")
    photometric_depression_ratio: float = Field(..., description="Cavity reflectance reduction ratio (0.0 to 1.0)")
    survey_mode: Optional[str] = Field(default="Corridor Dashcam", description="Auto-detected survey perspective")
    ground_distance_m: float = Field(..., description="Ground distance from camera sensor in meters")
    metric_width_cm: float = Field(..., description="Real-world transverse width in centimeters")
    metric_length_cm: float = Field(..., description="Real-world longitudinal length in centimeters")
    surface_area_cm2: float = Field(..., description="Distress surface footprint area in square centimeters")
    surface_area_m2: float = Field(..., description="Distress surface footprint area in square meters")
    cavity_volume_liters: float = Field(..., description="Cavity volume displacement in Liters")
    cavity_volume_m3: float = Field(..., description="Cavity volume displacement in cubic meters")
    asphalt_patch_mass_kg: float = Field(..., description="Compacted dense-graded asphalt patch mass in kilograms")
    tack_coat_liters: float = Field(..., description="Bitumen emulsion tack coat volume required in Liters")
    milling_perimeter_cm: float = Field(..., description="Square saw-cut perimeter for patching in centimeters")
    structural_hazard_index: float = Field(..., description="Composite pavement hazard severity score (0 to 100)")
    crack_length_m: Optional[float] = Field(default=None, description="Continuous crack fissure length in meters")
    crack_width_mm: Optional[float] = Field(default=None, description="Average crack fracture aperture in millimeters")
    crack_sealant_mass_kg: Optional[float] = Field(default=0.0, description="ASTM D6690 rubberized sealant mass in kg")
    crack_sealant_volume_liters: Optional[float] = Field(default=0.0, description="Rubberized sealant volume in Liters")
    crack_routing_spec: Optional[str] = Field(default=None, description="Saw-cut routing reservoir specification")
    hca_lance_length_m: Optional[float] = Field(default=0.0, description="Hot compressed air lance preparation length in meters")
    treatment_recommendation: Optional[str] = Field(default=None, description="IRC:82 / ASTM recommended engineering action")
    remaining_service_life_months: Optional[float] = Field(default=12.0, description="Estimated remaining service life in months without repair")
    cost_delayed_multiplier: Optional[float] = Field(default=3.5, description="Cost escalation factor if repair is delayed")
    depth_profile_points: List[float] = Field(default_factory=list, description="Topographic cross-sectional elevation slice points in mm")

class DetectionBox(BaseModel):
    class_id: int = Field(..., description="Numeric class index from model")
    class_code: str = Field(..., description="RDD damage class code (D00, D10, D20, D40)")
    class_name: str = Field(..., description="Human-readable damage category")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Inference confidence score")
    box_xyxy: Tuple[float, float, float, float] = Field(..., description="Absolute pixel bounding box [xmin, ymin, xmax, ymax]")
    box_normalized: Tuple[float, float, float, float] = Field(..., description="Normalized bounding box [xCenter, yCenter, width, height]")
    consensus: Optional[bool] = Field(default=False, description="True if verified by multi-model ensemble agreement")
    metrics: Optional[DistressMetrics] = Field(default=None, description="Civil engineering depth, volumetric, and material metrics")

class InferenceResponse(BaseModel):
    model_version: str
    inference_time_ms: float
    detections_count: int
    precision_mode: Optional[str] = Field(default="balanced", description="Active precision preset (high, balanced, sensitive)")
    detections: List[DetectionBox]

class HealthResponse(BaseModel):
    status: str
    service: str
    model_loaded: bool
    weights_path: str
    device: str

class ModelInfoResponse(BaseModel):
    model_name: str
    version: str
    classes_supported: dict
    weights_available: bool
