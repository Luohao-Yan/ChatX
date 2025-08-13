"""
业务指标收集系统
支持实时指标监控、性能追踪、业务分析等
"""

import time
import threading
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, deque
from enum import Enum
import json
import logging
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class MetricType(str, Enum):
    """指标类型"""
    COUNTER = "counter"        # 计数器（只增不减）
    GAUGE = "gauge"           # 仪表盘（可增可减）
    HISTOGRAM = "histogram"   # 直方图（分布统计）
    TIMER = "timer"           # 计时器
    SET = "set"              # 集合（去重计数）

@dataclass
class MetricValue:
    """指标值"""
    value: float
    timestamp: datetime = field(default_factory=datetime.now)
    tags: Dict[str, str] = field(default_factory=dict)
    
class MetricRegistry:
    """指标注册表"""
    
    def __init__(self):
        self._metrics: Dict[str, Dict] = {}
        self._lock = threading.RLock()
        self._collectors: List[Callable] = []
    
    def register_metric(self, name: str, metric_type: MetricType, 
                       description: str = "", tags: Dict[str, str] = None):
        """注册指标"""
        with self._lock:
            self._metrics[name] = {
                "type": metric_type,
                "description": description,
                "tags": tags or {},
                "values": deque(maxlen=1000),  # 保留最近1000个值
                "current_value": 0.0,
                "created_at": datetime.now()
            }
    
    def record_value(self, name: str, value: float, tags: Dict[str, str] = None):
        """记录指标值"""
        with self._lock:
            if name not in self._metrics:
                # 自动注册为计数器
                self.register_metric(name, MetricType.COUNTER)
            
            metric = self._metrics[name]
            metric_value = MetricValue(value=value, tags=tags or {})
            
            if metric["type"] == MetricType.COUNTER:
                metric["current_value"] += value
            elif metric["type"] == MetricType.GAUGE:
                metric["current_value"] = value
            elif metric["type"] in [MetricType.HISTOGRAM, MetricType.TIMER]:
                metric["current_value"] = value
                metric["values"].append(metric_value)
            
            # 记录到时间序列
            metric["values"].append(metric_value)
    
    def increment(self, name: str, amount: float = 1.0, tags: Dict[str, str] = None):
        """增加计数器"""
        self.record_value(name, amount, tags)
    
    def set_gauge(self, name: str, value: float, tags: Dict[str, str] = None):
        """设置仪表盘值"""
        if name not in self._metrics:
            self.register_metric(name, MetricType.GAUGE)
        self.record_value(name, value, tags)
    
    def record_histogram(self, name: str, value: float, tags: Dict[str, str] = None):
        """记录直方图值"""
        if name not in self._metrics:
            self.register_metric(name, MetricType.HISTOGRAM)
        self.record_value(name, value, tags)
    
    def get_metric(self, name: str) -> Optional[Dict]:
        """获取指标信息"""
        with self._lock:
            return self._metrics.get(name)
    
    def get_all_metrics(self) -> Dict[str, Dict]:
        """获取所有指标"""
        with self._lock:
            return dict(self._metrics)
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """获取指标摘要"""
        summary = {}
        
        with self._lock:
            for name, metric in self._metrics.items():
                values = list(metric["values"])
                if not values:
                    continue
                
                if metric["type"] in [MetricType.HISTOGRAM, MetricType.TIMER]:
                    numeric_values = [v.value for v in values]
                    summary[name] = {
                        "type": metric["type"],
                        "count": len(numeric_values),
                        "sum": sum(numeric_values),
                        "min": min(numeric_values),
                        "max": max(numeric_values),
                        "avg": sum(numeric_values) / len(numeric_values),
                        "current": metric["current_value"]
                    }
                else:
                    summary[name] = {
                        "type": metric["type"],
                        "current": metric["current_value"],
                        "count": len(values)
                    }
        
        return summary
    
    def register_collector(self, collector: Callable):
        """注册指标收集器"""
        self._collectors.append(collector)
    
    def collect_all(self) -> Dict[str, Any]:
        """收集所有指标"""
        # 执行注册的收集器
        for collector in self._collectors:
            try:
                collector()
            except Exception as e:
                logger.error(f"Metric collector error: {e}")
        
        return self.get_metrics_summary()

# 全局指标注册表
metrics_registry = MetricRegistry()

