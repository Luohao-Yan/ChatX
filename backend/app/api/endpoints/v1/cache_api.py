from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer

from app.application.middleware.api_cache_service import get_api_cache_service
from app.application.middleware.session_cache_service import get_session_cache_service
from app.application.middleware.verification_service import get_verification_service
from app.application.middleware.rate_limiter_service import get_rate_limiter_service
from app.models.user_models import User
from app.utils.deps import get_current_active_user

router = APIRouter()
security = HTTPBearer()


@router.get("/stats", response_model=Dict[str, Any])
async def get_cache_stats(
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """获取缓存统计信息（需要管理员权限）"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    
    # 获取各类缓存统计
    api_cache = await get_api_cache_service()
    api_stats = await api_cache.get_cache_stats()
    
    # TODO: 添加其他缓存统计
    return {
        "api_cache": api_stats,
        "user_id": current_user.id,
        "timestamp": api_stats.get("generated_at")
    }


@router.delete("/clear")
async def clear_cache(
    cache_type: str = Query(None, description="缓存类型：api, user, session, all"),
    user_id: Optional[str] = Query(None, description="特定用户ID"),
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """清理缓存（需要管理员权限）"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    
    cleared_count = 0
    
    try:
        api_cache = await get_api_cache_service()
        session_cache = await get_session_cache_service()
        
        if cache_type == "api" or cache_type == "all":
            # 清理API缓存
            if user_id:
                cleared_count += await api_cache.invalidate_cache(user_id=user_id)
                cleared_count += await api_cache.invalidate_user_cache(user_id)
            else:
                cleared_count += await api_cache.invalidate_cache()
        
        if cache_type == "session" or cache_type == "all":
            # 清理会话缓存
            if user_id:
                await session_cache.deactivate_all_user_sessions(user_id)
                cleared_count += 1  # 估算
            else:
                # 清理过期会话
                expired_count = await session_cache.cleanup_expired_sessions()
                cleared_count += expired_count
        
        if cache_type == "user" or cache_type == "all":
            # 清理用户缓存
            if user_id:
                cleared_count += await api_cache.invalidate_user_cache(user_id)
            else:
                # 清理所有用户缓存
                cleared_count += await api_cache.invalidate_cache(pattern="user_cache:*")
        
        return {
            "success": True,
            "cache_type": cache_type or "all",
            "user_id": user_id,
            "cleared_items": cleared_count,
            "message": f"已清理 {cleared_count} 个缓存项"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清理缓存失败: {str(e)}")


@router.get("/user/{user_id}")
async def get_user_cache_info(
    user_id: str,
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """获取用户缓存信息"""
    # 权限检查：只能查看自己的缓存信息，或管理员
    if current_user.id != user_id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="无权限访问此用户缓存信息")
    
    try:
        api_cache = await get_api_cache_service()
        session_cache = await get_session_cache_service()
        verification_service = await get_verification_service()
        
        # 获取用户相关缓存信息
        cached_profile = await api_cache.get_cached_user_data(user_id, "profile")
        active_sessions = await session_cache.get_user_active_sessions(user_id)
        
        # 获取验证码状态
        email_verification = await verification_service.get_verification_info(user_id, "email")
        reset_verification = await verification_service.get_verification_info(user_id, "password_reset")
        
        return {
            "user_id": user_id,
            "cached_profile": bool(cached_profile),
            "active_sessions_count": len(active_sessions),
            "verification_status": {
                "email": email_verification is not None,
                "password_reset": reset_verification is not None
            },
            "sessions": active_sessions[:5] if len(active_sessions) <= 5 else active_sessions[:5]  # 最多显示5个会话
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取用户缓存信息失败: {str(e)}")


@router.delete("/user/{user_id}")
async def clear_user_cache(
    user_id: str,
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """清理特定用户的缓存"""
    # 权限检查：只能清理自己的缓存，或管理员
    if current_user.id != user_id and not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="无权限清理此用户缓存")
    
    try:
        api_cache = await get_api_cache_service()
        session_cache = await get_session_cache_service()
        verification_service = await get_verification_service()
        
        cleared_count = 0
        
        # 清理用户API缓存
        cleared_count += await api_cache.invalidate_user_cache(user_id)
        
        # 清理用户会话缓存
        await session_cache.deactivate_all_user_sessions(user_id)
        cleared_count += 1
        
        # 取消用户验证码
        await verification_service.cancel_verification(user_id, "email")
        await verification_service.cancel_verification(user_id, "password_reset")
        cleared_count += 2
        
        return {
            "success": True,
            "user_id": user_id,
            "cleared_items": cleared_count,
            "message": f"已清理用户 {user_id} 的所有缓存"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清理用户缓存失败: {str(e)}")


@router.get("/rate-limit/{identifier}")
async def get_rate_limit_status(
    identifier: str,
    action: str = Query("api", description="限流动作：login, register, send_code, api"),
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """获取限流状态（需要管理员权限）"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    
    try:
        rate_limiter = await get_rate_limiter_service()
        status = await rate_limiter.get_rate_limit_status(identifier, action)
        
        return {
            "identifier": identifier,
            "action": action,
            "status": status
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取限流状态失败: {str(e)}")


@router.delete("/rate-limit/{identifier}")
async def clear_rate_limit(
    identifier: str,
    action: Optional[str] = Query(None, description="限流动作，不指定则清理所有"),
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """清理限流记录（需要管理员权限）"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    
    try:
        rate_limiter = await get_rate_limiter_service()
        
        # 清理登录尝试记录
        await rate_limiter.clear_login_attempts(identifier)
        
        # TODO: 添加清理其他限流记录的功能
        
        return {
            "success": True,
            "identifier": identifier,
            "action": action or "all",
            "message": f"已清理 {identifier} 的限流记录"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清理限流记录失败: {str(e)}")


@router.post("/warmup")
async def warmup_cache(
    user_ids: Optional[list[str]] = None,
    current_user: User = Depends(get_current_active_user)
) -> Dict[str, Any]:
    """预热缓存（需要管理员权限）"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    
    # TODO: 实现缓存预热逻辑
    # 可以预热用户配置文件、常用设置等
    
    return {
        "success": True,
        "message": "缓存预热功能正在开发中",
        "user_ids": user_ids or []
    }