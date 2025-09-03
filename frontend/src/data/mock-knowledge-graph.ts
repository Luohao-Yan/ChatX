import { 
  KnowledgeGraphData, 
  KnowledgeNode, 
  KnowledgeNodeType, 
  KnowledgeLinkType 
} from '@/features/knowledge/types'

/**
 * Mock知识图谱数据
 * 模拟Neo4j返回的知识点关系数据
 */
export const mockKnowledgeGraphData: KnowledgeGraphData = {
  nodes: [
    // 文档类型节点
    {
      id: 'doc_1',
      name: 'React开发指南',
      type: KnowledgeNodeType.DOCUMENT,
      description: '完整的React开发教程文档',
      properties: { 
        createdAt: '2024-01-15',
        author: '张三',
        fileSize: '2.3MB',
        format: 'PDF'
      }
    },
    {
      id: 'doc_2', 
      name: '知识管理系统设计',
      type: KnowledgeNodeType.DOCUMENT,
      description: '系统架构设计文档',
      properties: {
        createdAt: '2024-02-10',
        author: '李四',
        fileSize: '1.8MB',
        format: 'DOCX'
      }
    },
    {
      id: 'doc_3',
      name: 'Neo4j图数据库指南',
      type: KnowledgeNodeType.DOCUMENT,
      description: 'Neo4j数据库使用教程',
      properties: {
        createdAt: '2024-01-20',
        author: '王五',
        fileSize: '3.1MB',
        format: 'PDF'
      }
    },

    // 概念类型节点
    {
      id: 'concept_1',
      name: '知识图谱',
      type: KnowledgeNodeType.CONCEPT,
      description: '用于表示知识的语义网络',
      properties: {
        definition: '知识图谱本质上是语义网络，是一种基于图的数据结构'
      }
    },
    {
      id: 'concept_2',
      name: '数据可视化',
      type: KnowledgeNodeType.CONCEPT,
      description: '将数据转换为图形表示的技术',
      properties: {
        definition: '通过图表、图形等视觉元素展示数据和信息'
      }
    },
    {
      id: 'concept_3',
      name: '图数据库',
      type: KnowledgeNodeType.CONCEPT,
      description: '以图结构存储数据的数据库',
      properties: {
        definition: '使用图论来存储、映射和查询关系的数据库'
      }
    },

    // 人员节点
    {
      id: 'person_1',
      name: '张三',
      type: KnowledgeNodeType.PERSON,
      description: '前端开发工程师',
      properties: {
        role: '高级前端工程师',
        department: '技术部',
        email: 'zhangsan@company.com',
        skills: ['React', 'TypeScript', 'Vue']
      }
    },
    {
      id: 'person_2',
      name: '李四',
      type: KnowledgeNodeType.PERSON,
      description: '系统架构师',
      properties: {
        role: '系统架构师',
        department: '技术部',
        email: 'lisi@company.com',
        skills: ['架构设计', 'Java', 'Spring']
      }
    },

    // 组织机构节点
    {
      id: 'org_1',
      name: '技术有限公司',
      type: KnowledgeNodeType.ORGANIZATION,
      description: '科技创新企业',
      properties: {
        type: '有限责任公司',
        founded: '2020',
        industry: '软件开发'
      }
    },

    // 部门节点
    {
      id: 'dept_1',
      name: '技术部',
      type: KnowledgeNodeType.DEPARTMENT,
      description: '负责技术研发的部门',
      properties: {
        headCount: 25,
        manager: '李四',
        budget: '500万'
      }
    },
    {
      id: 'dept_2',
      name: '产品部',
      type: KnowledgeNodeType.DEPARTMENT,
      description: '产品策划与管理部门',
      properties: {
        headCount: 15,
        manager: '王五',
        budget: '200万'
      }
    },

    // 主题节点
    {
      id: 'topic_1',
      name: 'Web开发',
      type: KnowledgeNodeType.TOPIC,
      description: 'Web前端和后端开发相关主题',
      properties: {
        category: '技术',
        popularity: 95
      }
    },
    {
      id: 'topic_2',
      name: '数据库技术',
      type: KnowledgeNodeType.TOPIC,
      description: '各种数据库相关技术',
      properties: {
        category: '技术',
        popularity: 88
      }
    },

    // 标签节点
    {
      id: 'tag_1',
      name: 'React',
      type: KnowledgeNodeType.TAG,
      description: 'React框架相关内容',
      properties: {
        color: '#61dafb',
        usageCount: 45
      }
    },
    {
      id: 'tag_2',
      name: 'Neo4j',
      type: KnowledgeNodeType.TAG,
      description: 'Neo4j数据库相关内容',
      properties: {
        color: '#00bcd4',
        usageCount: 23
      }
    },
    {
      id: 'tag_3',
      name: 'TypeScript',
      type: KnowledgeNodeType.TAG,
      description: 'TypeScript语言相关内容',
      properties: {
        color: '#3178c6',
        usageCount: 38
      }
    },

    // 网页知识节点
    {
      id: 'web_1',
      name: 'React官方文档',
      type: KnowledgeNodeType.WEBSITE,
      description: 'React官方技术文档',
      properties: {
        url: 'https://react.dev',
        domain: 'react.dev',
        lastVisited: '2024-08-10'
      }
    },
    {
      id: 'web_2',
      name: 'Neo4j开发者指南',
      type: KnowledgeNodeType.WEBSITE,
      description: 'Neo4j官方开发文档',
      properties: {
        url: 'https://neo4j.com/docs',
        domain: 'neo4j.com',
        lastVisited: '2024-08-05'
      }
    },

    // 微信文章节点
    {
      id: 'wechat_1',
      name: '前端技术趋势解析',
      type: KnowledgeNodeType.WECHAT_ARTICLE,
      description: '2024年前端开发技术趋势分析',
      properties: {
        author: '前端大师',
        publishDate: '2024-07-28',
        readCount: 5200,
        likeCount: 486
      }
    },
    {
      id: 'wechat_2',
      name: '知识图谱在企业中的应用',
      type: KnowledgeNodeType.WECHAT_ARTICLE,
      description: '企业级知识图谱应用案例分享',
      properties: {
        author: '数据科学家',
        publishDate: '2024-08-02',
        readCount: 3100,
        likeCount: 297
      }
    }
  ],

  links: [
    // 文档与概念的关系
    {
      source: 'doc_1',
      target: 'concept_2',
      type: KnowledgeLinkType.RELATED_TO,
      weight: 0.8,
      properties: { relationship: '文档介绍了数据可视化概念' }
    },
    {
      source: 'doc_2',
      target: 'concept_1',
      type: KnowledgeLinkType.CONTAINS,
      weight: 0.9,
      properties: { relationship: '系统设计包含知识图谱模块' }
    },
    {
      source: 'doc_3',
      target: 'concept_3',
      type: KnowledgeLinkType.REFERENCES,
      weight: 0.95,
      properties: { relationship: '详细介绍图数据库概念' }
    },

    // 文档与作者的关系
    {
      source: 'doc_1',
      target: 'person_1',
      type: KnowledgeLinkType.CREATED_BY,
      weight: 1.0,
      properties: { role: '作者' }
    },
    {
      source: 'doc_2',
      target: 'person_2',
      type: KnowledgeLinkType.CREATED_BY,
      weight: 1.0,
      properties: { role: '作者' }
    },

    // 人员与部门的关系
    {
      source: 'person_1',
      target: 'dept_1',
      type: KnowledgeLinkType.BELONGS_TO,
      weight: 1.0,
      properties: { role: '员工' }
    },
    {
      source: 'person_2',
      target: 'dept_1',
      type: KnowledgeLinkType.BELONGS_TO,
      weight: 1.0,
      properties: { role: '经理' }
    },

    // 部门与组织的关系
    {
      source: 'dept_1',
      target: 'org_1',
      type: KnowledgeLinkType.PART_OF,
      weight: 1.0,
      properties: { relationship: '下属部门' }
    },
    {
      source: 'dept_2',
      target: 'org_1',
      type: KnowledgeLinkType.PART_OF,
      weight: 1.0,
      properties: { relationship: '下属部门' }
    },

    // 文档与标签的关系
    {
      source: 'doc_1',
      target: 'tag_1',
      type: KnowledgeLinkType.TAGGED_WITH,
      weight: 0.9,
      properties: { relevance: '高度相关' }
    },
    {
      source: 'doc_1',
      target: 'tag_3',
      type: KnowledgeLinkType.TAGGED_WITH,
      weight: 0.7,
      properties: { relevance: '中度相关' }
    },
    {
      source: 'doc_3',
      target: 'tag_2',
      type: KnowledgeLinkType.TAGGED_WITH,
      weight: 0.95,
      properties: { relevance: '高度相关' }
    },

    // 文档与主题的关系
    {
      source: 'doc_1',
      target: 'topic_1',
      type: KnowledgeLinkType.BELONGS_TO,
      weight: 0.85,
      properties: { category: 'Web开发教程' }
    },
    {
      source: 'doc_3',
      target: 'topic_2',
      type: KnowledgeLinkType.BELONGS_TO,
      weight: 0.9,
      properties: { category: '数据库教程' }
    },

    // 网页与概念的关系
    {
      source: 'web_1',
      target: 'tag_1',
      type: KnowledgeLinkType.RELATED_TO,
      weight: 1.0,
      properties: { relationship: 'React官方资源' }
    },
    {
      source: 'web_2',
      target: 'tag_2',
      type: KnowledgeLinkType.RELATED_TO,
      weight: 1.0,
      properties: { relationship: 'Neo4j官方资源' }
    },

    // 微信文章与主题的关系
    {
      source: 'wechat_1',
      target: 'topic_1',
      type: KnowledgeLinkType.RELATED_TO,
      weight: 0.8,
      properties: { relationship: '前端技术分析' }
    },
    {
      source: 'wechat_2',
      target: 'concept_1',
      type: KnowledgeLinkType.REFERENCES,
      weight: 0.85,
      properties: { relationship: '知识图谱应用案例' }
    },

    // 概念之间的关系
    {
      source: 'concept_1',
      target: 'concept_3',
      type: KnowledgeLinkType.RELATED_TO,
      weight: 0.9,
      properties: { relationship: '知识图谱通常使用图数据库存储' }
    },
    {
      source: 'concept_1',
      target: 'concept_2',
      type: KnowledgeLinkType.CONTAINS,
      weight: 0.7,
      properties: { relationship: '知识图谱需要可视化展示' }
    },

    // 标签之间的相似关系
    {
      source: 'tag_1',
      target: 'tag_3',
      type: KnowledgeLinkType.SIMILAR_TO,
      weight: 0.6,
      properties: { relationship: '都是前端技术栈' }
    },
  ]
}

