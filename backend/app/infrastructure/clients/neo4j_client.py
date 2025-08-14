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

# 全局Neo4j客户端实例
neo4j_client = Neo4jClient()

def get_neo4j() -> Neo4jClient:
    """获取Neo4j客户端"""
    return neo4j_client