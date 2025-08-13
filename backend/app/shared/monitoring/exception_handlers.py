"""
全局异常处理器
统一处理应用中的各种异常
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError
from pydantic import ValidationError
import logging
import traceback
import uuid
from typing import Union

from app.core.exceptions import (
    BaseAPIException,
    ErrorCode,
    create_error_response,
    ExternalServiceError
)

logger = logging.getLogger(__name__)

async def base_exception_handler(request: Request, exc: BaseAPIException) -> JSONResponse:
    """处理自定义API异常"""
    # 生成请求ID用于追踪
    request_id = str(uuid.uuid4())
    
    # 记录错误日志
    logger.error(
        f"API Exception: {exc.error_code.value} - {exc.message}",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
            "error_code": exc.error_code.value,
            "error_details": exc.details,
            "user_agent": request.headers.get("user-agent"),
            "client_ip": request.client.host if request.client else None
        }
    )
    
    # 构建响应
    response_data = exc.to_dict()
    response_data["request_id"] = request_id
    
    return JSONResponse(
        status_code=exc.status_code,
        content=response_data,
        headers=exc.headers
    )

async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """处理FastAPI HTTP异常"""
    request_id = str(uuid.uuid4())
    
    # 如果detail已经是我们的错误格式，直接返回
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        exc.detail["request_id"] = request_id
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.detail,
            headers=getattr(exc, "headers", {})
        )
    
    # 标准化HTTP异常响应
    error_code_map = {
        400: ErrorCode.PARAMETER_ERROR,
        401: ErrorCode.AUTHENTICATION_REQUIRED,
        403: ErrorCode.PERMISSION_DENIED,
        404: ErrorCode.RESOURCE_NOT_FOUND,
        405: ErrorCode.PARAMETER_ERROR,
        422: ErrorCode.VALIDATION_ERROR,
        429: ErrorCode.RATE_LIMIT_EXCEEDED,
        500: ErrorCode.SYSTEM_ERROR,
        503: ErrorCode.SYSTEM_ERROR,
    }
    
    error_code = error_code_map.get(exc.status_code, ErrorCode.UNKNOWN_ERROR)
    
    logger.warning(
        f"HTTP Exception: {exc.status_code} - {exc.detail}",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
            "status_code": exc.status_code,
            "user_agent": request.headers.get("user-agent"),
            "client_ip": request.client.host if request.client else None
        }
    )
    
    response_data = create_error_response(
        error_code=error_code,
        message=str(exc.detail)
    )
    response_data["request_id"] = request_id
    
    return JSONResponse(
        status_code=exc.status_code,
        content=response_data,
        headers=getattr(exc, "headers", {})
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """处理请求验证异常"""
    request_id = str(uuid.uuid4())
    
    # 提取验证错误详情
    validation_errors = []
    for error in exc.errors():
        validation_errors.append({
            "field": " -> ".join(str(x) for x in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
            "input": error.get("input")
        })
    
    logger.warning(
        f"Validation Error: {len(validation_errors)} field(s) failed validation",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
            "validation_errors": validation_errors,
            "user_agent": request.headers.get("user-agent"),
            "client_ip": request.client.host if request.client else None
        }
    )
    
    response_data = create_error_response(
        error_code=ErrorCode.VALIDATION_ERROR,
        message="请求数据验证失败",
        details={
            "validation_errors": validation_errors,
            "error_count": len(validation_errors)
        }
    )
    response_data["request_id"] = request_id
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=response_data
    )

async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """处理SQLAlchemy数据库异常"""
    request_id = str(uuid.uuid4())
    
    # 记录详细错误信息
    logger.error(
        f"Database Error: {str(exc)}",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
            "exception_type": type(exc).__name__,
            "traceback": traceback.format_exc(),
            "user_agent": request.headers.get("user-agent"),
            "client_ip": request.client.host if request.client else None
        }
    )
    
    # 不向客户端暴露敏感的数据库错误信息
    response_data = create_error_response(
        error_code=ErrorCode.DATABASE_ERROR,
        message="数据库操作失败",
        details={"service": "database"}
    )
    response_data["request_id"] = request_id
    
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content=response_data
    )

async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """处理未捕获的通用异常"""
    request_id = str(uuid.uuid4())
    
    # 记录详细错误信息
    logger.error(
        f"Unhandled Exception: {str(exc)}",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
            "exception_type": type(exc).__name__,
            "traceback": traceback.format_exc(),
            "user_agent": request.headers.get("user-agent"),
            "client_ip": request.client.host if request.client else None
        }
    )
    
    # 通用错误响应
    response_data = create_error_response(
        error_code=ErrorCode.SYSTEM_ERROR,
        message="系统内部错误",
        details={"type": type(exc).__name__}
    )
    response_data["request_id"] = request_id
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=response_data
    )

async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """处理Starlette HTTP异常"""
    request_id = str(uuid.uuid4())
    
    # 标准化Starlette异常
    error_code_map = {
        404: ErrorCode.RESOURCE_NOT_FOUND,
        405: ErrorCode.PARAMETER_ERROR,
        500: ErrorCode.SYSTEM_ERROR,
    }
    
    error_code = error_code_map.get(exc.status_code, ErrorCode.UNKNOWN_ERROR)
    
    logger.warning(
        f"Starlette HTTP Exception: {exc.status_code} - {exc.detail}",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "method": request.method,
            "status_code": exc.status_code
        }
    )
    
    response_data = create_error_response(
        error_code=error_code,
        message=str(exc.detail)
    )
    response_data["request_id"] = request_id
    
    return JSONResponse(
        status_code=exc.status_code,
        content=response_data
    )

# 异常处理器映射
EXCEPTION_HANDLERS = {
    BaseAPIException: base_exception_handler,
    HTTPException: http_exception_handler,
    RequestValidationError: validation_exception_handler,
    SQLAlchemyError: sqlalchemy_exception_handler,
    StarletteHTTPException: starlette_http_exception_handler,
    Exception: general_exception_handler,
}

def register_exception_handlers(app):
    """注册异常处理器到FastAPI应用"""
    for exc_type, handler in EXCEPTION_HANDLERS.items():
        app.add_exception_handler(exc_type, handler)