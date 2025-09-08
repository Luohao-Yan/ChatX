"""
知识图谱API端点
提供知识图谱、组织机构、部门管理的REST API
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse

from app.application.services.knowledge_service import (
    knowledge_service, organization_service, department_service
)
from app.schemas.knowledge_schemas import (
    # 知识图谱相关
    KnowledgeNode, KnowledgeNodeCreate, KnowledgeNodeUpdate,
    KnowledgeLink, KnowledgeLinkCreate,
    KnowledgeGraphData, KnowledgeGraphRequest, KnowledgeGraphResponse,
    KnowledgeSearchRequest, KnowledgeSearchResponse,
    NodeRelationsRequest, NodeRelationsResponse,
    KnowledgeGraphStats, KnowledgeNodeType,
    
    # 组织机构相关
    Organization, OrganizationCreate, OrganizationUpdate,
    
    # 部门相关
    Department, DepartmentCreate, DepartmentUpdate, DepartmentStats
)
from app.utils.deps import get_current_active_user
from app.models.user_models import User

router = APIRouter()

# ==================== 知识图谱API ====================

@router.get("/graph", response_model=KnowledgeGraphResponse, summary="获取知识图谱")
async def get_knowledge_graph(
    node_types: Optional[List[KnowledgeNodeType]] = Query(None, description="节点类型筛选"),
    search_query: Optional[str] = Query(None, description="搜索关键词"),
    limit: Optional[int] = Query(100, description="返回数量限制", ge=1, le=1000)
    # 暂时移除权限验证以便调试
    # current_user: User = Depends(get_current_active_user)
):
    """获取知识图谱数据"""
    try:
        request = KnowledgeGraphRequest(
            node_types=node_types,
            search_query=search_query,
            limit=limit
        )
        
        # 使用默认租户ID进行测试
        tenant_id = "default-tenant"
        graph_data = knowledge_service.get_graph(tenant_id, request)
        
        return KnowledgeGraphResponse(
            data=graph_data,
            total=len(graph_data.nodes),
            page=1,
            page_size=limit
        )
    except Exception as e:
        import traceback
        print(f"Knowledge Graph API Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"获取知识图谱失败: {str(e)}")


@router.get("/graph/search", response_model=KnowledgeSearchResponse, summary="搜索知识节点")
async def search_knowledge_nodes(
    query: str = Query(..., description="搜索关键词", min_length=1),
    node_types: Optional[List[KnowledgeNodeType]] = Query(None, description="节点类型筛选"),
    limit: Optional[int] = Query(50, description="返回数量限制", ge=1, le=100),
    current_user: User = Depends(get_current_active_user)
):
    """搜索知识节点"""
    try:
        request = KnowledgeSearchRequest(
            query=query,
            node_types=node_types,
            limit=limit
        )
        
        nodes = knowledge_service.search_nodes(current_user.current_tenant_id, request)
        
        return KnowledgeSearchResponse(
            nodes=nodes,
            total=len(nodes)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"搜索知识节点失败: {str(e)}")


@router.get("/graph/nodes/{node_id}/relations", response_model=NodeRelationsResponse, 
           summary="获取节点关系")
async def get_node_relations(
    node_id: str,
    depth: Optional[int] = Query(1, description="关系深度", ge=1, le=3),
    current_user: User = Depends(get_current_active_user)
):
    """获取节点关系网络"""
    try:
        request = NodeRelationsRequest(node_id=node_id, depth=depth)
        result = knowledge_service.get_node_relations(current_user.current_tenant_id, request)
        
        if not result["center_node"]:
            raise HTTPException(status_code=404, detail="节点不存在")
        
        return NodeRelationsResponse(
            center_node=result["center_node"],
            related_data=result["related_data"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取节点关系失败: {str(e)}")


@router.get("/graph/stats", response_model=KnowledgeGraphStats, summary="获取图谱统计")
async def get_graph_stats(
    current_user: User = Depends(get_current_active_user)
):
    """获取知识图谱统计信息"""
    try:
        return knowledge_service.get_stats(current_user.current_tenant_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")


@router.post("/nodes", response_model=KnowledgeNode, summary="创建知识节点", 
            status_code=201)
async def create_knowledge_node(
    node_data: KnowledgeNodeCreate,
    current_user: User = Depends(get_current_active_user)
):
    """创建知识节点"""
    try:
        return knowledge_service.create_node(current_user.current_tenant_id, node_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建知识节点失败: {str(e)}")


@router.put("/nodes/{node_id}", response_model=KnowledgeNode, summary="更新知识节点")
async def update_knowledge_node(
    node_id: str,
    update_data: KnowledgeNodeUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """更新知识节点"""
    try:
        updated_node = knowledge_service.update_node(
            current_user.current_tenant_id, node_id, update_data
        )
        if not updated_node:
            raise HTTPException(status_code=404, detail="节点不存在")
        return updated_node
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新知识节点失败: {str(e)}")


@router.delete("/nodes/{node_id}", summary="删除知识节点")
async def delete_knowledge_node(
    node_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """删除知识节点"""
    try:
        success = knowledge_service.delete_node(current_user.current_tenant_id, node_id)
        if not success:
            raise HTTPException(status_code=404, detail="节点不存在")
        return JSONResponse(content={"message": "节点删除成功"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除知识节点失败: {str(e)}")


@router.post("/relationships", response_model=KnowledgeLink, summary="创建知识关系", 
            status_code=201)
async def create_knowledge_relationship(
    link_data: KnowledgeLinkCreate,
    current_user: User = Depends(get_current_active_user)
):
    """创建知识关系"""
    try:
        return knowledge_service.create_relationship(current_user.current_tenant_id, link_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建知识关系失败: {str(e)}")


# ==================== 组织机构API ====================

@router.get("/organizations", response_model=List[Organization], summary="获取组织机构列表")
async def get_organizations(
    current_user: User = Depends(get_current_active_user)
):
    """获取组织机构列表"""
    try:
        return organization_service.get_organizations(current_user.current_tenant_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取组织列表失败: {str(e)}")


@router.get("/organizations/tree", response_model=List[Organization], 
           summary="获取组织机构树")
async def get_organizations_tree(
    current_user: User = Depends(get_current_active_user)
):
    """获取组织机构树形结构"""
    try:
        organizations = organization_service.get_organizations(current_user.current_tenant_id)
        # 构建树形结构（简化版本，实际可能需要更复杂的逻辑）
        return organizations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取组织树失败: {str(e)}")


@router.post("/organizations", response_model=Organization, summary="创建组织机构", 
            status_code=201)
async def create_organization(
    org_data: OrganizationCreate,
    current_user: User = Depends(get_current_active_user)
):
    """创建组织机构"""
    try:
        return organization_service.create_organization(current_user.current_tenant_id, org_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建组织失败: {str(e)}")


@router.put("/organizations/{org_id}", response_model=Organization, 
           summary="更新组织机构")
async def update_organization(
    org_id: str,
    update_data: OrganizationUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """更新组织机构"""
    # 这里简化处理，实际需要实现更新逻辑
    raise HTTPException(status_code=501, detail="功能开发中")


@router.delete("/organizations/{org_id}", summary="删除组织机构")
async def delete_organization(
    org_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """删除组织机构"""
    try:
        success = knowledge_service.delete_node(current_user.current_tenant_id, org_id)
        if not success:
            raise HTTPException(status_code=404, detail="组织不存在")
        return JSONResponse(content={"message": "组织删除成功"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除组织失败: {str(e)}")


@router.get("/organizations/{org_id}", response_model=Organization, 
           summary="获取组织详情")
async def get_organization(
    org_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """获取组织机构详情"""
    # 这里简化处理，实际需要实现详情查询逻辑
    raise HTTPException(status_code=501, detail="功能开发中")


# ==================== 部门管理API ====================

@router.get("/departments", response_model=List[Department], summary="获取部门列表")
async def get_departments(
    organization_id: Optional[str] = Query(None, description="组织ID筛选"),
    current_user: User = Depends(get_current_active_user)
):
    """获取部门列表"""
    try:
        return department_service.get_departments(current_user.current_tenant_id, organization_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取部门列表失败: {str(e)}")


@router.get("/departments/tree", response_model=List[Department], summary="获取部门树")
async def get_departments_tree(
    organization_id: Optional[str] = Query(None, description="组织ID筛选"),
    current_user: User = Depends(get_current_active_user)
):
    """获取部门树形结构"""
    try:
        departments = department_service.get_departments(current_user.current_tenant_id, organization_id)
        return departments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取部门树失败: {str(e)}")


@router.post("/departments", response_model=Department, summary="创建部门", 
            status_code=201)
async def create_department(
    dept_data: DepartmentCreate,
    current_user: User = Depends(get_current_active_user)
):
    """创建部门"""
    try:
        return department_service.create_department(current_user.current_tenant_id, dept_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建部门失败: {str(e)}")


@router.put("/departments/{dept_id}", response_model=Department, summary="更新部门")
async def update_department(
    dept_id: str,
    update_data: DepartmentUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """更新部门"""
    # 这里简化处理，实际需要实现更新逻辑
    raise HTTPException(status_code=501, detail="功能开发中")


@router.delete("/departments/{dept_id}", summary="删除部门")
async def delete_department(
    dept_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """删除部门"""
    try:
        success = knowledge_service.delete_node(current_user.current_tenant_id, dept_id)
        if not success:
            raise HTTPException(status_code=404, detail="部门不存在")
        return JSONResponse(content={"message": "部门删除成功"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除部门失败: {str(e)}")


@router.get("/departments/{dept_id}", response_model=Department, summary="获取部门详情")
async def get_department(
    dept_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """获取部门详情"""
    # 这里简化处理，实际需要实现详情查询逻辑
    raise HTTPException(status_code=501, detail="功能开发中")


@router.get("/departments/{dept_id}/stats", response_model=DepartmentStats, 
           summary="获取部门统计")
async def get_department_stats(
    dept_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """获取部门统计信息"""
    try:
        return department_service.get_department_stats(current_user.current_tenant_id, dept_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取部门统计失败: {str(e)}")