"""
知识图谱服务层
基于Neo4j实现知识图谱的业务逻辑
"""

import uuid
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime
import neo4j.time

from app.infrastructure.clients.neo4j_client import get_neo4j
from app.schemas.knowledge_schemas import (
    KnowledgeNode, KnowledgeNodeCreate, KnowledgeNodeUpdate,
    KnowledgeLink, KnowledgeLinkCreate,
    KnowledgeGraphData, KnowledgeGraphRequest,
    KnowledgeSearchRequest, NodeRelationsRequest,
    KnowledgeGraphStats, NodeTypeStats,
    Organization, OrganizationCreate, OrganizationUpdate,
    Department, DepartmentCreate, DepartmentUpdate, DepartmentStats
)

logger = logging.getLogger(__name__)


class KnowledgeGraphService:
    """知识图谱服务"""
    
    def __init__(self):
        self.neo4j = get_neo4j()
    
    def create_node(self, tenant_id: str, node_data: KnowledgeNodeCreate) -> KnowledgeNode:
        """创建知识节点"""
        node_id = str(uuid.uuid4())
        
        success = self.neo4j.create_knowledge_node(
            node_id=node_id,
            node_type=node_data.type.value,
            name=node_data.name,
            description=node_data.description,
            properties=node_data.properties,
            tenant_id=tenant_id
        )
        
        if not success:
            raise Exception("创建知识节点失败")
        
        # 返回创建的节点
        return KnowledgeNode(
            id=node_id,
            name=node_data.name,
            type=node_data.type,
            description=node_data.description,
            properties=node_data.properties,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    
    def update_node(self, tenant_id: str, node_id: str, 
                   update_data: KnowledgeNodeUpdate) -> Optional[KnowledgeNode]:
        """更新知识节点"""
        success = self.neo4j.update_knowledge_node(
            node_id=node_id,
            tenant_id=tenant_id,
            name=update_data.name,
            description=update_data.description,
            properties=update_data.properties
        )
        
        if not success:
            return None
        
        # 获取更新后的节点信息
        nodes = self.neo4j.search_knowledge_nodes(
            tenant_id=tenant_id,
            query="",
            limit=1
        )
        
        if not nodes:
            return None
        
        node_data = nodes[0]
        return self._convert_node_dict_to_model(node_data)
    
    def delete_node(self, tenant_id: str, node_id: str) -> bool:
        """删除知识节点"""
        return self.neo4j.delete_knowledge_node(node_id, tenant_id)
    
    def create_relationship(self, tenant_id: str, 
                          link_data: KnowledgeLinkCreate) -> KnowledgeLink:
        """创建知识关系"""
        success = self.neo4j.create_knowledge_relationship(
            source_id=link_data.source,
            target_id=link_data.target,
            relationship_type=link_data.type.value,
            weight=link_data.weight or 1.0,
            properties=link_data.properties,
            tenant_id=tenant_id
        )
        
        if not success:
            raise Exception("创建知识关系失败")
        
        return KnowledgeLink(
            source=link_data.source,
            target=link_data.target,
            type=link_data.type,
            weight=link_data.weight,
            properties=link_data.properties,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    
    def get_graph(self, tenant_id: str, 
                  request: KnowledgeGraphRequest) -> KnowledgeGraphData:
        """获取知识图谱数据"""
        node_types = None
        if request.node_types:
            node_types = [nt.value for nt in request.node_types]
        
        raw_data = self.neo4j.get_knowledge_graph(
            tenant_id=tenant_id,
            node_types=node_types,
            limit=request.limit or 100
        )
        
        # 转换数据格式
        nodes = [self._convert_node_dict_to_model(node) for node in raw_data.get("nodes", [])]
        links = [self._convert_link_dict_to_model(link) for link in raw_data.get("links", [])]
        
        return KnowledgeGraphData(nodes=nodes, links=links)
    
    def search_nodes(self, tenant_id: str, 
                    request: KnowledgeSearchRequest) -> List[KnowledgeNode]:
        """搜索知识节点"""
        node_types = None
        if request.node_types:
            node_types = [nt.value for nt in request.node_types]
        
        raw_nodes = self.neo4j.search_knowledge_nodes(
            tenant_id=tenant_id,
            query=request.query,
            node_types=node_types,
            limit=request.limit or 50
        )
        
        return [self._convert_node_dict_to_model(node) for node in raw_nodes]
    
    def get_node_relations(self, tenant_id: str, 
                          request: NodeRelationsRequest) -> Dict[str, Any]:
        """获取节点关系"""
        raw_data = self.neo4j.get_node_relations(
            node_id=request.node_id,
            tenant_id=tenant_id,
            depth=request.depth or 1
        )
        
        nodes = [self._convert_node_dict_to_model(node) for node in raw_data.get("nodes", [])]
        links = [self._convert_link_dict_to_model(link) for link in raw_data.get("links", [])]
        
        # 找到中心节点
        center_node = None
        for node in nodes:
            if node.id == request.node_id:
                center_node = node
                break
        
        return {
            "center_node": center_node,
            "related_data": KnowledgeGraphData(nodes=nodes, links=links)
        }
    
    def get_stats(self, tenant_id: str) -> KnowledgeGraphStats:
        """获取知识图谱统计信息"""
        raw_stats = self.neo4j.get_knowledge_graph_stats(tenant_id)
        
        node_types = []
        for type_stat in raw_stats.get("node_types", []):
            node_types.append(NodeTypeStats(
                type=type_stat.get("type", "unknown"),
                count=type_stat.get("count", 0)
            ))
        
        return KnowledgeGraphStats(
            total_nodes=raw_stats.get("total_nodes", 0),
            total_links=raw_stats.get("total_links", 0),
            node_types=node_types
        )
    
    def _convert_neo4j_datetime(self, value: Any) -> Optional[datetime]:
        """转换Neo4j时间类型为Python datetime"""
        if value is None:
            return None
        
        if isinstance(value, neo4j.time.DateTime):
            return value.to_native()
        elif isinstance(value, datetime):
            return value
        
        return None
    
    def _convert_node_dict_to_model(self, node_dict: Dict[str, Any]) -> KnowledgeNode:
        """将Neo4j返回的节点字典转换为模型"""
        properties = node_dict.get("properties", {})
        
        # 提取基础字段
        base_fields = {
            "id", "name", "type", "description", "tenant_id", 
            "created_at", "updated_at"
        }
        
        # 分离属性和基础字段
        node_properties = {}
        for key, value in properties.items():
            if key not in base_fields:
                node_properties[key] = value
        
        return KnowledgeNode(
            id=node_dict.get("id"),
            name=node_dict.get("name"),
            type=node_dict.get("type"),
            description=node_dict.get("description"),
            properties=node_properties if node_properties else None,
            created_at=self._convert_neo4j_datetime(properties.get("created_at")),
            updated_at=self._convert_neo4j_datetime(properties.get("updated_at"))
        )
    
    def _convert_link_dict_to_model(self, link_dict: Dict[str, Any]) -> KnowledgeLink:
        """将Neo4j返回的关系字典转换为模型"""
        properties = link_dict.get("properties", {})
        
        # 提取基础字段
        base_fields = {
            "type", "weight", "tenant_id", "created_at", "updated_at"
        }
        
        # 分离属性和基础字段
        link_properties = {}
        for key, value in properties.items():
            if key not in base_fields:
                link_properties[key] = value
        
        return KnowledgeLink(
            source=link_dict.get("source"),
            target=link_dict.get("target"),
            type=link_dict.get("type"),
            weight=link_dict.get("weight", 1.0),
            properties=link_properties if link_properties else None,
            created_at=self._convert_neo4j_datetime(properties.get("created_at")),
            updated_at=self._convert_neo4j_datetime(properties.get("updated_at"))
        )


class OrganizationService:
    """组织机构服务"""
    
    def __init__(self):
        self.neo4j = get_neo4j()
    
    def create_organization(self, tenant_id: str, 
                          org_data: OrganizationCreate) -> Organization:
        """创建组织机构"""
        org_id = str(uuid.uuid4())
        
        # 创建组织节点
        properties = {
            "organization_type": org_data.type.value,
            "parent_id": org_data.parent_id
        }
        
        success = self.neo4j.create_knowledge_node(
            node_id=org_id,
            node_type="organization",
            name=org_data.name,
            description=org_data.description,
            properties=properties,
            tenant_id=tenant_id
        )
        
        if not success:
            raise Exception("创建组织机构失败")
        
        # 如果有父组织，创建关系
        if org_data.parent_id:
            self.neo4j.create_knowledge_relationship(
                source_id=org_id,
                target_id=org_data.parent_id,
                relationship_type="part_of",
                tenant_id=tenant_id
            )
        
        return Organization(
            id=org_id,
            name=org_data.name,
            description=org_data.description,
            type=org_data.type,
            parent_id=org_data.parent_id,
            children=[],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    
    def get_organizations(self, tenant_id: str) -> List[Organization]:
        """获取组织机构列表"""
        # 搜索所有组织类型节点
        org_nodes = self.neo4j.search_knowledge_nodes(
            tenant_id=tenant_id,
            query="",
            node_types=["organization"],
            limit=1000
        )
        
        return [self._convert_org_dict_to_model(org) for org in org_nodes]
    
    def _convert_org_dict_to_model(self, org_dict: Dict[str, Any]) -> Organization:
        """转换组织字典为模型"""
        properties = org_dict.get("properties", {})
        
        return Organization(
            id=org_dict.get("id"),
            name=org_dict.get("name"),
            description=org_dict.get("description"),
            type=properties.get("organization_type", "company"),
            parent_id=properties.get("parent_id"),
            children=[],
            created_at=properties.get("created_at", datetime.utcnow()),
            updated_at=properties.get("updated_at", datetime.utcnow())
        )


class DepartmentService:
    """部门服务"""
    
    def __init__(self):
        self.neo4j = get_neo4j()
    
    def create_department(self, tenant_id: str, 
                         dept_data: DepartmentCreate) -> Department:
        """创建部门"""
        dept_id = str(uuid.uuid4())
        
        properties = {
            "organization_id": dept_data.organization_id,
            "parent_id": dept_data.parent_id,
            "manager_id": dept_data.manager_id,
            "member_count": 0
        }
        
        success = self.neo4j.create_knowledge_node(
            node_id=dept_id,
            node_type="department",
            name=dept_data.name,
            description=dept_data.description,
            properties=properties,
            tenant_id=tenant_id
        )
        
        if not success:
            raise Exception("创建部门失败")
        
        # 创建与组织的关系
        self.neo4j.create_knowledge_relationship(
            source_id=dept_id,
            target_id=dept_data.organization_id,
            relationship_type="belongs_to",
            tenant_id=tenant_id
        )
        
        # 如果有父部门，创建关系
        if dept_data.parent_id:
            self.neo4j.create_knowledge_relationship(
                source_id=dept_id,
                target_id=dept_data.parent_id,
                relationship_type="part_of",
                tenant_id=tenant_id
            )
        
        return Department(
            id=dept_id,
            name=dept_data.name,
            description=dept_data.description,
            organization_id=dept_data.organization_id,
            parent_id=dept_data.parent_id,
            manager_id=dept_data.manager_id,
            member_count=0,
            children=[],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
    
    def get_departments(self, tenant_id: str, 
                       organization_id: Optional[str] = None) -> List[Department]:
        """获取部门列表"""
        dept_nodes = self.neo4j.search_knowledge_nodes(
            tenant_id=tenant_id,
            query="",
            node_types=["department"],
            limit=1000
        )
        
        departments = []
        for dept in dept_nodes:
            properties = dept.get("properties", {})
            if organization_id and properties.get("organization_id") != organization_id:
                continue
            departments.append(self._convert_dept_dict_to_model(dept))
        
        return departments
    
    def get_department_stats(self, tenant_id: str, dept_id: str) -> DepartmentStats:
        """获取部门统计信息"""
        # 这里可以扩展更复杂的统计逻辑
        return DepartmentStats(
            member_count=0,
            sub_departments=0,
            active_projects=0
        )
    
    def _convert_dept_dict_to_model(self, dept_dict: Dict[str, Any]) -> Department:
        """转换部门字典为模型"""
        properties = dept_dict.get("properties", {})
        
        return Department(
            id=dept_dict.get("id"),
            name=dept_dict.get("name"),
            description=dept_dict.get("description"),
            organization_id=properties.get("organization_id"),
            parent_id=properties.get("parent_id"),
            manager_id=properties.get("manager_id"),
            member_count=properties.get("member_count", 0),
            children=[],
            created_at=properties.get("created_at", datetime.utcnow()),
            updated_at=properties.get("updated_at", datetime.utcnow())
        )


# 服务实例
knowledge_service = KnowledgeGraphService()
organization_service = OrganizationService()
department_service = DepartmentService()