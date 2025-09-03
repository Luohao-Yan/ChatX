from neo4j import GraphDatabase
from app.core.config import settings
import logging
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

class Neo4jClient:
    def __init__(self):
        self.driver = None
        self._connected = False
    
    def _connect(self):
        """连接到Neo4j"""
        if self._connected:
            return
            
        try:
            self.driver = GraphDatabase.driver(
                settings.NEO4J_URL,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )
            # 测试连接
            with self.driver.session() as session:
                session.run("RETURN 1")
            self._connected = True
            logger.info("成功连接到Neo4j")
        except Exception as e:
            logger.error(f"连接Neo4j失败: {e}")
            self._connected = False
            raise
    
    def close(self):
        """关闭连接"""
        if self.driver:
            self.driver.close()
            self._connected = False
            logger.info("Neo4j连接已关闭")
    
    def run_query(self, query: str, parameters: Optional[Dict] = None) -> List[Dict]:
        """执行Cypher查询"""
        self._connect()  # 确保连接已建立
        try:
            with self.driver.session() as session:
                result = session.run(query, parameters or {})
                return [record.data() for record in result]
        except Exception as e:
            logger.error(f"执行查询失败: {e}")
            raise
    
    def create_user_node(self, user_id: int, user_data: Dict) -> bool:
        """创建用户节点"""
        query = """
        MERGE (u:User {id: $user_id})
        SET u.email = $email,
            u.username = $username,
            u.full_name = $full_name,
            u.created_at = datetime($created_at),
            u.is_active = $is_active,
            u.is_superuser = $is_superuser
        RETURN u
        """
        try:
            parameters = {
                "user_id": user_id,
                "email": user_data.get("email"),
                "username": user_data.get("username"),
                "full_name": user_data.get("full_name"),
                "created_at": user_data.get("created_at", "").isoformat() if user_data.get("created_at") else "",
                "is_active": user_data.get("is_active", True),
                "is_superuser": user_data.get("is_superuser", False)
            }
            self.run_query(query, parameters)
            logger.info(f"成功创建用户节点: {user_id}")
            return True
        except Exception as e:
            logger.error(f"创建用户节点失败: {e}")
            return False
    
    def create_document_node(self, doc_id: str, doc_data: Dict) -> bool:
        """创建文档节点"""
        query = """
        MERGE (d:Document {id: $doc_id})
        SET d.title = $title,
            d.content = $content,
            d.file_type = $file_type,
            d.created_at = datetime($created_at),
            d.size = $size
        RETURN d
        """
        try:
            parameters = {
                "doc_id": doc_id,
                "title": doc_data.get("title"),
                "content": doc_data.get("content", ""),
                "file_type": doc_data.get("file_type"),
                "created_at": doc_data.get("created_at", "").isoformat() if doc_data.get("created_at") else "",
                "size": doc_data.get("size", 0)
            }
            self.run_query(query, parameters)
            logger.info(f"成功创建文档节点: {doc_id}")
            return True
        except Exception as e:
            logger.error(f"创建文档节点失败: {e}")
            return False
    
    def create_relationship(self, from_node: Dict, to_node: Dict, relationship_type: str, properties: Optional[Dict] = None) -> bool:
        """创建节点关系"""
        query = f"""
        MATCH (from:{from_node['label']} {{id: $from_id}})
        MATCH (to:{to_node['label']} {{id: $to_id}})
        MERGE (from)-[r:{relationship_type}]->(to)
        """
        
        if properties:
            set_clause = ", ".join([f"r.{key} = ${key}" for key in properties.keys()])
            query += f" SET {set_clause}"
        
        query += " RETURN r"
        
        try:
            parameters = {
                "from_id": from_node["id"],
                "to_id": to_node["id"]
            }
            if properties:
                parameters.update(properties)
            
            self.run_query(query, parameters)
            logger.info(f"成功创建关系: {from_node['id']} -> {to_node['id']}")
            return True
        except Exception as e:
            logger.error(f"创建关系失败: {e}")
            return False
    
    def find_related_documents(self, user_id: int, limit: int = 10) -> List[Dict]:
        """查找用户相关文档"""
        query = """
        MATCH (u:User {id: $user_id})-[r:OWNS|ACCESSED|SHARED]->(d:Document)
        RETURN d, type(r) as relationship, r.created_at as relationship_date
        ORDER BY r.created_at DESC
        LIMIT $limit
        """
        try:
            parameters = {"user_id": user_id, "limit": limit}
            return self.run_query(query, parameters)
        except Exception as e:
            logger.error(f"查找相关文档失败: {e}")
            return []
    
    def get_user_network(self, user_id: int, depth: int = 2) -> List[Dict]:
        """获取用户关系网络"""
        query = f"""
        MATCH path = (u:User {{id: $user_id}})-[*1..{depth}]-(connected)
        RETURN path
        LIMIT 50
        """
        try:
            parameters = {"user_id": user_id}
            return self.run_query(query, parameters)
        except Exception as e:
            logger.error(f"获取用户网络失败: {e}")
            return []
    
    def search_similar_documents(self, doc_id: str, similarity_threshold: float = 0.7) -> List[Dict]:
        """搜索相似文档"""
        query = """
        MATCH (d1:Document {id: $doc_id})
        MATCH (d2:Document)
        WHERE d1 <> d2
        WITH d1, d2,
             gds.similarity.cosine(
                 [size(d1.content), size(d1.title)],
                 [size(d2.content), size(d2.title)]
             ) as similarity
        WHERE similarity > $threshold
        RETURN d2, similarity
        ORDER BY similarity DESC
        LIMIT 10
        """
        try:
            parameters = {
                "doc_id": doc_id,
                "threshold": similarity_threshold
            }
            return self.run_query(query, parameters)
        except Exception as e:
            logger.error(f"搜索相似文档失败: {e}")
            return []
    
    def get_popular_documents(self, limit: int = 10) -> List[Dict]:
        """获取热门文档"""
        query = """
        MATCH (d:Document)<-[r:ACCESSED]-(u:User)
        WITH d, count(r) as access_count
        RETURN d, access_count
        ORDER BY access_count DESC
        LIMIT $limit
        """
        try:
            parameters = {"limit": limit}
            return self.run_query(query, parameters)
        except Exception as e:
            logger.error(f"获取热门文档失败: {e}")
            return []
    
    def create_tag_node(self, tag_name: str, tag_data: Optional[Dict] = None) -> bool:
        """创建标签节点"""
        query = """
        MERGE (t:Tag {name: $tag_name})
        SET t.created_at = datetime($created_at),
            t.description = $description
        RETURN t
        """
        try:
            parameters = {
                "tag_name": tag_name,
                "created_at": tag_data.get("created_at", "").isoformat() if tag_data and tag_data.get("created_at") else "",
                "description": tag_data.get("description", "") if tag_data else ""
            }
            self.run_query(query, parameters)
            logger.info(f"成功创建标签节点: {tag_name}")
            return True
        except Exception as e:
            logger.error(f"创建标签节点失败: {e}")
            return False
    
    def add_document_tag(self, doc_id: str, tag_name: str) -> bool:
        """为文档添加标签"""
        query = """
        MATCH (d:Document {id: $doc_id})
        MERGE (t:Tag {name: $tag_name})
        MERGE (d)-[:TAGGED_WITH]->(t)
        RETURN d, t
        """
        try:
            parameters = {"doc_id": doc_id, "tag_name": tag_name}
            self.run_query(query, parameters)
            return True
        except Exception as e:
            logger.error(f"添加文档标签失败: {e}")
            return False
    
    def get_documents_by_tag(self, tag_name: str) -> List[Dict]:
        """根据标签获取文档"""
        query = """
        MATCH (d:Document)-[:TAGGED_WITH]->(t:Tag {name: $tag_name})
        RETURN d
        ORDER BY d.created_at DESC
        """
        try:
            parameters = {"tag_name": tag_name}
            return self.run_query(query, parameters)
        except Exception as e:
            logger.error(f"根据标签获取文档失败: {e}")
            return []
    
    def get_database_stats(self) -> Dict:
        """获取数据库统计信息"""
        queries = {
            "users": "MATCH (u:User) RETURN count(u) as count",
            "documents": "MATCH (d:Document) RETURN count(d) as count",
            "tags": "MATCH (t:Tag) RETURN count(t) as count",
            "relationships": "MATCH ()-[r]->() RETURN count(r) as count"
        }
        
        stats = {}
        for key, query in queries.items():
            try:
                result = self.run_query(query)
                stats[key] = result[0]["count"] if result else 0
            except Exception as e:
                logger.error(f"获取{key}统计失败: {e}")
                stats[key] = 0
        
        return stats

    # ===================== 知识图谱专用方法 =====================
    
    def create_knowledge_node(self, node_id: str, node_type: str, name: str, 
                             description: str = None, properties: Dict = None, 
                             tenant_id: str = None) -> bool:
        """创建知识节点"""
        # 根据节点类型设置标签
        type_labels = {
            'document': 'Document',
            'concept': 'Concept', 
            'person': 'Person',
            'organization': 'Organization',
            'department': 'Department',
            'topic': 'Topic',
            'tag': 'Tag',
            'website': 'Website',
            'wechat_article': 'WechatArticle'
        }
        
        label = type_labels.get(node_type, 'KnowledgeNode')
        
        query = f"""
        MERGE (n:{label} {{id: $node_id}})
        SET n.name = $name,
            n.type = $node_type,
            n.description = $description,
            n.tenant_id = $tenant_id,
            n.created_at = datetime(),
            n.updated_at = datetime()
        """
        
        # 添加自定义属性
        if properties:
            set_props = ", ".join([f"n.{key} = ${key}" for key in properties.keys()])
            query += f", {set_props}"
        
        query += " RETURN n"
        
        try:
            parameters = {
                "node_id": node_id,
                "name": name,
                "node_type": node_type,
                "description": description,
                "tenant_id": tenant_id
            }
            if properties:
                parameters.update(properties)
            
            self.run_query(query, parameters)
            logger.info(f"成功创建知识节点: {node_id} ({node_type})")
            return True
        except Exception as e:
            logger.error(f"创建知识节点失败: {e}")
            return False
    
    def create_knowledge_relationship(self, source_id: str, target_id: str, 
                                    relationship_type: str, weight: float = 1.0,
                                    properties: Dict = None, tenant_id: str = None) -> bool:
        """创建知识关系"""
        query = """
        MATCH (source {id: $source_id})
        MATCH (target {id: $target_id})
        WHERE source.tenant_id = $tenant_id AND target.tenant_id = $tenant_id
        MERGE (source)-[r:KNOWLEDGE_RELATION]->(target)
        SET r.type = $relationship_type,
            r.weight = $weight,
            r.tenant_id = $tenant_id,
            r.created_at = datetime(),
            r.updated_at = datetime()
        """
        
        if properties:
            set_props = ", ".join([f"r.{key} = ${key}" for key in properties.keys()])
            query += f", {set_props}"
        
        query += " RETURN r"
        
        try:
            parameters = {
                "source_id": source_id,
                "target_id": target_id,
                "relationship_type": relationship_type,
                "weight": weight,
                "tenant_id": tenant_id
            }
            if properties:
                parameters.update(properties)
            
            self.run_query(query, parameters)
            logger.info(f"成功创建知识关系: {source_id} -> {target_id}")
            return True
        except Exception as e:
            logger.error(f"创建知识关系失败: {e}")
            return False
    
    def get_knowledge_graph(self, tenant_id: str, node_types: List[str] = None, 
                           limit: int = 100) -> Dict:
        """获取知识图谱数据"""
        # 构建节点类型过滤条件
        type_filter = ""
        if node_types:
            type_conditions = " OR ".join([f"n.type = '{t}'" for t in node_types])
            type_filter = f"AND ({type_conditions})"
        
        # 获取节点
        nodes_query = f"""
        MATCH (n)
        WHERE n.tenant_id = $tenant_id {type_filter}
        RETURN n.id as id, n.name as name, n.type as type, 
               n.description as description, properties(n) as properties
        LIMIT $limit
        """
        
        # 获取关系
        relationships_query = """
        MATCH (source)-[r:KNOWLEDGE_RELATION]->(target)
        WHERE source.tenant_id = $tenant_id AND target.tenant_id = $tenant_id
        RETURN source.id as source, target.id as target, 
               r.type as type, r.weight as weight, 
               properties(r) as properties
        LIMIT $limit
        """
        
        try:
            parameters = {"tenant_id": tenant_id, "limit": limit}
            
            nodes_result = self.run_query(nodes_query, parameters)
            relationships_result = self.run_query(relationships_query, parameters)
            
            return {
                "nodes": nodes_result,
                "links": relationships_result
            }
        except Exception as e:
            logger.error(f"获取知识图谱失败: {e}")
            return {"nodes": [], "links": []}
    
    def search_knowledge_nodes(self, tenant_id: str, query: str, node_types: List[str] = None,
                              limit: int = 50) -> List[Dict]:
        """搜索知识节点"""
        type_filter = ""
        if node_types:
            type_conditions = " OR ".join([f"n.type = '{t}'" for t in node_types])
            type_filter = f"AND ({type_conditions})"
        
        search_query = f"""
        MATCH (n)
        WHERE n.tenant_id = $tenant_id 
        {type_filter}
        AND (toLower(n.name) CONTAINS toLower($query) 
             OR toLower(coalesce(n.description, '')) CONTAINS toLower($query))
        RETURN n.id as id, n.name as name, n.type as type,
               n.description as description, properties(n) as properties
        ORDER BY 
            CASE 
                WHEN toLower(n.name) = toLower($query) THEN 0
                WHEN toLower(n.name) STARTS WITH toLower($query) THEN 1
                ELSE 2
            END,
            n.name
        LIMIT $limit
        """
        
        try:
            parameters = {
                "tenant_id": tenant_id,
                "query": query,
                "limit": limit
            }
            return self.run_query(search_query, parameters)
        except Exception as e:
            logger.error(f"搜索知识节点失败: {e}")
            return []
    
    def get_node_relations(self, node_id: str, tenant_id: str, depth: int = 1) -> Dict:
        """获取节点关系网络"""
        query = f"""
        MATCH path = (center {{id: $node_id, tenant_id: $tenant_id}})
                     -[r:KNOWLEDGE_RELATION*1..{depth}]-(connected)
        WHERE ALL(node IN nodes(path) WHERE node.tenant_id = $tenant_id)
        WITH nodes(path) as path_nodes, relationships(path) as path_rels
        UNWIND path_nodes as node
        WITH DISTINCT node
        RETURN node.id as id, node.name as name, node.type as type,
               node.description as description, properties(node) as properties
        
        UNION
        
        MATCH (source)-[r:KNOWLEDGE_RELATION]-(target)
        WHERE source.tenant_id = $tenant_id AND target.tenant_id = $tenant_id
        AND (source.id = $node_id OR target.id = $node_id 
             OR source.id IN [n.id FOR n IN nodes((:node {{id: $node_id, tenant_id: $tenant_id}})-[*1..{depth}]-())]
             OR target.id IN [n.id FOR n IN nodes((:node {{id: $node_id, tenant_id: $tenant_id}})-[*1..{depth}]-())])
        RETURN source.id as source, target.id as target,
               r.type as type, r.weight as weight, properties(r) as properties
        """
        
        try:
            parameters = {
                "node_id": node_id,
                "tenant_id": tenant_id
            }
            result = self.run_query(query, parameters)
            
            # 分离节点和关系
            nodes = []
            links = []
            for record in result:
                if 'source' in record:  # 关系记录
                    links.append(record)
                else:  # 节点记录
                    nodes.append(record)
            
            return {"nodes": nodes, "links": links}
        except Exception as e:
            logger.error(f"获取节点关系失败: {e}")
            return {"nodes": [], "links": []}
    
    def get_knowledge_graph_stats(self, tenant_id: str) -> Dict:
        """获取知识图谱统计信息"""
        stats_queries = {
            "total_nodes": """
                MATCH (n) WHERE n.tenant_id = $tenant_id 
                RETURN count(n) as count
            """,
            "total_links": """
                MATCH ()-[r:KNOWLEDGE_RELATION]-() 
                WHERE r.tenant_id = $tenant_id 
                RETURN count(r) as count
            """,
            "node_types": """
                MATCH (n) WHERE n.tenant_id = $tenant_id 
                RETURN n.type as type, count(n) as count 
                ORDER BY count DESC
            """
        }
        
        try:
            parameters = {"tenant_id": tenant_id}
            stats = {}
            
            # 获取总节点数
            result = self.run_query(stats_queries["total_nodes"], parameters)
            stats["total_nodes"] = result[0]["count"] if result else 0
            
            # 获取总连接数
            result = self.run_query(stats_queries["total_links"], parameters)
            stats["total_links"] = result[0]["count"] if result else 0
            
            # 获取节点类型分布
            result = self.run_query(stats_queries["node_types"], parameters)
            stats["node_types"] = result
            
            return stats
        except Exception as e:
            logger.error(f"获取知识图谱统计失败: {e}")
            return {
                "total_nodes": 0,
                "total_links": 0, 
                "node_types": []
            }
    
    def delete_knowledge_node(self, node_id: str, tenant_id: str) -> bool:
        """删除知识节点及其关系"""
        query = """
        MATCH (n {id: $node_id, tenant_id: $tenant_id})
        DETACH DELETE n
        RETURN count(n) as deleted_count
        """
        
        try:
            parameters = {"node_id": node_id, "tenant_id": tenant_id}
            result = self.run_query(query, parameters)
            deleted = result[0]["deleted_count"] if result else 0
            
            if deleted > 0:
                logger.info(f"成功删除知识节点: {node_id}")
                return True
            else:
                logger.warning(f"知识节点不存在: {node_id}")
                return False
        except Exception as e:
            logger.error(f"删除知识节点失败: {e}")
            return False
    
    def update_knowledge_node(self, node_id: str, tenant_id: str, 
                            name: str = None, description: str = None,
                            properties: Dict = None) -> bool:
        """更新知识节点"""
        set_clauses = ["n.updated_at = datetime()"]
        parameters = {"node_id": node_id, "tenant_id": tenant_id}
        
        if name is not None:
            set_clauses.append("n.name = $name")
            parameters["name"] = name
        
        if description is not None:
            set_clauses.append("n.description = $description")
            parameters["description"] = description
        
        if properties:
            for key, value in properties.items():
                set_clauses.append(f"n.{key} = ${key}")
                parameters[key] = value
        
        query = f"""
        MATCH (n {{id: $node_id, tenant_id: $tenant_id}})
        SET {", ".join(set_clauses)}
        RETURN n
        """
        
        try:
            result = self.run_query(query, parameters)
            if result:
                logger.info(f"成功更新知识节点: {node_id}")
                return True
            else:
                logger.warning(f"知识节点不存在: {node_id}")
                return False
        except Exception as e:
            logger.error(f"更新知识节点失败: {e}")
            return False

# 全局Neo4j客户端实例
neo4j_client = Neo4jClient()

def get_neo4j() -> Neo4jClient:
    """获取Neo4j客户端"""
    return neo4j_client