class Timer:
    """计时器上下文管理器"""
    
    def __init__(self, metric_name: str, tags: Dict[str, str] = None):
        self.metric_name = metric_name
        self.tags = tags or {}
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start_time:
            duration = (time.time() - self.start_time) * 1000  # 转换为毫秒
            metrics_registry.record_histogram(
                self.metric_name, 
                duration, 
                self.tags
            )

@contextmanager
def time_operation(operation_name: str, tags: Dict[str, str] = None):
    """计时操作上下文管理器"""
    start_time = time.time()
    try:
        yield
    finally:
        duration = (time.time() - start_time) * 1000
        metrics_registry.record_histogram(
            f"operation.{operation_name}.duration",
            duration,
            tags
        )

def timed(metric_name: str = None, tags: Dict[str, str] = None):
    """计时装饰器"""
    def decorator(func):
        name = metric_name or f"function.{func.__module__}.{func.__name__}.duration"
        
        if hasattr(func, '__call__') and hasattr(func, '__await__'):
            # 异步函数
            async def async_wrapper(*args, **kwargs):
                with Timer(name, tags):
                    return await func(*args, **kwargs)
            return async_wrapper
        else:
            # 同步函数
            def sync_wrapper(*args, **kwargs):
                with Timer(name, tags):
                    return func(*args, **kwargs)
            return sync_wrapper
    
    return decorator

class BusinessMetrics:
    """业务指标收集器"""
    
    def __init__(self):
        self.registry = metrics_registry
        self._setup_default_metrics()
    
    def _setup_default_metrics(self):
        """设置默认业务指标"""
        # HTTP请求指标
        self.registry.register_metric(
            "http.requests.total",
            MetricType.COUNTER,
            "HTTP请求总数"
        )
        self.registry.register_metric(
            "http.requests.duration",
            MetricType.HISTOGRAM,
            "HTTP请求响应时间"
        )
        self.registry.register_metric(
            "http.requests.errors",
            MetricType.COUNTER,
            "HTTP请求错误数"
        )
        
        # 用户相关指标
        self.registry.register_metric(
            "users.active",
            MetricType.GAUGE,
            "活跃用户数"
        )
        self.registry.register_metric(
            "users.login.total",
            MetricType.COUNTER,
            "用户登录总数"
        )
        self.registry.register_metric(
            "users.registration.total",
            MetricType.COUNTER,
            "用户注册总数"
        )
        
        # 文件相关指标
        self.registry.register_metric(
            "files.upload.total",
            MetricType.COUNTER,
            "文件上传总数"
        )
        self.registry.register_metric(
            "files.upload.size",
            MetricType.HISTOGRAM,
            "文件上传大小分布"
        )
        self.registry.register_metric(
            "files.download.total",
            MetricType.COUNTER,
            "文件下载总数"
        )
        
        # 租户相关指标
        self.registry.register_metric(
            "tenants.active",
            MetricType.GAUGE,
            "活跃租户数"
        )
        self.registry.register_metric(
            "tenants.quota.usage",
            MetricType.HISTOGRAM,
            "租户配额使用率"
        )
        
        # 系统指标
        self.registry.register_metric(
            "database.connections.active",
            MetricType.GAUGE,
            "数据库活跃连接数"
        )
        self.registry.register_metric(
            "cache.hits",
            MetricType.COUNTER,
            "缓存命中数"
        )
        self.registry.register_metric(
            "cache.misses",
            MetricType.COUNTER,
            "缓存未命中数"
        )
    
    def record_http_request(self, method: str, path: str, status_code: int, duration_ms: float):
        """记录HTTP请求指标"""
        tags = {
            "method": method,
            "path": path,
            "status_code": str(status_code),
            "status_class": f"{status_code // 100}xx"
        }
        
        self.registry.increment("http.requests.total", tags=tags)
        self.registry.record_histogram("http.requests.duration", duration_ms, tags=tags)
        
        if status_code >= 400:
            self.registry.increment("http.requests.errors", tags=tags)
    
    def record_user_login(self, tenant_id: str, success: bool = True):
        """记录用户登录"""
        tags = {
            "tenant_id": tenant_id,
            "status": "success" if success else "failure"
        }
        self.registry.increment("users.login.total", tags=tags)
    
    def record_user_registration(self, tenant_id: str):
        """记录用户注册"""
        tags = {"tenant_id": tenant_id}
        self.registry.increment("users.registration.total", tags=tags)
    
    def record_file_upload(self, tenant_id: str, file_size: int, file_type: str):
        """记录文件上传"""
        tags = {
            "tenant_id": tenant_id,
            "file_type": file_type
        }
        self.registry.increment("files.upload.total", tags=tags)
        self.registry.record_histogram("files.upload.size", file_size, tags=tags)
    
    def record_file_download(self, tenant_id: str, file_type: str):
        """记录文件下载"""
        tags = {
            "tenant_id": tenant_id,
            "file_type": file_type
        }
        self.registry.increment("files.download.total", tags=tags)
    
    def update_active_users(self, tenant_id: str, count: int):
        """更新活跃用户数"""
        tags = {"tenant_id": tenant_id}
        self.registry.set_gauge("users.active", count, tags=tags)
    
    def update_active_tenants(self, count: int):
        """更新活跃租户数"""
        self.registry.set_gauge("tenants.active", count)
    
    def record_tenant_quota_usage(self, tenant_id: str, resource_type: str, usage_percent: float):
        """记录租户配额使用率"""
        tags = {
            "tenant_id": tenant_id,
            "resource_type": resource_type
        }
        self.registry.record_histogram("tenants.quota.usage", usage_percent, tags=tags)
    
    def record_cache_hit(self, cache_type: str):
        """记录缓存命中"""
        tags = {"cache_type": cache_type}
        self.registry.increment("cache.hits", tags=tags)
    
    def record_cache_miss(self, cache_type: str):
        """记录缓存未命中"""
        tags = {"cache_type": cache_type}
        self.registry.increment("cache.misses", tags=tags)
    
    def get_summary(self) -> Dict[str, Any]:
        """获取业务指标摘要"""
        summary = self.registry.get_metrics_summary()
        
        # 计算派生指标
        http_requests = summary.get("http.requests.total", {})
        http_errors = summary.get("http.requests.errors", {})
        
        if http_requests.get("current", 0) > 0:
            error_rate = (http_errors.get("current", 0) / http_requests.get("current", 1)) * 100
            summary["http.error_rate"] = {
                "type": "calculated",
                "current": error_rate
            }
        
        # 缓存命中率
        cache_hits = summary.get("cache.hits", {})
        cache_misses = summary.get("cache.misses", {})
        
        total_cache_requests = cache_hits.get("current", 0) + cache_misses.get("current", 0)
        if total_cache_requests > 0:
            hit_rate = (cache_hits.get("current", 0) / total_cache_requests) * 100
            summary["cache.hit_rate"] = {
                "type": "calculated",
                "current": hit_rate
            }
        
        return summary

