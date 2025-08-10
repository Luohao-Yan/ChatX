import weaviate
from weaviate.classes.init import Auth
from app.core.config import settings
import logging
from typing import Dict, List, Optional, Any
import json

logger = logging.getLogger(__name__)

class WeaviateClient:
    def __init__(self):
        self.client = None
        self._connect()
    
    def _connect(self):
        """连接到Weaviate"""
        try:
            self.client = weaviate.connect_to_local(
                host=settings.WEAVIATE_URL.replace("http://", "").replace("https://", "")
            )
            logger.info("成功连接到Weaviate")
        except Exception as e:
            logger.error(f"连接Weaviate失败: {e}")
            raise
    
    def create_collection(self, collection_name: str, properties: List[Dict]) -> bool:
        """创建集合"""
        try:
            collection_config = {
                "class": collection_name,
                "properties": properties,
                "vectorizer": "none"  # 不使用自动向量化
            }
            
            # 检查集合是否已存在
            existing_collections = self.client.schema.get()["classes"]
            if any(col["class"] == collection_name for col in existing_collections):
                logger.info(f"集合 {collection_name} 已存在")
                return True
            
            self.client.schema.create_class(collection_config)
            logger.info(f"成功创建集合: {collection_name}")
            return True
        except Exception as e:
            logger.error(f"创建集合失败: {e}")
            return False
    
    def add_object(
        self,
        collection_name: str,
        properties: Dict[str, Any],
        vector: Optional[List[float]] = None,
        object_id: Optional[str] = None
    ) -> Optional[str]:
        """添加对象"""
        try:
            result = self.client.data_object.create(
                data_object=properties,
                class_name=collection_name,
                vector=vector,
                uuid=object_id
            )
            logger.info(f"成功添加对象到 {collection_name}: {result}")
            return result
        except Exception as e:
            logger.error(f"添加对象失败: {e}")
            return None
    
    def search_objects(
        self,
        collection_name: str,
        query: str,
        limit: int = 10,
        vector: Optional[List[float]] = None
    ) -> List[Dict]:
        """搜索对象"""
        try:
            if vector:
                # 向量搜索
                result = (
                    self.client.query
                    .get(collection_name)
                    .with_near_vector({"vector": vector})
                    .with_limit(limit)
                    .do()
                )
            else:
                # 文本搜索
                result = (
                    self.client.query
                    .get(collection_name)
                    .with_where({
                        "path": ["content"],
                        "operator": "Like",
                        "valueText": f"*{query}*"
                    })
                    .with_limit(limit)
                    .do()
                )
            
            return result.get("data", {}).get("Get", {}).get(collection_name, [])
        except Exception as e:
            logger.error(f"搜索对象失败: {e}")
            return []
    
    def update_object(
        self,
        collection_name: str,
        object_id: str,
        properties: Dict[str, Any],
        vector: Optional[List[float]] = None
    ) -> bool:
        """更新对象"""
        try:
            self.client.data_object.update(
                data_object=properties,
                class_name=collection_name,
                uuid=object_id,
                vector=vector
            )
            logger.info(f"成功更新对象 {object_id} in {collection_name}")
            return True
        except Exception as e:
            logger.error(f"更新对象失败: {e}")
            return False
    
    def delete_object(self, collection_name: str, object_id: str) -> bool:
        """删除对象"""
        try:
            self.client.data_object.delete(
                uuid=object_id,
                class_name=collection_name
            )
            logger.info(f"成功删除对象 {object_id} from {collection_name}")
            return True
        except Exception as e:
            logger.error(f"删除对象失败: {e}")
            return False
    
    def get_object(self, collection_name: str, object_id: str) -> Optional[Dict]:
        """获取对象"""
        try:
            result = self.client.data_object.get_by_id(
                uuid=object_id,
                class_name=collection_name
            )
            return result
        except Exception as e:
            logger.error(f"获取对象失败: {e}")
            return None
    
    def batch_add_objects(
        self,
        collection_name: str,
        objects: List[Dict],
        vectors: Optional[List[List[float]]] = None
    ) -> List[str]:
        """批量添加对象"""
        try:
            added_ids = []
            with self.client.batch as batch:
                for i, obj in enumerate(objects):
                    vector = vectors[i] if vectors and i < len(vectors) else None
                    object_id = batch.add_data_object(
                        data_object=obj,
                        class_name=collection_name,
                        vector=vector
                    )
                    added_ids.append(object_id)
            
            logger.info(f"批量添加了 {len(added_ids)} 个对象到 {collection_name}")
            return added_ids
        except Exception as e:
            logger.error(f"批量添加对象失败: {e}")
            return []
    
    def similarity_search(
        self,
        collection_name: str,
        vector: List[float],
        limit: int = 10,
        threshold: float = 0.7
    ) -> List[Dict]:
        """相似性搜索"""
        try:
            result = (
                self.client.query
                .get(collection_name)
                .with_near_vector({
                    "vector": vector,
                    "distance": 1 - threshold  # Weaviate使用距离，需要转换
                })
                .with_limit(limit)
                .with_additional(["distance", "id"])
                .do()
            )
            
            return result.get("data", {}).get("Get", {}).get(collection_name, [])
        except Exception as e:
            logger.error(f"相似性搜索失败: {e}")
            return []
    
    def get_collection_info(self, collection_name: str) -> Optional[Dict]:
        """获取集合信息"""
        try:
            schema = self.client.schema.get(collection_name)
            return schema
        except Exception as e:
            logger.error(f"获取集合信息失败: {e}")
            return None
    
    def close(self):
        """关闭连接"""
        if self.client:
            self.client.close()
            logger.info("Weaviate连接已关闭")

# 全局Weaviate客户端实例
weaviate_client = WeaviateClient()

def get_weaviate() -> WeaviateClient:
    """获取Weaviate客户端"""
    return weaviate_client

# 初始化默认集合
def init_collections():
    """初始化默认集合"""
    try:
        # 用户文档集合
        user_docs_properties = [
            {
                "name": "content",
                "dataType": ["text"],
                "description": "文档内容"
            },
            {
                "name": "title",
                "dataType": ["string"],
                "description": "文档标题"
            },
            {
                "name": "user_id",
                "dataType": ["int"],
                "description": "用户ID"
            },
            {
                "name": "created_at",
                "dataType": ["date"],
                "description": "创建时间"
            },
            {
                "name": "file_type",
                "dataType": ["string"],
                "description": "文件类型"
            }
        ]
        
        weaviate_client.create_collection("UserDocument", user_docs_properties)
        
        # 聊天消息集合
        chat_message_properties = [
            {
                "name": "content",
                "dataType": ["text"],
                "description": "消息内容"
            },
            {
                "name": "user_id",
                "dataType": ["int"],
                "description": "用户ID"
            },
            {
                "name": "chat_id",
                "dataType": ["string"],
                "description": "聊天ID"
            },
            {
                "name": "role",
                "dataType": ["string"],
                "description": "消息角色(user/assistant)"
            },
            {
                "name": "timestamp",
                "dataType": ["date"],
                "description": "时间戳"
            }
        ]
        
        weaviate_client.create_collection("ChatMessage", chat_message_properties)
        
        logger.info("默认集合初始化完成")
        
    except Exception as e:
        logger.error(f"初始化集合失败: {e}")