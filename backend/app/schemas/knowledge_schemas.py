"""
知识图谱相关的API Schema定义
与前端保持一致的数据结构
"""

from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime


class KnowledgeNodeType(str, Enum):
    """知识节点类型枚举"""
    DOCUMENT = "document"
    CONCEPT = "concept"
    PERSON = "person"
    ORGANIZATION = "organization"
    DEPARTMENT = "department"
    TOPIC = "topic"
    TAG = "tag"
    WEBSITE = "website"
    WECHAT_ARTICLE = "wechat_article"


class KnowledgeLinkType(str, Enum):
    """知识关系类型枚举"""
    RELATED_TO = "related_to"
    BELONGS_TO = "belongs_to"
    CONTAINS = "contains"
    REFERENCES = "references"
    SIMILAR_TO = "similar_to"
    CREATED_BY = "created_by"
    TAGGED_WITH = "tagged_with"
    PART_OF = "part_of"


# ==================== 节点相关Schema ====================

class KnowledgeNodeBase(BaseModel):
    """知识节点基础模型"""
    name: str = Field(..., description="节点名称", min_length=1, max_length=200)
    type: KnowledgeNodeType = Field(..., description="节点类型")
    description: Optional[str] = Field(None, description="节点描述", max_length=1000)
    properties: Optional[Dict[str, Any]] = Field(None, description="节点属性")


class KnowledgeNodeCreate(KnowledgeNodeBase):
    """创建知识节点"""
    pass


class KnowledgeNodeUpdate(BaseModel):
    """更新知识节点"""
    name: Optional[str] = Field(None, description="节点名称", min_length=1, max_length=200)
    description: Optional[str] = Field(None, description="节点描述", max_length=1000)
    properties: Optional[Dict[str, Any]] = Field(None, description="节点属性")


class KnowledgeNode(KnowledgeNodeBase):
    """知识节点响应模型"""
    id: str = Field(..., description="节点ID")
    created_at: Optional[datetime] = Field(None, description="创建时间")
    updated_at: Optional[datetime] = Field(None, description="更新时间")

    class Config:
        from_attributes = True


# ==================== 关系相关Schema ====================

class KnowledgeLinkBase(BaseModel):
    """知识关系基础模型"""
    source: str = Field(..., description="源节点ID")
    target: str = Field(..., description="目标节点ID")
    type: KnowledgeLinkType = Field(..., description="关系类型")
    weight: Optional[float] = Field(1.0, description="关系权重", ge=0.0, le=1.0)
    properties: Optional[Dict[str, Any]] = Field(None, description="关系属性")


class KnowledgeLinkCreate(KnowledgeLinkBase):
    """创建知识关系"""
    pass


class KnowledgeLink(KnowledgeLinkBase):
    """知识关系响应模型"""
    created_at: Optional[datetime] = Field(None, description="创建时间")
    updated_at: Optional[datetime] = Field(None, description="更新时间")

    class Config:
        from_attributes = True


# ==================== 图谱数据Schema ====================

class KnowledgeGraphData(BaseModel):
    """知识图谱数据"""
    nodes: List[KnowledgeNode] = Field(..., description="节点列表")
    links: List[KnowledgeLink] = Field(..., description="关系列表")


class KnowledgeGraphRequest(BaseModel):
    """知识图谱查询请求"""
    node_types: Optional[List[KnowledgeNodeType]] = Field(None, description="节点类型筛选")
    search_query: Optional[str] = Field(None, description="搜索关键词", max_length=100)
    limit: Optional[int] = Field(100, description="返回数量限制", ge=1, le=1000)


class KnowledgeGraphResponse(BaseModel):
    """知识图谱查询响应"""
    data: KnowledgeGraphData = Field(..., description="图谱数据")
    total: int = Field(..., description="总数量")
    page: int = Field(1, description="当前页码")
    page_size: int = Field(100, description="页面大小")


# ==================== 搜索相关Schema ====================

