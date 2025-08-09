from pydantic import BaseSettings
from typing import List
from decouple import config

class Settings(BaseSettings):
    SECRET_KEY: str = config("SECRET_KEY", default="your-secret-key-change-in-production")
    ALGORITHM: str = config("ALGORITHM", default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = config("ACCESS_TOKEN_EXPIRE_MINUTES", default=30, cast=int)
    
    DATABASE_URL: str = config("DATABASE_URL", default="sqlite:///./chatx.db")
    
    CORS_ORIGINS: List[str] = config(
        "CORS_ORIGINS", 
        default="http://localhost:5173,http://localhost:3000",
        cast=lambda v: [s.strip() for s in v.split(',')]
    )
    
    class Config:
        env_file = ".env"

settings = Settings()