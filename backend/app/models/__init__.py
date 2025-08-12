# 导入所有模型确保 Alembic 可以检测到
from .user_models import *
from .org_models import *
from .tenant_models import *
from .file_models import *

# 合并所有模块的 __all__ 列表
from .user_models import __all__ as user_all
from .org_models import __all__ as org_all
from .tenant_models import __all__ as tenant_all
from .file_models import __all__ as file_all

__all__ = user_all + org_all + tenant_all + file_all