class KnowledgeSearchRequest(BaseModel):
    """知识节点搜索请求"""
    query: str = Field(..., description="搜索关键词", min_length=1, max_length=100)
    node_types: Optional[List[KnowledgeNodeType]] = Field(None, description="节点类型筛选")
    limit: Optional[int] = Field(50, description="返回数量限制", ge=1, le=100)


class KnowledgeSearchResponse(BaseModel):
    """知识节点搜索响应"""
    nodes: List[KnowledgeNode] = Field(..., description="搜索结果")
    total: int = Field(..., description="总数量")


# ==================== 节点关系Schema ====================

class NodeRelationsRequest(BaseModel):
    """节点关系查询请求"""
    node_id: str = Field(..., description="节点ID")
    depth: Optional[int] = Field(1, description="关系深度", ge=1, le=3)


class NodeRelationsResponse(BaseModel):
    """节点关系查询响应"""
    center_node: KnowledgeNode = Field(..., description="中心节点")
    related_data: KnowledgeGraphData = Field(..., description="相关图谱数据")


# ==================== 统计信息Schema ====================

class NodeTypeStats(BaseModel):
    """节点类型统计"""
    type: KnowledgeNodeType = Field(..., description="节点类型")
    count: int = Field(..., description="数量")


class KnowledgeGraphStats(BaseModel):
    """知识图谱统计信息"""
    total_nodes: int = Field(..., description="总节点数")
    total_links: int = Field(..., description="总关系数")
    node_types: List[NodeTypeStats] = Field(..., description="节点类型分布")


# ==================== 组织机构Schema ====================

class OrganizationType(str, Enum):
    """组织类型枚举"""
    COMPANY = "company"
    DEPARTMENT = "department"
    TEAM = "team"
    GROUP = "group"


class OrganizationBase(BaseModel):
    """组织机构基础模型"""
    name: str = Field(..., description="组织名称", min_length=1, max_length=200)
    description: Optional[str] = Field(None, description="组织描述", max_length=1000)
    type: OrganizationType = Field(..., description="组织类型")
    parent_id: Optional[str] = Field(None, description="父组织ID")


class OrganizationCreate(OrganizationBase):
    """创建组织机构"""
    pass


class OrganizationUpdate(BaseModel):
    """更新组织机构"""
    name: Optional[str] = Field(None, description="组织名称", min_length=1, max_length=200)
    description: Optional[str] = Field(None, description="组织描述", max_length=1000)
    type: Optional[OrganizationType] = Field(None, description="组织类型")
    parent_id: Optional[str] = Field(None, description="父组织ID")


class Organization(OrganizationBase):
    """组织机构响应模型"""
    id: str = Field(..., description="组织ID")
    children: Optional[List['Organization']] = Field(None, description="子组织")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True


# ==================== 部门Schema ====================

class DepartmentBase(BaseModel):
    """部门基础模型"""
    name: str = Field(..., description="部门名称", min_length=1, max_length=200)
    description: Optional[str] = Field(None, description="部门描述", max_length=1000)
    organization_id: str = Field(..., description="所属组织ID")
    parent_id: Optional[str] = Field(None, description="父部门ID")
    manager_id: Optional[str] = Field(None, description="部门经理ID")


class DepartmentCreate(DepartmentBase):
    """创建部门"""
    pass


class DepartmentUpdate(BaseModel):
    """更新部门"""
    name: Optional[str] = Field(None, description="部门名称", min_length=1, max_length=200)
    description: Optional[str] = Field(None, description="部门描述", max_length=1000)
    parent_id: Optional[str] = Field(None, description="父部门ID")
    manager_id: Optional[str] = Field(None, description="部门经理ID")


class Department(DepartmentBase):
    """部门响应模型"""
    id: str = Field(..., description="部门ID")
    member_count: int = Field(0, description="成员数量")
    children: Optional[List['Department']] = Field(None, description="子部门")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        from_attributes = True


class DepartmentStats(BaseModel):
    """部门统计信息"""
    member_count: int = Field(..., description="成员数量")
    sub_departments: int = Field(..., description="子部门数量")
    active_projects: int = Field(0, description="活跃项目数")


# 解决循环引用问题
Organization.model_rebuild()
Department.model_rebuild()