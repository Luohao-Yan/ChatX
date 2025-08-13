"""
ChatX Enterprise API 主入口文件
简洁的应用启动入口
"""

import uvicorn
from app.application.factory import create_app

# 创建应用实例
app = create_app()

# 应用已准备就绪
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)