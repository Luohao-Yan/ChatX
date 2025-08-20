"""
应用启动配置模块
属于应用层，负责应用的启动和关闭逻辑
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.core.config import settings
from app.infrastructure.clients.redis_client import redis_client
from app.infrastructure.clients.weaviate_client import init_collections
from app.infrastructure.clients.neo4j_client import neo4j_client
from app.core.logging_config import get_logger
from app.shared.monitoring.metrics import setup_system_metrics
from app.core.banner import print_startup_banner, print_shutdown_banner
from app.infrastructure.persistence.database import get_db_session
from app.domain.initialization.rbac_init import initialize_rbac_system
from app.domain.initialization.tenant_init import initialize_default_tenants
from app.domain.initialization.admin_init import (
    initialize_super_admin,
    check_super_admin_exists,
)
from app.application.services.email_service import get_email_service

logger = get_logger(__name__)


async def initialize_system():
    """系统初始化 - 自动检查并初始化RBAC和超级管理员"""

    try:
        db_session = next(get_db_session())

        # 检查系统是否已初始化
        admin_exists = check_super_admin_exists(db_session)

        if not admin_exists:
            logger.info("🔧 检测到系统未初始化，开始自动初始化...")

            # 1. 初始化默认租户
            logger.info("🏢 初始化默认租户...")
            tenant_success = initialize_default_tenants(db_session)
            if tenant_success:
                logger.info("✅ 默认租户初始化成功")
            else:
                logger.error("❌ 默认租户初始化失败")
                return  # 租户初始化失败则不继续

            # 2. 初始化RBAC系统
            logger.info("🛡️ 初始化RBAC权限系统...")
            rbac_success = initialize_rbac_system(db_session)

            if rbac_success:
                logger.info("✅ RBAC系统初始化成功")

                # 3. 初始化超级管理员
                logger.info("👑 初始化超级管理员...")
                admin_success = initialize_super_admin(db_session)

                if admin_success:
                    logger.info("✅ 超级管理员初始化成功")
                    logger.info(f"📧 超级管理员邮箱: {settings.SUPER_ADMIN_EMAIL}")
                    logger.info(f"👤 超级管理员用户名: {settings.SUPER_ADMIN_USERNAME}")
                    logger.info("⚠️  请尽快修改默认密码！")
                else:
                    logger.error("❌ 超级管理员初始化失败")
            else:
                logger.error("❌ RBAC系统初始化失败")
        else:
            logger.info("✅ 系统已初始化，跳过自动初始化")

        # 测试邮件服务
        email_service = await get_email_service()
        if email_service.enabled:
            connection_ok = email_service.test_connection()
            if connection_ok:
                logger.info(f"📧 邮件服务已启用并连接成功: {settings.SMTP_SERVER}")
            else:
                logger.warning(f"⚠️  邮件服务已启用但连接失败: {settings.SMTP_SERVER}")
        else:
            logger.info("📧 邮件服务未启用（开发模式，验证码将显示在控制台）")

    except Exception as e:
        logger.error(f"❌ 系统初始化过程中发生错误: {e}")
        # 不抛出异常，允许应用继续启动
    finally:
        db_session.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 打印启动横幅
    print_startup_banner()

    # 启动时初始化
    logger.info("🚀 ChatX 启动中...")

    # 设置系统指标收集
    setup_system_metrics()

    # 自动系统初始化
    await initialize_system()

    # 连接外部服务
    services_status = []
    
    # Redis
    try:
        await redis_client.connect()
        services_status.append("Redis ✅")
    except Exception as e:
        services_status.append("Redis ❌")
        logger.error(f"Redis连接失败: {e}")

    # Weaviate
    try:
        init_collections()
        services_status.append("Weaviate ✅")
    except Exception as e:
        services_status.append("Weaviate ❌")
        logger.error(f"Weaviate失败: {e}")

    # Neo4j
    try:
        stats = neo4j_client.get_database_stats()
        services_status.append("Neo4j ✅")
    except Exception as e:
        services_status.append("Neo4j ❌")
        logger.error(f"Neo4j失败: {e}")

    logger.info(f"🎉 ChatX 启动完成 | 服务状态: {' | '.join(services_status)}")
    logger.info("📚 API文档: http://localhost:8000/docs")

    yield

    # 打印关闭横幅
    print_shutdown_banner()

    # 关闭时清理
    logger.info("👋 ChatX 关闭中...")
    
    try:
        await redis_client.disconnect()
    except Exception as e:
        logger.error(f"Redis断开失败: {e}")

    try:
        neo4j_client.close()
    except Exception as e:
        logger.error(f"Neo4j断开失败: {e}")

    logger.info("✅ ChatX 已安全关闭")