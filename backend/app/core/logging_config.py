"""
企业级结构化日志配置
支持JSON格式日志、链路追踪、性能监控等
"""

import logging
import logging.config
import sys
import json
import os
from datetime import datetime
from typing import Any, Dict, Optional
from pythonjsonlogger import jsonlogger
import threading
import uuid
from contextvars import ContextVar

# 请求上下文变量
request_id_context: ContextVar[str] = ContextVar('request_id', default='')
user_id_context: ContextVar[str] = ContextVar('user_id', default='')
tenant_id_context: ContextVar[str] = ContextVar('tenant_id', default='')

class StructuredFormatter(jsonlogger.JsonFormatter):
    """结构化JSON日志格式化器"""
    
    def add_fields(self, log_record: Dict[str, Any], record: logging.LogRecord, message_dict: Dict[str, Any]):
        """添加自定义字段到日志记录"""
        super(StructuredFormatter, self).add_fields(log_record, record, message_dict)
        
        # 基础信息
        log_record['timestamp'] = datetime.utcnow().isoformat() + 'Z'
        log_record['level'] = record.levelname
        log_record['logger'] = record.name
        log_record['thread_id'] = threading.current_thread().ident
        log_record['process_id'] = os.getpid()
        
        # 请求追踪信息
        log_record['request_id'] = request_id_context.get() or ''
        log_record['user_id'] = user_id_context.get() or ''
        log_record['tenant_id'] = tenant_id_context.get() or ''
        
        # 代码位置信息
        log_record['filename'] = record.filename
        log_record['function'] = record.funcName
        log_record['line_number'] = record.lineno
        
        # 环境信息
        log_record['environment'] = os.getenv('ENVIRONMENT', 'development')
        log_record['service'] = 'chatx-api'
        log_record['version'] = os.getenv('APP_VERSION', '1.0.0')

class RequestContextFilter(logging.Filter):
    """请求上下文过滤器"""
    
    def filter(self, record: logging.LogRecord) -> bool:
        """为日志记录添加请求上下文信息"""
        record.request_id = request_id_context.get() or ''
        record.user_id = user_id_context.get() or ''
        record.tenant_id = tenant_id_context.get() or ''
        return True

def set_request_context(request_id: str = None, user_id: str = None, tenant_id: str = None):
    """设置请求上下文"""
    if request_id:
        request_id_context.set(request_id)
    if user_id:
        user_id_context.set(str(user_id))
    if tenant_id:
        tenant_id_context.set(str(tenant_id))

def clear_request_context():
    """清除请求上下文"""
    request_id_context.set('')
    user_id_context.set('')
    tenant_id_context.set('')

def get_logging_config(log_level: str = "INFO", log_file: str = None) -> Dict[str, Any]:
    """获取日志配置"""
    
    config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "structured": {
                "()": StructuredFormatter,
                "format": "%(asctime)s %(name)s %(levelname)s %(message)s"
            },
            "simple": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S"
            },
            "detailed": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(funcName)s - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S"
            }
        },
        "filters": {
            "request_context": {
                "()": RequestContextFilter
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": log_level,
                "formatter": "structured" if os.getenv('ENVIRONMENT') == 'production' else "detailed",
                "filters": ["request_context"],
                "stream": sys.stdout
            }
        },
        "loggers": {
            # 应用日志
            "app": {
                "level": log_level,
                "handlers": ["console"],
                "propagate": False
            },
            # FastAPI日志
            "fastapi": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False
            },
            # Uvicorn日志
            "uvicorn": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False
            },
            "uvicorn.error": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False
            },
            "uvicorn.access": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False,
                "formatter": "structured"
            },
            # SQLAlchemy日志
            "sqlalchemy.engine": {
                "level": "WARNING",
                "handlers": ["console"],
                "propagate": False
            },
            "sqlalchemy.pool": {
                "level": "WARNING",
                "handlers": ["console"],
                "propagate": False
            },
            # Celery日志
            "celery": {
                "level": "INFO",
                "handlers": ["console"],
                "propagate": False
            },
            # Redis日志
            "redis": {
                "level": "WARNING",
                "handlers": ["console"],
                "propagate": False
            }
        },
        "root": {
            "level": log_level,
            "handlers": ["console"]
        }
    }
    
    # 生产环境添加文件日志
    if log_file or os.getenv('ENVIRONMENT') == 'production':
        log_file = log_file or "/app/logs/app.log"
        
        # 确保日志目录存在
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        
        config["handlers"]["file"] = {
            "class": "logging.handlers.RotatingFileHandler",
            "level": log_level,
            "formatter": "structured",
            "filters": ["request_context"],
            "filename": log_file,
            "maxBytes": 50 * 1024 * 1024,  # 50MB
            "backupCount": 10,
            "encoding": "utf-8"
        }
        
        # 错误日志单独文件
        error_log_file = log_file.replace(".log", "_error.log")
        config["handlers"]["error_file"] = {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "ERROR",
            "formatter": "structured",
            "filters": ["request_context"],
            "filename": error_log_file,
            "maxBytes": 50 * 1024 * 1024,  # 50MB
            "backupCount": 10,
            "encoding": "utf-8"
        }
        
        # 更新所有logger的handlers
        for logger_name in config["loggers"]:
            config["loggers"][logger_name]["handlers"].extend(["file", "error_file"])
        
        config["root"]["handlers"].extend(["file", "error_file"])
    
    return config

