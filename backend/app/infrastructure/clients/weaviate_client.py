import weaviate
from weaviate.classes.config import Configure
import logging
from typing import Dict, List, Optional, Any
import json
from app.core.config import settings

logger = logging.getLogger(__name__)

class WeaviateClient:
    def __init__(self):
        self.client = None
    
    def _connect(self):
        """连接到Weaviate"""
        if self.client is not None:
            return self.client
            
        try:
            # 使用 Weaviate v4 客户端连接（支持gRPC+REST）
            self.client = weaviate.connect_to_local(
                host="localhost",
                port=8080,
                grpc_port=settings.WEAVIATE_GRPC_PORT
            )
            
            # 测试连接
            if self.client.is_ready():
                logger.info("成功连接到Weaviate")
            else:
                raise Exception("Weaviate服务未就绪")
                
            return self.client
        except Exception as e:
            logger.error(f"连接Weaviate失败: {e}")
            self.client = None
            raise
    
    def get_client(self):
        """获取客户端连接，支持延迟连接"""
        if self.client is None:
            self._connect()
        return self.client
    
    def create_collection(self, collection_name: str, properties: List[Dict]) -> bool:
        """创建集合"""
        try:
            client = self.get_client()
            
            # 检查集合是否已存在
            if client.collections.exists(collection_name):
                logger.info(f"集合 {collection_name} 已存在")
                return True
            
            # 使用 v4 API 创建集合
            client.collections.create(
                name=collection_name,
                vector_config=Configure.VectorIndex.none()  # 不使用自动向量化
            )
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
            client = self.get_client()
            collection = client.collections.get(collection_name)
            
            result = collection.data.insert(
                properties=properties,
                vector=vector,
                uuid=object_id
            )
            logger.info(f"成功添加对象到 {collection_name}: {result}")
            return str(result)
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
            client = self.get_client()
            collection = client.collections.get(collection_name)
            
            if vector:
                # 向量搜索
                response = collection.query.near_vector(
                    near_vector=vector,
                    limit=limit
                )
            else:
                # 文本搜索 - 使用 BM25 搜索
                response = collection.query.bm25(
                    query=query,
                    limit=limit
                )
            
            # 转换为兼容格式
            results = []
            for obj in response.objects:
                results.append({
                    "id": str(obj.uuid),
                    "properties": obj.properties,
                    "vector": obj.vector
                })
            
            return results
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
            client = self.get_client()
            collection = client.collections.get(collection_name)
            
            collection.data.update(
                uuid=object_id,
                properties=properties,
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
            client = self.get_client()
            collection = client.collections.get(collection_name)
            
            collection.data.delete_by_id(object_id)
            logger.info(f"成功删除对象 {object_id} from {collection_name}")
            return True
        except Exception as e:
            logger.error(f"删除对象失败: {e}")
            return False
    
    def get_object(self, collection_name: str, object_id: str) -> Optional[Dict]:
        """获取对象"""
        try:
            client = self.get_client()
            collection = client.collections.get(collection_name)
            
            obj = collection.data.get_by_id(object_id)
            if obj:
                return {
                    "id": str(obj.uuid),
                    "properties": obj.properties,
                    "vector": obj.vector
                }
            return None
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
            client = self.get_client()
            collection = client.collections.get(collection_name)
            
            # 准备批量数据
            data_objects = []
            for i, obj in enumerate(objects):
                vector = vectors[i] if vectors and i < len(vectors) else None
                data_objects.append({
                    "properties": obj,
                    "vector": vector
                })
            
            # 批量插入
            response = collection.data.insert_many(data_objects)
            
            # 获取插入的ID列表
            added_ids = [str(obj_id) for obj_id in response.uuids.values()]
            
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
            client = self.get_client()
            collection = client.collections.get(collection_name)
            
            # 使用近邻向量搜索，并设置距离阈值
            response = collection.query.near_vector(
                near_vector=vector,
                limit=limit,
                distance=1 - threshold  # Weaviate使用距离，需要转换
            )
            
            # 转换为兼容格式
            results = []
            for obj in response.objects:
                results.append({
                    "id": str(obj.uuid),
                    "properties": obj.properties,
                    "vector": obj.vector,
                    "distance": obj.metadata.distance if obj.metadata else None
                })
            
            return results
        except Exception as e:
            logger.error(f"相似性搜索失败: {e}")
            return []
    
    def get_collection_info(self, collection_name: str) -> Optional[Dict]:
        """获取集合信息"""
        try:
            client = self.get_client()
            collection = client.collections.get(collection_name)
            
            # 获取集合配置信息
            config = collection.config.get()
            return {
                "name": config.name,
                "vector_config": config.vector_config,
                "properties": config.properties if hasattr(config, 'properties') else []
            }
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