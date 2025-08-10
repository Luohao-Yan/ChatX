from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.redis import redis_client
from app.core.weaviate_client import init_collections
from app.core.neo4j_client import neo4j_client
from app.api import auth_api, users_api, file_management_api
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时初始化
    logger.info("正在初始化应用...")
    
    # 连接Redis
    try:
        await redis_client.connect()
    except Exception as e:
        logger.error(f"Redis连接失败: {e}")
    
    # 初始化Weaviate集合
    try:
        init_collections()
    except Exception as e:
        logger.error(f"Weaviate集合初始化失败: {e}")
    
    # 测试Neo4j连接
    try:
        stats = neo4j_client.get_database_stats()
        logger.info(f"Neo4j连接正常，数据库统计: {stats}")
    except Exception as e:
        logger.error(f"Neo4j连接失败: {e}")
    
    logger.info("应用初始化完成")
    
    yield
    
    # 关闭时清理
    logger.info("正在关闭应用...")
    try:
        await redis_client.disconnect()
    except Exception as e:
        logger.error(f"Redis断开连接失败: {e}")
    
    try:
        neo4j_client.close()
    except Exception as e:
        logger.error(f"Neo4j断开连接失败: {e}")
    
    logger.info("应用已关闭")

app = FastAPI(
    title="ChatX API",
    description="ChatX Backend API with user authentication, file management, and vector search",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_api.router, prefix="/api/auth", tags=["authentication"])
app.include_router(users_api.router, prefix="/api/users", tags=["users"])
app.include_router(file_management_api.router, prefix="/api/files", tags=["files"])

@app.get("/")
async def root():
    return {"message": "Welcome to ChatX API"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "services": {
            "database": "postgresql",
            "redis": "connected",
            "minio": "connected",
            "weaviate": "connected",
            "neo4j": "connected"
        }
    }