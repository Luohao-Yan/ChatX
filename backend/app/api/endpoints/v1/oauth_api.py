"""
OAuth第三方登录API接口
处理OAuth相关的HTTP请求
"""

from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.oauth_config import OAuthSettings
from app.application.services.oauth_service import OAuthService
from app.infrastructure.repositories.oauth_repository_impl import OAuthRepositoryImpl
from app.infrastructure.repositories.user_repository_impl import UserRepository, UserSessionRepository, UserVerificationRepository
from app.application.services.user_service import UserService
from app.infrastructure.persistence.database import get_db
from app.core.exceptions import BusinessLogicError
from app.utils.deps import get_current_user
from app.models.user_models import User


# 创建路由器
router = APIRouter(prefix="/oauth", tags=["OAuth认证"])

# OAuth设置
oauth_settings = OAuthSettings()


def get_oauth_service(db: Session = Depends(get_db)) -> OAuthService:
    """获取OAuth服务实例"""
    oauth_repo = OAuthRepositoryImpl(db)
    user_repo = UserRepository(db)
    session_repo = UserSessionRepository(db)
    verification_repo = UserVerificationRepository(db)
    user_service = UserService(user_repo, session_repo, verification_repo)
    
    return OAuthService(oauth_repo, user_repo, user_service, oauth_settings)


@router.get("/providers")
async def get_oauth_providers(oauth_service: OAuthService = Depends(get_oauth_service)) -> Dict[str, Any]:
    """获取可用的OAuth提供商列表"""
    try:
        enabled_providers = oauth_service.client_factory.get_enabled_providers()
        
        providers = []
        for provider in enabled_providers:
            providers.append({
                "name": provider.value,
                "display_name": {
                    "github": "GitHub",
                    "google": "Google", 
                    "wechat": "微信",
                    "microsoft": "Microsoft"
                }.get(provider.value, provider.value.title())
            })
        
        return {
            "providers": providers,
            "enabled": oauth_settings.OAUTH_ENABLED
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取OAuth提供商列表失败: {str(e)}"
        )


@router.get("/authorize/{provider}")
async def oauth_authorize(
    provider: str,
    redirect_url: Optional[str] = None,
    oauth_service: OAuthService = Depends(get_oauth_service)
) -> Dict[str, Any]:
    """获取OAuth授权地址"""
    try:
        result = await oauth_service.get_authorization_url(provider, redirect_url)
        return result
    
    except BusinessLogicError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取授权地址失败: {str(e)}"
        )


@router.get("/callback/{provider}")
async def oauth_callback(
    provider: str,
    code: str,
    state: str,
    request: Request,
    oauth_service: OAuthService = Depends(get_oauth_service)
):
    """处理OAuth回调"""
    try:
        # 获取客户端信息
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("User-Agent")
        
        result = await oauth_service.handle_oauth_callback(
            provider, code, state, client_ip, user_agent
        )
        
        # 如果有重定向地址，重定向到前端
        if result.get("redirect_url"):
            redirect_url = f"{result['redirect_url']}?access_token={result['access_token']}&refresh_token={result['refresh_token']}"
            return RedirectResponse(url=redirect_url)
        
        # 否则返回JSON响应
        return result
    
    except BusinessLogicError as e:
        # 重定向到错误页面
        error_url = f"{oauth_settings.OAUTH_CALLBACK_BASE_URL}/auth/error?error={e.error_code}&message={e.message}"
        return RedirectResponse(url=error_url)
    except Exception as e:
        error_url = f"{oauth_settings.OAUTH_CALLBACK_BASE_URL}/auth/error?error=UNKNOWN_ERROR&message={str(e)}"
        return RedirectResponse(url=error_url)


@router.post("/bind/{provider}")
async def bind_oauth_account(
    provider: str,
    code: str,
    state: str,
    current_user: User = Depends(get_current_user),
    oauth_service: OAuthService = Depends(get_oauth_service)
) -> Dict[str, Any]:
    """绑定OAuth账号到当前用户"""
    try:
        result = await oauth_service.bind_oauth_account(current_user.id, provider, code, state)
        return result
    
    except BusinessLogicError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"绑定OAuth账号失败: {str(e)}"
        )


@router.delete("/unbind/{provider}")
async def unbind_oauth_account(
    provider: str,
    current_user: User = Depends(get_current_user),
    oauth_service: OAuthService = Depends(get_oauth_service)
) -> Dict[str, Any]:
    """解绑OAuth账号"""
    try:
        result = await oauth_service.unbind_oauth_account(current_user.id, provider)
        return result
    
    except BusinessLogicError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"解绑OAuth账号失败: {str(e)}"
        )


@router.get("/accounts")
async def get_oauth_accounts(
    current_user: User = Depends(get_current_user),
    oauth_service: OAuthService = Depends(get_oauth_service)
) -> Dict[str, Any]:
    """获取当前用户的OAuth绑定列表"""
    try:
        accounts = await oauth_service.get_user_oauth_accounts(current_user.id)
        return {"accounts": accounts}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取OAuth绑定列表失败: {str(e)}"
        )


@router.post("/cleanup")
async def cleanup_oauth_states(
    current_user: User = Depends(get_current_user),
    oauth_service: OAuthService = Depends(get_oauth_service)
) -> Dict[str, Any]:
    """清理过期的OAuth状态（仅管理员）"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="权限不足"
        )
    
    try:
        count = await oauth_service.cleanup_expired_states()
        return {"message": f"清理了 {count} 个过期状态"}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"清理过期状态失败: {str(e)}"
        )