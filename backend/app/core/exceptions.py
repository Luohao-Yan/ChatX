"""
企业级统一异常处理系统
提供标准化的错误码和异常类型
"""

from typing import Any, Dict, Optional, Union
from fastapi import HTTPException, status
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class ErrorCode(str, Enum):
    """标准错误码枚举"""
    
    # 通用错误 (1000-1999)
    UNKNOWN_ERROR = "E1000"
    VALIDATION_ERROR = "E1001"
    PARAMETER_ERROR = "E1002"
    BUSINESS_ERROR = "E1003"
    SYSTEM_ERROR = "E1004"
    
    # 认证授权错误 (2000-2999)
    AUTHENTICATION_FAILED = "E2000"
    AUTHENTICATION_REQUIRED = "E2001"
    TOKEN_INVALID = "E2002"
    TOKEN_EXPIRED = "E2003"
    PERMISSION_DENIED = "E2004"
    ACCOUNT_DISABLED = "E2005"
    ACCOUNT_LOCKED = "E2006"
    PASSWORD_INCORRECT = "E2007"
    TWO_FACTOR_REQUIRED = "E2008"
    
    # 租户相关错误 (3000-3999)
    TENANT_NOT_FOUND = "E3000"
    TENANT_INACTIVE = "E3001"
    TENANT_EXPIRED = "E3002"
    TENANT_SUSPENDED = "E3003"
    TENANT_QUOTA_EXCEEDED = "E3004"
    TENANT_FEATURE_DISABLED = "E3005"
    TENANT_IP_RESTRICTED = "E3006"
    
    # 用户相关错误 (4000-4999)
    USER_NOT_FOUND = "E4000"
    USER_ALREADY_EXISTS = "E4001"
    USER_INACTIVE = "E4002"
    USER_EMAIL_TAKEN = "E4003"
    USER_USERNAME_TAKEN = "E4004"
    USER_VERIFICATION_REQUIRED = "E4005"
    
    # 资源相关错误 (5000-5999)
    RESOURCE_NOT_FOUND = "E5000"
    RESOURCE_ALREADY_EXISTS = "E5001"
    RESOURCE_ACCESS_DENIED = "E5002"
    RESOURCE_LOCKED = "E5003"
    RESOURCE_EXPIRED = "E5004"
    
    # 文件相关错误 (6000-6999)
    FILE_NOT_FOUND = "E6000"
    FILE_TOO_LARGE = "E6001"
    FILE_TYPE_NOT_ALLOWED = "E6002"
    FILE_UPLOAD_FAILED = "E6003"
    FILE_DOWNLOAD_FAILED = "E6004"
    FILE_PROCESSING_FAILED = "E6005"
    STORAGE_QUOTA_EXCEEDED = "E6006"
    
    # 外部服务错误 (7000-7999)
    DATABASE_ERROR = "E7000"
    REDIS_ERROR = "E7001"
    MINIO_ERROR = "E7002"
    WEAVIATE_ERROR = "E7003"
    NEO4J_ERROR = "E7004"
    EMAIL_SERVICE_ERROR = "E7005"
    SMS_SERVICE_ERROR = "E7006"
    
    # API相关错误 (8000-8999)
    RATE_LIMIT_EXCEEDED = "E8000"
    API_VERSION_NOT_SUPPORTED = "E8001"
    API_DEPRECATED = "E8002"
    REQUEST_TIMEOUT = "E8003"
    PAYLOAD_TOO_LARGE = "E8004"
    
    # 业务逻辑错误 (9000-9999)
    WORKFLOW_ERROR = "E9000"
    STATE_TRANSITION_ERROR = "E9001"
    CONCURRENT_MODIFICATION = "E9002"
    DEPENDENCY_CONSTRAINT = "E9003"

class BaseAPIException(Exception):
    """API异常基类"""
    
    def __init__(
        self,
        message: str,
        error_code: ErrorCode,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        self.headers = headers or {}
        super().__init__(self.message)
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "error": {
                "code": self.error_code.value,
                "message": self.message,
                "details": self.details
            }
        }
    
    def to_http_exception(self) -> HTTPException:
        """转换为FastAPI HTTPException"""
        return HTTPException(
            status_code=self.status_code,
            detail=self.to_dict(),
            headers=self.headers
        )

# 具体异常类定义

class ValidationError(BaseAPIException):
    """数据验证错误"""
    def __init__(self, message: str = "数据验证失败", details: Optional[Dict] = None):
        super().__init__(
            message=message,
            error_code=ErrorCode.VALIDATION_ERROR,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )

class AuthenticationError(BaseAPIException):
    """认证错误"""
    def __init__(self, message: str = "认证失败", details: Optional[Dict] = None):
        super().__init__(
            message=message,
            error_code=ErrorCode.AUTHENTICATION_FAILED,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details,
            headers={"WWW-Authenticate": "Bearer"}
        )

