from pydantic_settings import BaseSettings
from typing import List
from decouple import config

class Settings(BaseSettings):
    # JWT设置
    SECRET_KEY: str = config("SECRET_KEY", default="your-secret-key-change-in-production")
    ALGORITHM: str = config("ALGORITHM", default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = config("ACCESS_TOKEN_EXPIRE_MINUTES", default=30, cast=int)
    REFRESH_TOKEN_EXPIRE_DAYS: int = config("REFRESH_TOKEN_EXPIRE_DAYS", default=7, cast=int)
    
    # 数据库设置
    DATABASE_URL: str = config("DATABASE_URL", default="postgresql://chatx_user:chatx_password@localhost:5432/chatx_db")
    
    # Redis设置
    REDIS_URL: str = config("REDIS_URL", default="redis://localhost:6379/0")
    
    # MinIO设置
    MINIO_ENDPOINT: str = config("MINIO_ENDPOINT", default="localhost:9000")
    MINIO_ACCESS_KEY: str = config("MINIO_ACCESS_KEY", default="chatx_minio")
    MINIO_SECRET_KEY: str = config("MINIO_SECRET_KEY", default="chatx_minio_password")
    MINIO_SECURE: bool = config("MINIO_SECURE", default=False, cast=bool)
    MINIO_BUCKET: str = config("MINIO_BUCKET", default="chatx-files")
    
    # Weaviate设置
    WEAVIATE_URL: str = config("WEAVIATE_URL", default="http://localhost:8080")
    
    # Neo4j设置
    NEO4J_URL: str = config("NEO4J_URL", default="bolt://localhost:7687")
    NEO4J_USER: str = config("NEO4J_USER", default="neo4j")
    NEO4J_PASSWORD: str = config("NEO4J_PASSWORD", default="chatx_neo4j_password")
    
    # CORS设置
    CORS_ORIGINS: List[str] = config(
        "CORS_ORIGINS", 
        default="http://localhost:5173,http://localhost:3000",
        cast=lambda v: [s.strip() for s in v.split(',')]
    )
    
    # 文件上传设置
    MAX_FILE_SIZE: int = config("MAX_FILE_SIZE", default=10 * 1024 * 1024, cast=int)  # 10MB
    ALLOWED_FILE_TYPES: List[str] = config(
        "ALLOWED_FILE_TYPES",
        default="image/jpeg,image/png,image/gif,application/pdf,text/plain,application/json",
        cast=lambda v: [s.strip() for s in v.split(',')]
    )
    
    class Config:
        env_file = ".env"

settings = Settings()