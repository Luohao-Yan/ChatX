"""
API!W
§API¶„
"""

from fastapi import APIRouter
from app.api.v1 import v1_router

# ú;APIï1
api_router = APIRouter(prefix="/api")

# +*H,„API
api_router.include_router(v1_router)

# *eïåû v2, v3IH,
# api_router.include_router(v2_router)

@api_router.get("/health")
async def health_check():
    """APIe·Àå"""
    return {
        "status": "healthy",
        "message": "ChatX API is running",
        "available_versions": ["v1"]
    }