class PermissionError(BaseAPIException):
    """权限错误"""
    def __init__(self, message: str = "权限不足", details: Optional[Dict] = None):
        super().__init__(
            message=message,
            error_code=ErrorCode.PERMISSION_DENIED,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details
        )

class TenantError(BaseAPIException):
    """租户相关错误"""
    def __init__(
        self, 
        message: str = "租户错误", 
        error_code: ErrorCode = ErrorCode.TENANT_NOT_FOUND,
        details: Optional[Dict] = None
    ):
        status_map = {
            ErrorCode.TENANT_NOT_FOUND: status.HTTP_404_NOT_FOUND,
            ErrorCode.TENANT_INACTIVE: status.HTTP_403_FORBIDDEN,
            ErrorCode.TENANT_EXPIRED: status.HTTP_403_FORBIDDEN,
            ErrorCode.TENANT_SUSPENDED: status.HTTP_403_FORBIDDEN,
            ErrorCode.TENANT_QUOTA_EXCEEDED: status.HTTP_429_TOO_MANY_REQUESTS,
            ErrorCode.TENANT_FEATURE_DISABLED: status.HTTP_403_FORBIDDEN,
            ErrorCode.TENANT_IP_RESTRICTED: status.HTTP_403_FORBIDDEN,
        }
        
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=status_map.get(error_code, status.HTTP_400_BAD_REQUEST),
            details=details
        )

class QuotaExceededError(BaseAPIException):
    """配额超限错误"""
    def __init__(self, resource_type: str, limit: int, current: Optional[int] = None):
        details = {
            "resource_type": resource_type,
            "limit": limit
        }
        if current is not None:
            details["current"] = current
            
        super().__init__(
            message=f"{resource_type}配额已达到上限({limit})",
            error_code=ErrorCode.TENANT_QUOTA_EXCEEDED,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details=details,
            headers={"Retry-After": "3600"}
        )

class ResourceNotFoundError(BaseAPIException):
    """资源不存在错误"""
    def __init__(self, resource_type: str, resource_id: str = None):
        details = {"resource_type": resource_type}
        if resource_id:
            details["resource_id"] = resource_id
            
        super().__init__(
            message=f"{resource_type}不存在",
            error_code=ErrorCode.RESOURCE_NOT_FOUND,
            status_code=status.HTTP_404_NOT_FOUND,
            details=details
        )

class FileError(BaseAPIException):
    """文件相关错误"""
    def __init__(
        self, 
        message: str = "文件处理错误", 
        error_code: ErrorCode = ErrorCode.FILE_UPLOAD_FAILED,
        details: Optional[Dict] = None
    ):
        status_map = {
            ErrorCode.FILE_NOT_FOUND: status.HTTP_404_NOT_FOUND,
            ErrorCode.FILE_TOO_LARGE: status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            ErrorCode.FILE_TYPE_NOT_ALLOWED: status.HTTP_400_BAD_REQUEST,
            ErrorCode.FILE_UPLOAD_FAILED: status.HTTP_500_INTERNAL_SERVER_ERROR,
            ErrorCode.FILE_DOWNLOAD_FAILED: status.HTTP_500_INTERNAL_SERVER_ERROR,
            ErrorCode.STORAGE_QUOTA_EXCEEDED: status.HTTP_429_TOO_MANY_REQUESTS,
        }
        
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=status_map.get(error_code, status.HTTP_400_BAD_REQUEST),
            details=details
        )

class ExternalServiceError(BaseAPIException):
    """外部服务错误"""
    def __init__(
        self, 
        service_name: str,
        message: str = None,
        error_code: ErrorCode = ErrorCode.DATABASE_ERROR,
        details: Optional[Dict] = None
    ):
        if not message:
            message = f"{service_name}服务异常"
            
        if not details:
            details = {}
        details["service"] = service_name
        
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details=details
        )

class RateLimitError(BaseAPIException):
    """频率限制错误"""
    def __init__(self, retry_after: int = 60, details: Optional[Dict] = None):
        super().__init__(
            message="请求过于频繁，请稍后重试",
            error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details=details,
            headers={"Retry-After": str(retry_after)}
        )

class BusinessLogicError(BaseAPIException):
    """业务逻辑错误"""
    def __init__(self, message: str, details: Optional[Dict] = None):
        super().__init__(
            message=message,
            error_code=ErrorCode.BUSINESS_ERROR,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details
        )

