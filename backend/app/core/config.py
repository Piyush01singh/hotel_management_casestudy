import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "StayWise AI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    DEBUG: bool = True
    
    BASE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
    DATABASE_URL: str = f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '../../staywise.db')).replace(os.sep, '/')}"
    ML_ARTIFACTS_DIR: str = os.path.join(BASE_DIR, "ml", "artifacts")
    ML_DATA_DIR: str = os.path.join(BASE_DIR, "ml", "data")

settings = Settings()
