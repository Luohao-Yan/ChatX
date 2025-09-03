"""
知识图谱初始数据创建脚本
用于创建测试数据，验证知识图谱功能
"""

import asyncio
import uuid
from datetime import datetime

from app.infrastructure.clients.neo4j_client import get_neo4j


async def init_knowledge_data():
    """初始化知识图谱测试数据"""
    neo4j = get_neo4j()
    
    # 默认租户ID（你可以根据实际情况修改）
    tenant_id = "default_tenant"
    
    print("开始创建知识图谱测试数据...")
    
    # 创建文档节点
    documents = [
        {
            "id": "doc_1",
            "name": "React开发指南",
            "type": "document",
            "description": "完整的React开发教程文档",
            "properties": {
                "author": "张三",
                "fileSize": "2.3MB",
                "format": "PDF"
            }
        },
        {
            "id": "doc_2",
            "name": "知识管理系统设计",
            "type": "document",
            "description": "系统架构设计文档",
            "properties": {
                "author": "李四",
                "fileSize": "1.8MB",
                "format": "DOCX"
            }
        },
        {
            "id": "doc_3",
            "name": "Neo4j图数据库指南",
            "type": "document",
            "description": "Neo4j数据库使用教程",
            "properties": {
                "author": "王五",
                "fileSize": "3.1MB",
                "format": "PDF"
            }
        }
    ]
    
    # 创建概念节点
    concepts = [
        {
            "id": "concept_1",
            "name": "知识图谱",
            "type": "concept",
            "description": "用于表示知识的语义网络",
            "properties": {
                "definition": "知识图谱本质上是语义网络，是一种基于图的数据结构"
            }
        },
        {
            "id": "concept_2",
            "name": "数据可视化",
            "type": "concept", 
            "description": "将数据转换为图形表示的技术",
            "properties": {
                "definition": "通过图表、图形等视觉元素展示数据和信息"
            }
        },
        {
            "id": "concept_3",
            "name": "图数据库",
            "type": "concept",
            "description": "以图结构存储数据的数据库",
            "properties": {
                "definition": "使用图论来存储、映射和查询关系的数据库"
            }
        }
    ]
    
    # 创建人员节点
    persons = [
        {
            "id": "person_1",
            "name": "张三",
            "type": "person",
            "description": "前端开发工程师",
            "properties": {
                "role": "高级前端工程师",
                "department": "技术部",
                "email": "zhangsan@company.com"
            }
        },
        {
            "id": "person_2", 
            "name": "李四",
            "type": "person",
            "description": "系统架构师",
            "properties": {
                "role": "系统架构师",
                "department": "技术部",
                "email": "lisi@company.com"
            }
        }
    ]
    
    # 创建组织节点
    organizations = [
        {
            "id": "org_1",
            "name": "技术有限公司",
            "type": "organization",
            "description": "科技创新企业",
            "properties": {
                "organization_type": "company",
                "founded": "2020",
                "industry": "软件开发"
            }
        }
    ]
    
    # 创建部门节点
    departments = [
        {
            "id": "dept_1",
            "name": "技术部",
            "type": "department",
            "description": "负责技术研发的部门",
            "properties": {
                "organization_id": "org_1",
                "headCount": 25,
                "manager": "李四",
                "budget": "500万"
            }
        },
        {
            "id": "dept_2",
            "name": "产品部",
            "type": "department", 
            "description": "产品策划与管理部门",
            "properties": {
                "organization_id": "org_1",
                "headCount": 15,
                "manager": "王五",
                "budget": "200万"
            }
        }
    ]
    
    # 创建标签节点
    tags = [
        {
            "id": "tag_1",
            "name": "React",
            "type": "tag",
            "description": "React框架相关内容",
            "properties": {
                "color": "#61dafb",
                "usageCount": 45
            }
        },
        {
            "id": "tag_2",
            "name": "Neo4j",
            "type": "tag",
            "description": "Neo4j数据库相关内容",
            "properties": {
                "color": "#00bcd4",
                "usageCount": 23
            }
        }
    ]
    
    # 创建所有节点
    all_nodes = documents + concepts + persons + organizations + departments + tags
    
    for node in all_nodes:
        success = neo4j.create_knowledge_node(
            node_id=node["id"],
            node_type=node["type"],
            name=node["name"],
            description=node.get("description"),
            properties=node.get("properties"),
            tenant_id=tenant_id
        )
        if success:
            print(f"✓ 创建节点: {node['name']} ({node['type']})")
        else:
            print(f"✗ 创建节点失败: {node['name']}")
    
    # 创建关系
    relationships = [
        # 文档与概念的关系
        {"source": "doc_1", "target": "concept_2", "type": "related_to", "weight": 0.8},
        {"source": "doc_2", "target": "concept_1", "type": "contains", "weight": 0.9},
        {"source": "doc_3", "target": "concept_3", "type": "references", "weight": 0.95},
        
        # 文档与作者的关系
        {"source": "doc_1", "target": "person_1", "type": "created_by", "weight": 1.0},
        {"source": "doc_2", "target": "person_2", "type": "created_by", "weight": 1.0},
        
        # 人员与部门的关系
        {"source": "person_1", "target": "dept_1", "type": "belongs_to", "weight": 1.0},
        {"source": "person_2", "target": "dept_1", "type": "belongs_to", "weight": 1.0},
        
        # 部门与组织的关系
        {"source": "dept_1", "target": "org_1", "type": "part_of", "weight": 1.0},
        {"source": "dept_2", "target": "org_1", "type": "part_of", "weight": 1.0},
        
        # 文档与标签的关系
        {"source": "doc_1", "target": "tag_1", "type": "tagged_with", "weight": 0.9},
        {"source": "doc_3", "target": "tag_2", "type": "tagged_with", "weight": 0.95},
        
        # 概念之间的关系
        {"source": "concept_1", "target": "concept_3", "type": "related_to", "weight": 0.9},
        {"source": "concept_1", "target": "concept_2", "type": "contains", "weight": 0.7},
    ]
    
    for rel in relationships:
        success = neo4j.create_knowledge_relationship(
            source_id=rel["source"],
            target_id=rel["target"],
            relationship_type=rel["type"],
            weight=rel.get("weight", 1.0),
            tenant_id=tenant_id
        )
        if success:
            print(f"✓ 创建关系: {rel['source']} -> {rel['target']} ({rel['type']})")
        else:
            print(f"✗ 创建关系失败: {rel['source']} -> {rel['target']}")
    
    print("\n知识图谱测试数据创建完成！")
    print(f"创建了 {len(all_nodes)} 个节点和 {len(relationships)} 个关系")
    
    # 获取统计信息验证
    stats = neo4j.get_knowledge_graph_stats(tenant_id)
    print(f"\n数据库统计:")
    print(f"- 总节点数: {stats.get('total_nodes', 0)}")
    print(f"- 总关系数: {stats.get('total_links', 0)}")
    print(f"- 节点类型: {len(stats.get('node_types', []))}")


if __name__ == "__main__":
    asyncio.run(init_knowledge_data())