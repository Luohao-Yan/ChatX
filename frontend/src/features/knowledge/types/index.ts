/**
 * 知识管理模块类型定义
 * 按照DDD原则组织的类型定义
 */

// ==================== 知识图谱核心类型 ====================

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

// ==================== 组织机构类型 ====================

export interface Organization {
  id: string
  name: string
  description?: string
  type: OrganizationType
  parentId?: string
  children?: Organization[]
  createdAt: string
  updatedAt: string
}

export enum OrganizationType {
  COMPANY = 'company',
  DEPARTMENT = 'department',
  TEAM = 'team',
  GROUP = 'group',
}

// ==================== 部门管理类型 ====================

export interface Department {
  id: string
  name: string
  description?: string
  organizationId: string
  parentId?: string
  managerId?: string
  memberCount: number
  children?: Department[]
  createdAt: string
  updatedAt: string
}

// ==================== 知识图谱配置类型 ====================

export interface GraphConfig {
  layout?: 'force' | 'circular' | 'grid'
  theme?: 'light' | 'dark'
  interactive?: boolean
  showLabels?: boolean
}

export interface GraphTheme {
  nodeColors: Record<KnowledgeNodeType, string>
  linkColor: string
  backgroundColor: string
}

// ==================== API请求/响应类型 ====================

export interface KnowledgeGraphRequest {
  tenantId?: string
  nodeTypes?: KnowledgeNodeType[]
  searchQuery?: string
  limit?: number
}

export interface KnowledgeGraphResponse {
  data: KnowledgeGraphData
  total: number
  page: number
  pageSize: number
}

export interface OrganizationCreateRequest {
  name: string
  description?: string
  type: OrganizationType
  parentId?: string
}

export interface OrganizationUpdateRequest {
  name?: string
  description?: string
  type?: OrganizationType
  parentId?: string
}

export interface DepartmentCreateRequest {
  name: string
  description?: string
  organizationId: string
  parentId?: string
  managerId?: string
}

export interface DepartmentUpdateRequest {
  name?: string
  description?: string
  parentId?: string
  managerId?: string
}

// ==================== 搜索和筛选类型 ====================

export interface KnowledgeSearchParams {
  query?: string
  nodeTypes?: KnowledgeNodeType[]
  organizationId?: string
  departmentId?: string
  page?: number
  pageSize?: number
}

export interface GraphFilterState {
  searchQuery: string
  selectedNodeTypes: KnowledgeNodeType[]
  selectedOrganization?: string
  selectedDepartment?: string
}