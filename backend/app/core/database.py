from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """依赖注入用的数据库会话生成器"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_db_session():
    """获取数据库会话的生成器（用于初始化脚本）"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()