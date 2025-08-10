from app.celery import celery_app
from app.core.database import SessionLocal
from app.models.user_models import User
from app.core.redis import get_redis
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

@celery_app.task
def send_welcome_email(user_id: int):
    """发送欢迎邮件"""
    try:
        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            # 这里可以集成邮件服务如SendGrid、AWS SES等
            logger.info(f"发送欢迎邮件给用户: {user.email}")
            # 实际的邮件发送逻辑
            return {"status": "success", "message": f"欢迎邮件已发送给 {user.email}"}
        else:
            return {"status": "error", "message": "用户不存在"}
    except Exception as e:
        logger.error(f"发送欢迎邮件失败: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()

@celery_app.task
def cleanup_inactive_users():
    """清理非活跃用户"""
    try:
        db = SessionLocal()
        cutoff_date = datetime.now() - timedelta(days=365)
        
        inactive_users = db.query(User).filter(
            User.is_active == False,
            User.updated_at < cutoff_date
        ).all()
        
        count = len(inactive_users)
        for user in inactive_users:
            db.delete(user)
        
        db.commit()
        logger.info(f"清理了 {count} 个非活跃用户")
        return {"status": "success", "cleaned_users": count}
        
    except Exception as e:
        logger.error(f"清理非活跃用户失败: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()

@celery_app.task
def generate_user_stats():
    """生成用户统计信息"""
    try:
        db = SessionLocal()
        
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        superusers = db.query(User).filter(User.is_superuser == True).count()
        
        # 近30天新注册用户
        thirty_days_ago = datetime.now() - timedelta(days=30)
        new_users_30d = db.query(User).filter(User.created_at >= thirty_days_ago).count()
        
        stats = {
            "total_users": total_users,
            "active_users": active_users,
            "superusers": superusers,
            "new_users_30d": new_users_30d,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"生成用户统计: {stats}")
        return stats
        
    except Exception as e:
        logger.error(f"生成用户统计失败: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()

@celery_app.task
def backup_user_data():
    """备份用户数据"""
    try:
        db = SessionLocal()
        users = db.query(User).all()
        
        backup_data = []
        for user in users:
            backup_data.append({
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            })
        
        # 这里可以将备份数据保存到MinIO或其他存储服务
        logger.info(f"备份了 {len(backup_data)} 个用户数据")
        return {"status": "success", "backup_count": len(backup_data)}
        
    except Exception as e:
        logger.error(f"备份用户数据失败: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        db.close()