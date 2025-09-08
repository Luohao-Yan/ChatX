#!/usr/bin/env python3
"""
知识图谱模拟数据初始化脚本
创建企业知识图谱的示例数据，包括：
- 文档节点
- 概念节点  
- 人员节点
- 组织节点
- 部门节点
- 主题节点
- 标签节点
- 网页节点
- 微信文章节点
以及它们之间的关系
"""

import logging
from datetime import datetime, timedelta
import uuid
from neo4j import GraphDatabase, ManagedTransaction
from app.infrastructure.clients.neo4j_client import Neo4jClient
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KnowledgeGraphDataInitializer:
    def __init__(self):
        """初始化Neo4j客户端"""
        self.client = Neo4jClient()
        
    def clear_all_data(self):
        """清除所有现有数据"""
        logger.info("🗑️  清除现有知识图谱数据...")
        
        try:
            # 使用客户端的run_query方法
            self.client.run_query("MATCH (n) DETACH DELETE n")
            logger.info("✅ 清除完成")
        except Exception as e:
            logger.error(f"清除数据失败: {e}")
            raise

    def create_sample_data(self):
        """创建示例知识图谱数据"""
        logger.info("🚀 开始创建知识图谱示例数据...")
        
        # 示例数据定义
        sample_data = {
            # 文档节点
            "documents": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "产品需求文档",
                    "description": "ChatX产品功能需求规格说明书",
                    "properties": {
                        "author": "产品经理",
                        "version": "v2.1",
                        "created_date": "2024-01-15",
                        "file_type": "PDF",
                        "organizationId": "org_001",
                        "departmentId": "dept_product"
                    }
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "技术架构设计",
                    "description": "系统技术架构设计方案",
                    "properties": {
                        "author": "架构师",
                        "version": "v1.3",
                        "created_date": "2024-02-01",
                        "file_type": "DOCX",
                        "organizationId": "org_001",
                        "departmentId": "dept_tech"
                    }
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "用户操作手册",
                    "description": "ChatX用户使用指南和操作说明",
                    "properties": {
                        "author": "技术文档工程师",
                        "version": "v1.0",
                        "created_date": "2024-03-01",
                        "file_type": "PDF",
                        "organizationId": "org_001",
                        "departmentId": "dept_tech"
                    }
                }
            ],
            
            # 概念节点
            "concepts": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "人工智能",
                    "description": "计算机科学的一个分支，旨在创建智能机器",
                    "properties": {
                        "category": "technology",
                        "importance": "high",
                        "organizationId": "org_001"
                    }
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "自然语言处理",
                    "description": "计算机与人类语言之间的交互技术",
                    "properties": {
                        "category": "technology", 
                        "importance": "high",
                        "organizationId": "org_001"
                    }
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "知识图谱",
                    "description": "一种表示知识的网络结构",
                    "properties": {
                        "category": "technology",
                        "importance": "medium",
                        "organizationId": "org_001"
                    }
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "用户体验",
                    "description": "用户在使用产品过程中的整体感受",
                    "properties": {
                        "category": "design",
                        "importance": "high",
                        "organizationId": "org_001"
                    }
                }
            ],
            
            # 人员节点
            "persons": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "张伟",
                    "description": "AI创新解决方案部技术总监",
                    "properties": {
                        "role": "技术总监",
                        "email": "zhangwei@company.com",
                        "expertise": ["人工智能", "自然语言处理", "系统架构"],
                        "organizationId": "org_001",
                        "departmentId": "dept_tech"
                    }
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "李娜",
                    "description": "产品策划部产品经理",
                    "properties": {
                        "role": "产品经理",
                        "email": "lina@company.com",
                        "expertise": ["产品设计", "用户研究", "需求分析"],
                        "organizationId": "org_001",
                        "departmentId": "dept_product"
                    }
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "王强",
                    "description": "研发中心高级工程师",
                    "properties": {
                        "role": "高级工程师",
                        "email": "wangqiang@company.com",
                        "expertise": ["Python开发", "后端架构", "数据库设计"],
                        "organizationId": "org_001",
                        "departmentId": "dept_dev"
                    }
                }
            ],
            
            # 组织节点
            "organizations": [
                {
                    "id": "org_001",
                    "name": "AI创新解决方案部",
                    "description": "专注于人工智能技术研发和产品创新的事业部",
                    "properties": {
                        "type": "business_unit",
                        "founded_date": "2023-01-01",
                        "employee_count": 150,
                        "location": "北京"
                    }
                }
            ],
            
            # 部门节点
            "departments": [
                {
                    "id": "dept_tech",
                    "name": "技术部",
                    "description": "负责系统架构设计和核心技术研发",
                    "properties": {
                        "manager": "张伟",
                        "employee_count": 45,
                        "organizationId": "org_001"
                    }
                },
                {
                    "id": "dept_product",
                    "name": "产品策划部",
                    "description": "负责产品规划、需求分析和用户研究",
                    "properties": {
                        "manager": "李娜",
                        "employee_count": 20,
                        "organizationId": "org_001"
                    }
                },
                {
                    "id": "dept_dev",
                    "name": "研发中心",
                    "description": "负责软件开发、测试和运维",
                    "properties": {
                        "manager": "王强",
                        "employee_count": 60,
                        "organizationId": "org_001"
                    }
                }
            ],
            
            # 主题节点
            "topics": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "ChatX产品开发",
                    "description": "ChatX智能对话系统的产品开发项目",
                    "properties": {
                        "status": "进行中",
                        "priority": "high",
                        "start_date": "2024-01-01",
                        "organizationId": "org_001"
                    }
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "知识管理系统",
                    "description": "企业知识管理和知识图谱系统建设",
                    "properties": {
                        "status": "规划中",
                        "priority": "medium",
                        "start_date": "2024-04-01",
                        "organizationId": "org_001"
                    }
                }
            ],
            
            # 标签节点
            "tags": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "AI技术",
                    "description": "人工智能相关技术标签",
                    "properties": {
                        "category": "technology",
                        "usage_count": 25
                    }
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "产品设计",
                    "description": "产品设计相关标签",
                    "properties": {
                        "category": "product",
                        "usage_count": 18
                    }
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "系统架构",
                    "description": "系统架构设计标签",
                    "properties": {
                        "category": "architecture",
                        "usage_count": 12
                    }
                }
            ],
            
            # 网页节点
            "websites": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "OpenAI官方文档",
                    "description": "OpenAI API和技术文档",
                    "properties": {
                        "url": "https://platform.openai.com/docs",
                        "category": "documentation",
                        "last_accessed": "2024-03-15",
                        "relevance": "high"
                    }
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "Neo4j图数据库指南",
                    "description": "Neo4j图数据库技术文档和教程",
                    "properties": {
                        "url": "https://neo4j.com/docs/",
                        "category": "documentation", 
                        "last_accessed": "2024-03-10",
                        "relevance": "medium"
                    }
                }
            ],
            
            # 微信文章节点
            "wechat_articles": [
                {
                    "id": str(uuid.uuid4()),
                    "name": "人工智能在企业数字化转型中的应用",
                    "description": "探讨AI技术如何助力企业实现数字化转型",
                    "properties": {
                        "author": "AI技术专家",
                        "publish_date": "2024-03-01",
                        "read_count": 5420,
                        "source": "AI技术前沿公众号"
                    }
                },
                {
                    "id": str(uuid.uuid4()),
                    "name": "知识图谱构建实战经验分享",
                    "description": "企业级知识图谱构建的方法和最佳实践",
                    "properties": {
                        "author": "数据科学家",
                        "publish_date": "2024-02-15",
                        "read_count": 3210,
                        "source": "企业数字化公众号"
                    }
                }
            ]
        }
        
        # 关系定义
        relationships = [
            # 文档关系
            {"source": "documents", "source_idx": 0, "target": "persons", "target_idx": 1, "type": "CREATED_BY", "properties": {"created_date": "2024-01-15"}},
            {"source": "documents", "source_idx": 1, "target": "persons", "target_idx": 0, "type": "CREATED_BY", "properties": {"created_date": "2024-02-01"}},
            {"source": "documents", "source_idx": 2, "target": "persons", "target_idx": 2, "type": "CREATED_BY", "properties": {"created_date": "2024-03-01"}},
            
            # 概念关系
            {"source": "concepts", "source_idx": 1, "target": "concepts", "target_idx": 0, "type": "PART_OF", "properties": {"relationship": "子领域"}},
            {"source": "concepts", "source_idx": 2, "target": "concepts", "target_idx": 0, "type": "RELATED_TO", "properties": {"strength": "strong"}},
            {"source": "concepts", "source_idx": 3, "target": "documents", "target_idx": 0, "type": "MENTIONED_IN", "properties": {"importance": "high"}},
            
            # 人员关系
            {"source": "persons", "source_idx": 0, "target": "departments", "target_idx": 0, "type": "WORKS_IN", "properties": {"role": "技术总监"}},
            {"source": "persons", "source_idx": 1, "target": "departments", "target_idx": 1, "type": "WORKS_IN", "properties": {"role": "产品经理"}},
            {"source": "persons", "source_idx": 2, "target": "departments", "target_idx": 2, "type": "WORKS_IN", "properties": {"role": "高级工程师"}},
            
            # 部门组织关系
            {"source": "departments", "source_idx": 0, "target": "organizations", "target_idx": 0, "type": "BELONGS_TO", "properties": {}},
            {"source": "departments", "source_idx": 1, "target": "organizations", "target_idx": 0, "type": "BELONGS_TO", "properties": {}},
            {"source": "departments", "source_idx": 2, "target": "organizations", "target_idx": 0, "type": "BELONGS_TO", "properties": {}},
            
            # 主题关系
            {"source": "topics", "source_idx": 0, "target": "documents", "target_idx": 0, "type": "INCLUDES", "properties": {"relevance": "high"}},
            {"source": "topics", "source_idx": 0, "target": "documents", "target_idx": 1, "type": "INCLUDES", "properties": {"relevance": "high"}},
            {"source": "topics", "source_idx": 1, "target": "concepts", "target_idx": 2, "type": "RELATES_TO", "properties": {"strength": "strong"}},
            
            # 标签关系
            {"source": "tags", "source_idx": 0, "target": "concepts", "target_idx": 0, "type": "TAGS", "properties": {}},
            {"source": "tags", "source_idx": 0, "target": "concepts", "target_idx": 1, "type": "TAGS", "properties": {}},
            {"source": "tags", "source_idx": 1, "target": "documents", "target_idx": 0, "type": "TAGS", "properties": {}},
            {"source": "tags", "source_idx": 2, "target": "documents", "target_idx": 1, "type": "TAGS", "properties": {}},
            
            # 网页关系
            {"source": "websites", "source_idx": 0, "target": "concepts", "target_idx": 0, "type": "REFERENCES", "properties": {"relevance": "high"}},
            {"source": "websites", "source_idx": 1, "target": "concepts", "target_idx": 2, "type": "REFERENCES", "properties": {"relevance": "medium"}},
            
            # 微信文章关系  
            {"source": "wechat_articles", "source_idx": 0, "target": "concepts", "target_idx": 0, "type": "DISCUSSES", "properties": {"depth": "detailed"}},
            {"source": "wechat_articles", "source_idx": 1, "target": "concepts", "target_idx": 2, "type": "DISCUSSES", "properties": {"depth": "practical"}}
        ]
        
        # 创建节点
        node_mapping = {}  # 用于存储节点类型和索引到ID的映射
        
        for node_type, nodes in sample_data.items():
            logger.info(f"创建 {node_type} 节点...")
            node_mapping[node_type] = []
            
            for idx, node in enumerate(nodes):
                # 将properties转换为JSON字符串存储
                properties_json = json.dumps(node.get("properties", {}), ensure_ascii=False)
                
                query = """
                CREATE (n:KnowledgeNode {
                    id: $id,
                    name: $name,
                    type: $type,
                    description: $description,
                    properties: $properties,
                    created_at: datetime(),
                    updated_at: datetime()
                })
                """
                
                self.client.run_query(query, {
                    "id": node["id"],
                    "name": node["name"],
                    "type": node_type.rstrip('s'),  # documents -> document
                    "description": node.get("description", ""),
                    "properties": properties_json
                })
                
                node_mapping[node_type].append(node["id"])
        
        # 创建关系
        logger.info("创建节点关系...")
        
        for rel in relationships:
            source_type = rel["source"]
            target_type = rel["target"]
            source_idx = rel["source_idx"]
            target_idx = rel["target_idx"]
            rel_type = rel["type"]
            rel_props = rel.get("properties", {})
            
            if (source_type in node_mapping and 
                target_type in node_mapping and
                source_idx < len(node_mapping[source_type]) and
                target_idx < len(node_mapping[target_type])):
                
                source_id = node_mapping[source_type][source_idx]
                target_id = node_mapping[target_type][target_idx]
                
                # 将关系属性转换为JSON字符串
                properties_json = json.dumps(rel_props, ensure_ascii=False)
                
                query = f"""
                MATCH (source:KnowledgeNode {{id: $source_id}})
                MATCH (target:KnowledgeNode {{id: $target_id}})
                CREATE (source)-[r:{rel_type} {{
                    properties: $properties,
                    weight: $weight,
                    created_at: datetime()
                }}]->(target)
                """
                
                self.client.run_query(query, {
                    "source_id": source_id,
                    "target_id": target_id,
                    "properties": properties_json,
                    "weight": rel_props.get("weight", 1.0)
                })
        
        logger.info("✅ 知识图谱示例数据创建完成")
        
        # 统计信息
        node_stats = self.client.run_query("""
            MATCH (n:KnowledgeNode) 
            WITH n.type AS type, COUNT(n) AS count
            RETURN type, count
            ORDER BY count DESC
        """)
        
        rel_stats = self.client.run_query("""
            MATCH ()-[r]->() 
            WITH TYPE(r) AS rel_type, COUNT(r) AS count
            RETURN rel_type, count
            ORDER BY count DESC
        """)
        
        logger.info("📊 创建统计:")
        logger.info("节点统计:")
        total_nodes = 0
        for record in node_stats:
            logger.info(f"  - {record['type']}: {record['count']} 个")
            total_nodes += record['count']
        logger.info(f"  总节点数: {total_nodes}")
        
        logger.info("关系统计:")
        total_rels = 0
        for record in rel_stats:
            logger.info(f"  - {record['rel_type']}: {record['count']} 个")
            total_rels += record['count']
        logger.info(f"  总关系数: {total_rels}")

    def create_indexes(self):
        """创建索引以提高查询性能"""
        logger.info("🔍 创建索引...")
        
        indexes = [
            "CREATE INDEX IF NOT EXISTS FOR (n:KnowledgeNode) ON (n.id)",
            "CREATE INDEX IF NOT EXISTS FOR (n:KnowledgeNode) ON (n.type)",
            "CREATE INDEX IF NOT EXISTS FOR (n:KnowledgeNode) ON (n.name)"
        ]
        
        for index_query in indexes:
            try:
                self.client.run_query(index_query)
                logger.info(f"✅ 索引创建成功: {index_query}")
            except Exception as e:
                logger.warning(f"Index creation warning: {e}")
        
        logger.info("✅ 索引创建完成")

    def run(self):
        """运行完整的数据初始化流程"""
        try:
            logger.info("🚀 开始初始化知识图谱数据...")
            
            # 1. 清除现有数据
            self.clear_all_data()
            
            # 2. 创建示例数据
            self.create_sample_data()
            
            # 3. 创建索引
            self.create_indexes()
            
            logger.info("🎉 知识图谱数据初始化完成!")
            logger.info("现在可以在前端查看知识图谱了")
            
        except Exception as e:
            logger.error(f"❌ 初始化失败: {e}")
            raise
        finally:
            # 关闭连接
            if hasattr(self.client, 'close'):
                self.client.close()

if __name__ == "__main__":
    initializer = KnowledgeGraphDataInitializer()
    initializer.run()