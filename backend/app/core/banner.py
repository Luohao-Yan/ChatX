"""
应用启动横幅和信息显示
"""

import os
import sys
from datetime import datetime
from app.core.config import settings

def get_chatx_banner():
    """获取ChatX应用横幅"""
    banner = """
 ██████╗██╗  ██╗ █████╗ ████████╗██╗  ██╗
██╔════╝██║  ██║██╔══██╗╚══██╔══╝╚██╗██╔╝
██║     ███████║███████║   ██║    ╚███╔╝ 
██║     ██╔══██║██╔══██║   ██║    ██╔██╗ 
╚██████╗██║  ██║██║  ██║   ██║   ██╔╝ ██╗
 ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝
"""
    return banner

def get_system_info():
    """获取系统信息"""
    return {
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "platform": sys.platform,
        "environment": settings.ENVIRONMENT,
        "debug_mode": settings.DEBUG,
        "database_url": settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else "配置中",
        "redis_url": settings.REDIS_URL,
        "start_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "pid": os.getpid(),
    }

def print_startup_banner():
    """打印启动横幅"""
    banner = get_chatx_banner()
    info = get_system_info()
    
    # 彩色输出函数
    def colored(text, color_code):
        return f"\033[{color_code}m{text}\033[0m"
    
    # 颜色定义
    BLUE = "34"
    GREEN = "32"
    YELLOW = "33"
    CYAN = "36"
    MAGENTA = "35"
    WHITE = "37"
    BOLD = "1"
    
    print(colored(banner, f"{BOLD};{CYAN}"))
    
    print(colored("=" * 60, BLUE))
    print(colored("🚀 ChatX - 智能文档处理与知识管理平台", f"{BOLD};{WHITE}"))
    print(colored("=" * 60, BLUE))
    
    # 系统信息
    print(colored("📋 系统信息:", f"{BOLD};{YELLOW}"))
    print(f"   🐍 Python: {colored(info['python_version'], GREEN)}")
    print(f"   💻 平台: {colored(info['platform'], GREEN)}")
    print(f"   🌍 环境: {colored(info['environment'].upper(), MAGENTA)}")
    print(f"   🐛 调试模式: {colored('开启' if info['debug_mode'] else '关闭', GREEN if not info['debug_mode'] else YELLOW)}")
    print(f"   🕐 启动时间: {colored(info['start_time'], CYAN)}")
    print(f"   🔢 进程ID: {colored(str(info['pid']), CYAN)}")
    
    # 服务配置
    print(colored("\n⚙️  服务配置:", f"{BOLD};{YELLOW}"))
    print(f"   🗄️  数据库: {colored(info['database_url'], GREEN)}")
    print(f"   🔴 Redis: {colored(info['redis_url'], GREEN)}")
    
    # 功能特性
    print(colored("\n✨ 核心功能:", f"{BOLD};{YELLOW}"))
    print(f"   👥 用户认证与权限管理 (RBAC)")
    print(f"   📁 文件上传与管理 (MinIO)")
    print(f"   🔍 向量搜索与检索 (Weaviate)")
    print(f"   🕸️  知识图谱构建 (Neo4j)")
    print(f"   ⚡ 异步任务处理 (Celery)")
    print(f"   🌐 多租户架构支持")
    
    # API信息
    print(colored("\n🌐 API 服务:", f"{BOLD};{YELLOW}"))
    print(f"   📚 API文档: {colored('http://localhost:8000/docs', CYAN)}")
    print(f"   🔧 健康检查: {colored('http://localhost:8000/health', CYAN)}")
    print(f"   📊 系统监控: {colored('http://localhost:8000/metrics', CYAN)}")
    
    # 提示信息
    print(colored("\n💡 快速开始:", f"{BOLD};{YELLOW}"))
    print(f"   1. 📖 查看API文档了解接口使用方法")
    print(f"   2. 🔐 使用 {colored('python init_rbac.py', CYAN)} 初始化权限系统")
    print(f"   3. 🧪 运行 {colored('python test_auth.py', CYAN)} 测试用户认证")
    print(f"   4. 🧪 运行 {colored('python test_rbac.py', CYAN)} 测试权限系统")
    print(f"   5. ❓ 使用 {colored('/help', CYAN)} 获取更多帮助信息")
    
    # 根据环境显示不同的警告
    if info['environment'].lower() == 'production':
        print(colored(f"\n🔒 生产环境提醒:", f"{BOLD};{MAGENTA}"))
        print(colored(f"   • 确保所有敏感配置已正确设置", YELLOW))
        print(colored(f"   • 建议关闭调试模式", YELLOW))
        print(colored(f"   • 定期备份数据库和文件", YELLOW))
        print(colored(f"   • 监控系统性能和日志", YELLOW))
    else:
        print(colored(f"\n🛠️  开发环境提醒:", f"{BOLD};{GREEN}"))
        print(colored(f"   • 当前为开发环境，某些安全限制可能较宽松", CYAN))
        print(colored(f"   • 代码变更会自动重载", CYAN))
        print(colored(f"   • 可以使用调试工具和详细日志", CYAN))
    
    print(colored("=" * 60, BLUE))
    print(colored("🎉 ChatX 启动完成，准备接收请求!", f"{BOLD};{GREEN}"))
    print(colored("=" * 60, BLUE))
    print()  # 空行

def print_shutdown_banner():
    """打印关闭横幅"""
    def colored(text, color_code):
        return f"\033[{color_code}m{text}\033[0m"
    
    YELLOW = "33"
    BLUE = "34"
    BOLD = "1"
    
    shutdown_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    print()
    print(colored("=" * 60, BLUE))
    print(colored("👋 ChatX 正在关闭...", f"{BOLD};{YELLOW}"))
    print(f"   🕐 关闭时间: {colored(shutdown_time, YELLOW)}")
    print(f"   💾 正在保存数据和清理资源...")
    print(colored("=" * 60, BLUE))
    print(colored("✅ ChatX 已安全关闭，感谢使用!", f"{BOLD};{YELLOW}"))
    print(colored("=" * 60, BLUE))
    print()