# 全局业务指标收集器
business_metrics = BusinessMetrics()

def setup_system_metrics():
    """设置系统指标收集器"""
    def collect_system_metrics():
        """收集系统指标"""
        try:
            import psutil
            
            # CPU使用率
            cpu_percent = psutil.cpu_percent()
            metrics_registry.set_gauge("system.cpu.usage", cpu_percent)
            
            # 内存使用
            memory = psutil.virtual_memory()
            metrics_registry.set_gauge("system.memory.usage", memory.percent)
            metrics_registry.set_gauge("system.memory.available", memory.available)
            
            # 磁盘使用
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            metrics_registry.set_gauge("system.disk.usage", disk_percent)
            
        except ImportError:
            # psutil未安装，跳过系统指标收集
            pass
        except Exception as e:
            logger.error(f"Failed to collect system metrics: {e}")
    
    metrics_registry.register_collector(collect_system_metrics)

# 指标导出器
class MetricsExporter:
    """指标导出器"""
    
    def __init__(self, registry: MetricRegistry):
        self.registry = registry
    
    def export_prometheus(self) -> str:
        """导出为Prometheus格式"""
        lines = []
        metrics = self.registry.get_all_metrics()
        
        for name, metric in metrics.items():
            # 添加帮助信息
            if metric.get("description"):
                lines.append(f"# HELP {name} {metric['description']}")
            
            # 添加类型信息
            prom_type = {
                MetricType.COUNTER: "counter",
                MetricType.GAUGE: "gauge",
                MetricType.HISTOGRAM: "histogram",
                MetricType.TIMER: "histogram"
            }.get(metric["type"], "gauge")
            
            lines.append(f"# TYPE {name} {prom_type}")
            
            # 添加指标值
            lines.append(f"{name} {metric['current_value']}")
        
        return "\n".join(lines) + "\n"
    
    def export_json(self) -> str:
        """导出为JSON格式"""
        return json.dumps(self.registry.get_metrics_summary(), indent=2, default=str)

# 导出器实例
metrics_exporter = MetricsExporter(metrics_registry)