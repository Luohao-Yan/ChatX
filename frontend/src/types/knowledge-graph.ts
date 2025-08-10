/**
 * 知识图谱基础类型定义
 * 为后续ECharts集成做准备
 */

export interface KnowledgeNode {
  id: string
  name: string
  type: KnowledgeNodeType
  description?: string
  properties?: Record<string, any>
}

export interface KnowledgeLink {
  source: string
  target: string
  type: KnowledgeLinkType
  weight?: number
  properties?: Record<string, any>
}

export enum KnowledgeNodeType {
  DOCUMENT = 'document',
  CONCEPT = 'concept', 
  PERSON = 'person',
  ORGANIZATION = 'organization',
  DEPARTMENT = 'department',
  TOPIC = 'topic',
  TAG = 'tag',
  WEBSITE = 'website',
  WECHAT_ARTICLE = 'wechat_article',
}

export enum KnowledgeLinkType {
  RELATED_TO = 'related_to',
  BELONGS_TO = 'belongs_to',
  CONTAINS = 'contains',
  REFERENCES = 'references',
  SIMILAR_TO = 'similar_to',
  CREATED_BY = 'created_by',
  TAGGED_WITH = 'tagged_with',
  PART_OF = 'part_of',
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[]
  links: KnowledgeLink[]
}

// 为ECharts准备的配置接口
export interface GraphConfig {
  layout?: 'force' | 'circular' | 'grid'
  theme?: 'light' | 'dark'
  interactive?: boolean
  showLabels?: boolean
}