# 错误码与错误消息的映射
ERROR_MESSAGES = {
    ErrorCode.UNKNOWN_ERROR: "未知错误",
    ErrorCode.VALIDATION_ERROR: "数据验证失败",
    ErrorCode.PARAMETER_ERROR: "参数错误",
    ErrorCode.BUSINESS_ERROR: "业务逻辑错误",
    ErrorCode.SYSTEM_ERROR: "系统错误",
    
    ErrorCode.AUTHENTICATION_FAILED: "认证失败",
    ErrorCode.AUTHENTICATION_REQUIRED: "需要认证",
    ErrorCode.TOKEN_INVALID: "令牌无效",
    ErrorCode.TOKEN_EXPIRED: "令牌已过期",
    ErrorCode.PERMISSION_DENIED: "权限不足",
    ErrorCode.ACCOUNT_DISABLED: "账户已禁用",
    ErrorCode.ACCOUNT_LOCKED: "账户已锁定",
    ErrorCode.PASSWORD_INCORRECT: "密码错误",
    ErrorCode.TWO_FACTOR_REQUIRED: "需要双因素认证",
    
    ErrorCode.TENANT_NOT_FOUND: "租户不存在",
    ErrorCode.TENANT_INACTIVE: "租户未激活",
    ErrorCode.TENANT_EXPIRED: "租户已过期",
    ErrorCode.TENANT_SUSPENDED: "租户已暂停",
    ErrorCode.TENANT_QUOTA_EXCEEDED: "租户配额已用完",
    ErrorCode.TENANT_FEATURE_DISABLED: "功能未启用",
    ErrorCode.TENANT_IP_RESTRICTED: "IP地址受限",
    
    ErrorCode.USER_NOT_FOUND: "用户不存在",
    ErrorCode.USER_ALREADY_EXISTS: "用户已存在",
    ErrorCode.USER_INACTIVE: "用户未激活",
    ErrorCode.USER_EMAIL_TAKEN: "邮箱已被使用",
    ErrorCode.USER_USERNAME_TAKEN: "用户名已被使用",
    ErrorCode.USER_VERIFICATION_REQUIRED: "需要验证用户身份",
    
    ErrorCode.RESOURCE_NOT_FOUND: "资源不存在",
    ErrorCode.RESOURCE_ALREADY_EXISTS: "资源已存在",
    ErrorCode.RESOURCE_ACCESS_DENIED: "资源访问被拒绝",
    ErrorCode.RESOURCE_LOCKED: "资源已锁定",
    ErrorCode.RESOURCE_EXPIRED: "资源已过期",
    
    ErrorCode.FILE_NOT_FOUND: "文件不存在",
    ErrorCode.FILE_TOO_LARGE: "文件过大",
    ErrorCode.FILE_TYPE_NOT_ALLOWED: "文件类型不允许",
    ErrorCode.FILE_UPLOAD_FAILED: "文件上传失败",
    ErrorCode.FILE_DOWNLOAD_FAILED: "文件下载失败",
    ErrorCode.FILE_PROCESSING_FAILED: "文件处理失败",
    ErrorCode.STORAGE_QUOTA_EXCEEDED: "存储配额已用完",
    
    ErrorCode.DATABASE_ERROR: "数据库错误",
    ErrorCode.REDIS_ERROR: "Redis错误",
    ErrorCode.MINIO_ERROR: "MinIO错误",
    ErrorCode.WEAVIATE_ERROR: "Weaviate错误",
    ErrorCode.NEO4J_ERROR: "Neo4j错误",
    ErrorCode.EMAIL_SERVICE_ERROR: "邮件服务错误",
    ErrorCode.SMS_SERVICE_ERROR: "短信服务错误",
    
    ErrorCode.RATE_LIMIT_EXCEEDED: "请求频率超限",
    ErrorCode.API_VERSION_NOT_SUPPORTED: "API版本不支持",
    ErrorCode.API_DEPRECATED: "API已弃用",
    ErrorCode.REQUEST_TIMEOUT: "请求超时",
    ErrorCode.PAYLOAD_TOO_LARGE: "请求体过大",
    
    ErrorCode.WORKFLOW_ERROR: "工作流错误",
    ErrorCode.STATE_TRANSITION_ERROR: "状态转换错误",
    ErrorCode.CONCURRENT_MODIFICATION: "并发修改冲突",
    ErrorCode.DEPENDENCY_CONSTRAINT: "依赖约束冲突",
}

def get_error_message(error_code: ErrorCode) -> str:
    """获取错误码对应的错误消息"""
    return ERROR_MESSAGES.get(error_code, "未知错误")

def create_error_response(
    error_code: ErrorCode,
    message: str = None,
    details: Optional[Dict] = None
) -> Dict[str, Any]:
    """创建标准错误响应"""
    return {
        "error": {
            "code": error_code.value,
            "message": message or get_error_message(error_code),
            "details": details or {}
        }
    }