def setup_logging(log_level: str = None, log_file: str = None):
    """设置日志系统"""
    if not log_level:
        log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
    
    config = get_logging_config(log_level, log_file)
    logging.config.dictConfig(config)
    
    # 设置第三方库的日志级别
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)
    logging.getLogger("botocore").setLevel(logging.WARNING)
    logging.getLogger("boto3").setLevel(logging.WARNING)
    
    logger = logging.getLogger(__name__)
    logger.info("日志系统已初始化", extra={
        "log_level": log_level,
        "log_file": log_file,
        "environment": os.getenv('ENVIRONMENT', 'development')
    })

class LoggerMixin:
    """日志混入类"""
    
    @property
    def logger(self) -> logging.Logger:
        """获取类专用的日志器"""
        return logging.getLogger(f"{self.__class__.__module__}.{self.__class__.__name__}")

def get_logger(name: str = None) -> logging.Logger:
    """获取日志器"""
    if name is None:
        import inspect
        frame = inspect.currentframe().f_back
        name = frame.f_globals.get('__name__', 'unknown')
    
    return logging.getLogger(name)

# 业务日志记录器
business_logger = logging.getLogger("business")
security_logger = logging.getLogger("security")
performance_logger = logging.getLogger("performance")
audit_logger = logging.getLogger("audit")

def log_business_event(event_type: str, event_data: Dict[str, Any], level: str = "INFO"):
    """记录业务事件日志"""
    business_logger.log(
        getattr(logging, level.upper()),
        f"Business Event: {event_type}",
        extra={
            "event_type": event_type,
            "event_data": event_data,
            "category": "business"
        }
    )

def log_security_event(event_type: str, event_data: Dict[str, Any], level: str = "WARNING"):
    """记录安全事件日志"""
    security_logger.log(
        getattr(logging, level.upper()),
        f"Security Event: {event_type}",
        extra={
            "event_type": event_type,
            "event_data": event_data,
            "category": "security"
        }
    )

def log_performance_event(operation: str, duration_ms: float, additional_data: Dict[str, Any] = None):
    """记录性能事件日志"""
    data = {
        "operation": operation,
        "duration_ms": duration_ms,
        "category": "performance"
    }
    if additional_data:
        data.update(additional_data)
    
    performance_logger.info(
        f"Performance: {operation} took {duration_ms:.2f}ms",
        extra=data
    )

def log_audit_event(action: str, resource_type: str, resource_id: str = None, 
                   old_values: Dict = None, new_values: Dict = None):
    """记录审计日志"""
    audit_logger.info(
        f"Audit: {action} {resource_type}",
        extra={
            "action": action,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "old_values": old_values,
            "new_values": new_values,
            "category": "audit"
        }
    )

# 性能监控装饰器
import time
from functools import wraps

def log_performance(operation_name: str = None):
    """性能日志装饰器"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            operation = operation_name or f"{func.__module__}.{func.__name__}"
            
            try:
                result = await func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                log_performance_event(operation, duration_ms, {"status": "success"})
                return result
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                log_performance_event(operation, duration_ms, {
                    "status": "error",
                    "error_type": type(e).__name__,
                    "error_message": str(e)
                })
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            operation = operation_name or f"{func.__module__}.{func.__name__}"
            
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000
                log_performance_event(operation, duration_ms, {"status": "success"})
                return result
            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                log_performance_event(operation, duration_ms, {
                    "status": "error",
                    "error_type": type(e).__name__,
                    "error_message": str(e)
                })
                raise
        
        return async_wrapper if hasattr(func, '__call__') and hasattr(func, '__await__') else sync_wrapper
    return decorator