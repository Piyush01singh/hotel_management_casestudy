from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.services.observatory_service import observatory_service

router = APIRouter()

@router.get("")
@router.get("/summary")
def get_datasets_summary(db: Session = Depends(get_db)):
    return observatory_service.get_summary(db)

@router.get("/validate")
def validate_dataset(db: Session = Depends(get_db)):
    summary = observatory_service.get_summary(db)
    return {
        "status": "VALID",
        "audits": summary["quality_audits"],
        "records_evaluated": summary["records"]
    }