/**
 * 模拟API调用 - 获取知识图谱数据
 */
export const fetchKnowledgeGraph = async (): Promise<KnowledgeGraphData> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 1000))
  return mockKnowledgeGraphData
}

/**
 * 模拟API调用 - 根据节点ID获取相关节点
 */
export const fetchRelatedNodes = async (nodeId: string): Promise<KnowledgeGraphData> => {
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // 找到相关的节点和连接
  const relatedLinks = mockKnowledgeGraphData.links.filter(
    link => link.source === nodeId || link.target === nodeId
  )
  
  const relatedNodeIds = new Set<string>()
  relatedLinks.forEach(link => {
    relatedNodeIds.add(link.source)
    relatedNodeIds.add(link.target)
  })
  
  const relatedNodes = mockKnowledgeGraphData.nodes.filter(
    node => relatedNodeIds.has(node.id)
  )
  
  return {
    nodes: relatedNodes,
    links: relatedLinks
  }
}

/**
 * 模拟API调用 - 搜索知识节点
 */
export const searchKnowledgeNodes = async (query: string): Promise<KnowledgeNode[]> => {
  await new Promise(resolve => setTimeout(resolve, 300))
  
  return mockKnowledgeGraphData.nodes.filter(node =>
    node.name.toLowerCase().includes(query.toLowerCase()) ||
    (node.description && node.description.toLowerCase().includes(query.toLowerCase()))
  )
}