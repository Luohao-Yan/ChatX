from typing import List
from pydantic import BaseModel, Field


class BatchUserRequest(BaseModel):
    """批量用户操作请求"""
    user_ids: List[str] = Field(..., description="用户ID列表", min_items=1, max_items=100)


class BatchOperationResponse(BaseModel):
    """批量操作响应"""
    message: str = Field(..., description="操作结果消息")
    affected_count: int = Field(..., description="影响的记录数量")
    success_ids: List[str] = Field(default_factory=list, description="成功操作的ID列表")
    failed_ids: List[str] = Field(default_factory=list, description="失败操作的ID列表")