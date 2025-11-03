from pydantic_settings import BaseSettings
from pydantic import ConfigDict
from typing import List, Optional
from decouple import config

class Settings(BaseSettings):
    # JWT设置
    SECRET_KEY: str = config("SECRET_KEY", default="your-secret-key-change-in-production")
    ALGORITHM: str = config("ALGORITHM", default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = config("ACCESS_TOKEN_EXPIRE_MINUTES", default=30, cast=int)
    REFRESH_TOKEN_EXPIRE_DAYS: int = config("REFRESH_TOKEN_EXPIRE_DAYS", default=7, cast=int)
    # 记住我功能的token过期时间
    REMEMBER_ME_TOKEN_EXPIRE_DAYS: int = config("REMEMBER_ME_TOKEN_EXPIRE_DAYS", default=30, cast=int)
    
    # 数据库设置
    DATABASE_URL: str = config("DATABASE_URL", default="postgresql://chatx_user:chatx_password@localhost:5433/chatx_db")
    
    # Redis设置
    REDIS_URL: str = config("REDIS_URL", default="redis://localhost:6380/0")
    
    # MinIO设置
    MINIO_ENDPOINT: str = config("MINIO_ENDPOINT", default="localhost:9000")
    MINIO_ACCESS_KEY: str = config("MINIO_ACCESS_KEY", default="chatx_minio")
    MINIO_SECRET_KEY: str = config("MINIO_SECRET_KEY", default="chatx_minio_password")
    MINIO_SECURE: bool = config("MINIO_SECURE", default=False, cast=bool)
    MINIO_BUCKET: str = config("MINIO_BUCKET", default="chatx-files")
    
    # Weaviate设置
    WEAVIATE_URL: str = config("WEAVIATE_URL", default="http://localhost:8080")
    WEAVIATE_GRPC_PORT: int = config("WEAVIATE_GRPC_PORT", default=50051, cast=int)
    
    # Neo4j设置
    NEO4J_URL: str = config("NEO4J_URL", default="bolt://localhost:7687")
    NEO4J_USER: str = config("NEO4J_USER", default="neo4j")
    NEO4J_PASSWORD: str = config("NEO4J_PASSWORD", default="chatx_neo4j_password")
    
    # CORS设置
    CORS_ORIGINS: str = config("CORS_ORIGINS", default="http://localhost:5173,http://localhost:3000")
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [s.strip() for s in self.CORS_ORIGINS.split(',')]
    
    # 文件上传设置
    MAX_FILE_SIZE: int = config("MAX_FILE_SIZE", default=10 * 1024 * 1024, cast=int)  # 10MB
    ALLOWED_FILE_TYPES: str = config(
        "ALLOWED_FILE_TYPES",
        default="image/jpeg,image/png,image/gif,application/pdf,text/plain,application/json"
    )
    
    @property
    def allowed_file_types_list(self) -> List[str]:
        return [s.strip() for s in self.ALLOWED_FILE_TYPES.split(',')]
    
    # 环境设置
    ENVIRONMENT: str = config("ENVIRONMENT", default="development")
    DEBUG: bool = config("DEBUG", default=True, cast=bool)
    
    # 日志设置
    LOG_LEVEL: str = config("LOG_LEVEL", default="INFO")
    LOG_FILE: Optional[str] = config("LOG_FILE", default=None)
    
    # 监控设置
    METRICS_ENABLED: bool = config("METRICS_ENABLED", default=True, cast=bool)
    TRACING_ENABLED: bool = config("TRACING_ENABLED", default=False, cast=bool)
    
    # APM设置
    APM_SERVICE_NAME: str = config("APM_SERVICE_NAME", default="chatx-api")
    APM_ENVIRONMENT: str = config("APM_ENVIRONMENT", default="development")
    
    # 邮件设置
    SMTP_ENABLED: bool = config("SMTP_ENABLED", default=False, cast=bool)
    SMTP_SERVER: str = config("SMTP_SERVER", default="smtp.gmail.com")
    SMTP_PORT: int = config("SMTP_PORT", default=587, cast=int)
    SMTP_USERNAME: str = config("SMTP_USERNAME", default="")
    SMTP_PASSWORD: str = config("SMTP_PASSWORD", default="")
    SMTP_USE_TLS: bool = config("SMTP_USE_TLS", default=True, cast=bool)
    SMTP_USE_SSL: bool = config("SMTP_USE_SSL", default=False, cast=bool)
    SMTP_FROM_EMAIL: str = config("SMTP_FROM_EMAIL", default="")
    SMTP_FROM_NAME: str = config("SMTP_FROM_NAME", default="ChatX System")
    
    # 超级管理员设置
    SUPER_ADMIN_EMAIL: str = config("SUPER_ADMIN_EMAIL", default="admin@chatx.com")
    SUPER_ADMIN_USERNAME: str = config("SUPER_ADMIN_USERNAME", default="superadmin")
    SUPER_ADMIN_PASSWORD: str = config("SUPER_ADMIN_PASSWORD", default="ChatX@Admin123!")
    SUPER_ADMIN_FULL_NAME: str = config("SUPER_ADMIN_FULL_NAME", default="Super Administrator")
    
    # 安全设置
    SECURITY_HEADERS_ENABLED: bool = config("SECURITY_HEADERS_ENABLED", default=True, cast=bool)
    RATE_LIMIT_ENABLED: bool = config("RATE_LIMIT_ENABLED", default=True, cast=bool)
    
    model_config = ConfigDict(
        env_file=".env",
        extra="ignore"  # 忽略未定义的环境变量
    )

settings = Settings()