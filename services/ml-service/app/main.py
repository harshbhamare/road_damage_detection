from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.config import (
    MODEL_VERSION,
    CLASS_MAPPINGS,
    DEFAULT_CONF_THRESHOLD,
    DEFAULT_IOU_THRESHOLD
)
from app.schemas import HealthResponse, ModelInfoResponse, InferenceResponse
from app.services.detector import detector

app = FastAPI(
    title="Road Damage Detection ML Service",
    description="Inference microservice for detecting road potholes and cracks using YOLOv8 / ONNX",
    version=MODEL_VERSION
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        status="OK",
        service="Road Damage ML Microservice",
        model_loaded=detector.is_ready,
        weights_path=str(detector.weights_path) if detector.weights_path else "None",
        device=detector.device
    )

@app.get("/model-info", response_model=ModelInfoResponse)
def model_info():
    return ModelInfoResponse(
        model_name="YOLOv8-Road-Damage-Detector",
        version=MODEL_VERSION,
        classes_supported=CLASS_MAPPINGS,
        weights_available=detector.is_ready
    )

from typing import Optional

@app.post("/predict", response_model=InferenceResponse)
async def predict_damage(
    file: UploadFile = File(...),
    conf_threshold: float = Form(DEFAULT_CONF_THRESHOLD),
    iou_threshold: float = Form(DEFAULT_IOU_THRESHOLD),
    imgsz: Optional[int] = Form(None)
):
    content_type = file.content_type or ""
    ext = (file.filename or "").lower().split(".")[-1]
    if not content_type.startswith("image/") and ext not in ["jpg", "jpeg", "png", "webp"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type {file.content_type}. Only image uploads are supported."
        )

    if not detector.is_ready:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model weights are not loaded. Train the model using ml/notebooks/02_colab_training_pipeline.ipynb and place the exported weights into services/ml-service/weights/."
        )

    image_bytes = await file.read()
    try:
        result = detector.predict(
            image_bytes=image_bytes,
            conf_threshold=conf_threshold,
            iou_threshold=iou_threshold,
            imgsz=imgsz
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference execution failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
