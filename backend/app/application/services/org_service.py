"""
组织管理服务层
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from app.models.org_models import Organization, Team, UserOrganization, UserTeam
from app.models.user_models import User, UserProfile
from app.schemas.org_schemas import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse,
    TeamCreate, TeamUpdate, TeamResponse,
    UserOrganizationCreate, UserTeamCreate,
    OrganizationTreeNode, OrganizationStatsResponse
)
from app.core.exceptions import ValidationError, PermissionError
import uuid


class OrgService:
    """组织管理服务"""
    
    def __init__(self, db: Session, current_user_id: str, tenant_id: str):
        self.db = db
        self.current_user_id = current_user_id
        self.tenant_id = tenant_id
    
    # ==================== 组织管理 ====================
    
    def create_organization(self, org_data: OrganizationCreate) -> OrganizationResponse:
        """创建组织"""
        # 检查组织名称是否重复
        existing = self.db.query(Organization).filter(
            and_(
                Organization.tenant_id == self.tenant_id,
                Organization.name == org_data.name,
                Organization.parent_id == org_data.parent_id
            )
        ).first()
        
        if existing:
            raise ValidationError("同一层级下组织名称不能重复")
        
        # 计算路径和层级
        path = ""
        level = 0
        if org_data.parent_id:
            parent = self.db.query(Organization).filter(
                and_(
                    Organization.id == org_data.parent_id,
                    Organization.tenant_id == self.tenant_id
                )
            ).first()
            if not parent:
                raise ValidationError("父组织不存在")
            path = f"{parent.path}/{parent.id}"
            level = parent.level + 1
        
        # 创建组织
        org_id = str(uuid.uuid4())
        organization = Organization(
            id=org_id,
            tenant_id=self.tenant_id,
            name=org_data.name,
            display_name=org_data.display_name,
            description=org_data.description,
            logo_url=org_data.logo_url,
            owner_id=self.current_user_id,
            parent_id=org_data.parent_id,
            path=path,
            level=level,
            settings=org_data.settings or {}
        )
        
        self.db.add(organization)
        self.db.commit()
        self.db.refresh(organization)
        
        # 将创建者添加为组织管理员
        user_org = UserOrganization(
            tenant_id=self.tenant_id,
            user_id=self.current_user_id,
            organization_id=org_id,
            role="admin",
            is_admin=True
        )
        self.db.add(user_org)
        
        # 更新成员数量
        organization.member_count = 1
        self.db.commit()
        
        return OrganizationResponse.from_orm(organization)
    
    def get_organizations(self, skip: int = 0, limit: int = 100, 
                         parent_id: Optional[str] = None,
                         search: Optional[str] = None) -> List[OrganizationResponse]:
        """获取组织列表"""
        query = self.db.query(Organization).filter(
            and_(
                Organization.tenant_id == self.tenant_id,
                Organization.deleted_at.is_(None)
            )
        )
        
        if parent_id is not None:
            query = query.filter(Organization.parent_id == parent_id)
        
        if search:
            query = query.filter(
                or_(
                    Organization.name.ilike(f"%{search}%"),
                    Organization.display_name.ilike(f"%{search}%"),
                    Organization.description.ilike(f"%{search}%")
                )
            )
        
        organizations = query.order_by(Organization.level, Organization.name).offset(skip).limit(limit).all()
        
        # 更新每个组织的统计信息并构建响应
        results = []
        for org in organizations:
            # 计算实际成员数
            actual_member_count = self.db.query(UserOrganization).filter(
                and_(
                    UserOrganization.organization_id == org.id,
                    UserOrganization.is_active == True
                )
            ).count()
            org.member_count = actual_member_count
            
            # 计算子组织数量
            child_count = self.db.query(Organization).filter(
                and_(
                    Organization.parent_id == org.id,
                    Organization.tenant_id == self.tenant_id,
                    Organization.deleted_at.is_(None)
                )
            ).count()
            
            # 获取拥有者信息
            owner_info = None
            if org.owner_id:
                owner = self.db.query(User).filter(User.id == org.owner_id).first()
                if owner:
                    # 获取用户的详细资料
                    user_profile = self.db.query(UserProfile).filter(UserProfile.user_id == owner.id).first()
                    owner_info = {
                        "id": owner.id,
                        "username": owner.username,
                        "email": owner.email,
                        "full_name": user_profile.full_name if user_profile else None
                    }
            
            # 构建响应对象
            org_dict = {
                **{k: v for k, v in org.__dict__.items() if not k.startswith('_')},
                'child_count': child_count,
                'owner_info': owner_info
            }
            results.append(OrganizationResponse(**org_dict))
        
        # 批量保存更新
        self.db.commit()
        
        return results
    
    def get_organization(self, org_id: str) -> Optional[OrganizationResponse]:
        """获取单个组织"""
        organization = self.db.query(Organization).filter(
            and_(
                Organization.id == org_id,
                Organization.tenant_id == self.tenant_id
            )
        ).first()
        
        if organization:
            return OrganizationResponse.from_orm(organization)
        return None
    
    def update_organization(self, org_id: str, org_data: OrganizationUpdate) -> OrganizationResponse:
        """更新组织"""
        organization = self.db.query(Organization).filter(
            and_(
                Organization.id == org_id,
                Organization.tenant_id == self.tenant_id
            )
        ).first()
        
        if not organization:
            raise ValidationError("组织不存在")
        
        # 检查权限 - 只有组织管理员或拥有者可以更新
        if not self._check_org_admin_permission(org_id):
            raise PermissionError("没有权限修改此组织")
        
        # 更新字段
        update_data = org_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(organization, field, value)
        
        self.db.commit()
        self.db.refresh(organization)
        
        return OrganizationResponse.from_orm(organization)
    
    def delete_organization(self, org_id: str) -> bool:
        """软删除组织"""
        from datetime import datetime, timezone
        
        organization = self.db.query(Organization).filter(
            and_(
                Organization.id == org_id,
                Organization.tenant_id == self.tenant_id,
                Organization.deleted_at.is_(None)
            )
        ).first()
        
        if not organization:
            raise ValidationError("组织不存在")
        
        # 检查权限
        if not self._check_org_admin_permission(org_id):
            raise PermissionError("没有权限删除此组织")
        
        # 软删除组织（设置deleted_at时间戳）
        organization.deleted_at = datetime.now(timezone.utc)
        organization.deleted_by = self.current_user_id
        
        # 同时软删除所有子组织
        child_orgs = self.db.query(Organization).filter(
            and_(
                Organization.parent_id == org_id,
                Organization.tenant_id == self.tenant_id,
                Organization.deleted_at.is_(None)
            )
        ).all()
        
        for child in child_orgs:
            child.deleted_at = datetime.now(timezone.utc)
            child.deleted_by = self.current_user_id
        
        self.db.commit()
        return True
    
    def get_organization_tree(self, root_id: Optional[str] = None) -> List[OrganizationTreeNode]:
        """获取组织树结构"""
        organizations = self.db.query(Organization).filter(
            Organization.tenant_id == self.tenant_id
        ).order_by(Organization.level, Organization.name).all()
        
        # 构建树结构
        org_dict = {org.id: OrganizationTreeNode.from_orm(org) for org in organizations}
        
        # 建立父子关系
        root_nodes = []
        for org in organizations:
            if org.parent_id and org.parent_id in org_dict:
                org_dict[org.parent_id].children.append(org_dict[org.id])
            elif not org.parent_id and (not root_id or org.id == root_id):
                root_nodes.append(org_dict[org.id])
        
        if root_id and root_id in org_dict:
            return [org_dict[root_id]]
        
        return root_nodes
    
    # ==================== 回收站管理 ====================
    
    def get_deleted_organizations(self, skip: int = 0, limit: int = 100) -> List[OrganizationResponse]:
        """获取回收站中的已删除组织"""
        organizations = self.db.query(Organization).filter(
            and_(
                Organization.tenant_id == self.tenant_id,
                Organization.deleted_at.isnot(None)
            )
        ).order_by(desc(Organization.deleted_at)).offset(skip).limit(limit).all()
        
        return [OrganizationResponse.from_orm(org) for org in organizations]
    
    def restore_organization(self, org_id: str) -> bool:
        """恢复已删除的组织"""
        organization = self.db.query(Organization).filter(
            and_(
                Organization.id == org_id,
                Organization.tenant_id == self.tenant_id,
                Organization.deleted_at.isnot(None)
            )
        ).first()
        
        if not organization:
            raise ValidationError("组织不存在或未被删除")
        
        # 检查权限 - 对于已删除的组织，检查用户是否为系统管理员或租户管理员
        current_user = self.db.query(User).filter(User.id == self.current_user_id).first()
        if not (current_user and (current_user.is_superuser or self._check_tenant_admin_permission())):
            raise PermissionError("没有权限恢复此组织")
        
        # 恢复组织
        organization.deleted_at = None
        organization.deleted_by = None
        
        # 恢复所有子组织
        child_orgs = self.db.query(Organization).filter(
            and_(
                Organization.parent_id == org_id,
                Organization.tenant_id == self.tenant_id,
                Organization.deleted_at.isnot(None)
            )
        ).all()
        
        for child in child_orgs:
            child.deleted_at = None
            child.deleted_by = None
        
        self.db.commit()
        return True
    
    def permanently_delete_organization(self, org_id: str) -> bool:
        """永久删除组织"""
        organization = self.db.query(Organization).filter(
            and_(
                Organization.id == org_id,
                Organization.tenant_id == self.tenant_id,
                Organization.deleted_at.isnot(None)
            )
        ).first()
        
        if not organization:
            raise ValidationError("组织不存在或未被删除")
        
        # 检查权限 - 对于已删除的组织，检查用户是否为系统管理员或租户管理员
        current_user = self.db.query(User).filter(User.id == self.current_user_id).first()
        if not (current_user and (current_user.is_superuser or self._check_tenant_admin_permission())):
            raise PermissionError("没有权限永久删除此组织")
        
        # 永久删除所有子组织
        child_orgs = self.db.query(Organization).filter(
            and_(
                Organization.parent_id == org_id,
                Organization.tenant_id == self.tenant_id
            )
        ).all()
        
        for child in child_orgs:
            # 删除子组织的成员关系
            self.db.query(UserOrganization).filter(
                UserOrganization.organization_id == child.id
            ).delete()
            # 删除子组织
            self.db.delete(child)
        
        # 删除当前组织的成员关系
        self.db.query(UserOrganization).filter(
            UserOrganization.organization_id == org_id
        ).delete()
        
        # 永久删除组织
        self.db.delete(organization)
        self.db.commit()
        
        return True
    
    # ==================== 团队管理 ====================
    
    def create_team(self, team_data: TeamCreate) -> TeamResponse:
        """创建团队"""
        # 检查组织是否存在
        organization = self.db.query(Organization).filter(
            and_(
                Organization.id == team_data.organization_id,
                Organization.tenant_id == self.tenant_id
            )
        ).first()
        
        if not organization:
            raise ValidationError("组织不存在")
        
        # 检查团队名称是否重复
        existing = self.db.query(Team).filter(
            and_(
                Team.organization_id == team_data.organization_id,
                Team.name == team_data.name
            )
        ).first()
        
        if existing:
            raise ValidationError("团队名称已存在")
        
        # 计算路径和层级
        path = f"/{team_data.organization_id}"
        level = 0
        if team_data.parent_id:
            parent = self.db.query(Team).filter(
                and_(
                    Team.id == team_data.parent_id,
                    Team.organization_id == team_data.organization_id
                )
            ).first()
            if not parent:
                raise ValidationError("父团队不存在")
            path = f"{parent.path}/{parent.id}"
            level = parent.level + 1
        
        # 创建团队
        team_id = str(uuid.uuid4())
        team = Team(
            id=team_id,
            tenant_id=self.tenant_id,
            organization_id=team_data.organization_id,
            name=team_data.name,
            description=team_data.description,
            creator_id=self.current_user_id,
            parent_id=team_data.parent_id,
            path=path,
            level=level,
            settings=team_data.settings or {}
        )
        
        self.db.add(team)
        self.db.commit()
        self.db.refresh(team)
        
        # 将创建者添加为团队成员
        user_team = UserTeam(
            tenant_id=self.tenant_id,
            user_id=self.current_user_id,
            team_id=team_id,
            role="admin"
        )
        self.db.add(user_team)
        
        # 更新成员数量
        team.member_count = 1
        self.db.commit()
        
        return TeamResponse.from_orm(team)
    
    def get_teams(self, organization_id: Optional[str] = None, 
                  skip: int = 0, limit: int = 100) -> List[TeamResponse]:
        """获取团队列表"""
        query = self.db.query(Team).filter(
            Team.tenant_id == self.tenant_id
        )
        
        if organization_id:
            query = query.filter(Team.organization_id == organization_id)
        
        teams = query.order_by(Team.level, Team.name).offset(skip).limit(limit).all()
        return [TeamResponse.from_orm(team) for team in teams]
    
    # ==================== 成员管理 ====================
    
    def add_user_to_organization(self, user_org_data: UserOrganizationCreate) -> bool:
        """添加用户到组织"""
        # 检查用户是否已在组织中
        existing = self.db.query(UserOrganization).filter(
            and_(
                UserOrganization.user_id == user_org_data.user_id,
                UserOrganization.organization_id == user_org_data.organization_id
            )
        ).first()
        
        if existing:
            raise ValidationError("用户已在组织中")
        
        # 添加关系
        user_org = UserOrganization(
            tenant_id=self.tenant_id,
            user_id=user_org_data.user_id,
            organization_id=user_org_data.organization_id,
            role=user_org_data.role,
            permissions=user_org_data.permissions,
            is_admin=user_org_data.is_admin
        )
        
        self.db.add(user_org)
        
        # 更新组织成员数量
        self.db.query(Organization).filter(
            Organization.id == user_org_data.organization_id
        ).update({
            "member_count": Organization.member_count + 1
        })
        
        self.db.commit()
        return True
    
    # ==================== 统计信息 ====================
    
    def get_organization_stats(self) -> OrganizationStatsResponse:
        """获取组织统计信息"""
        # 总组织数
        total_orgs = self.db.query(Organization).filter(
            Organization.tenant_id == self.tenant_id
        ).count()
        
        # 总团队数
        total_teams = self.db.query(Team).filter(
            Team.tenant_id == self.tenant_id
        ).count()
        
        # 总成员数
        total_members = self.db.query(UserOrganization).filter(
            UserOrganization.tenant_id == self.tenant_id
        ).count()
        
        # 活跃组织数
        active_orgs = self.db.query(Organization).filter(
            and_(
                Organization.tenant_id == self.tenant_id,
                Organization.is_active == True
            )
        ).count()
        
        # 组织层级数
        max_level = self.db.query(func.max(Organization.level)).filter(
            Organization.tenant_id == self.tenant_id
        ).scalar() or 0
        
        return OrganizationStatsResponse(
            total_organizations=total_orgs,
            total_teams=total_teams,
            total_members=total_members,
            active_organizations=active_orgs,
            organization_levels=max_level + 1
        )
    
    # ==================== 权限检查 ====================
    
    def _check_org_admin_permission(self, org_id: str) -> bool:
        """检查是否有组织管理权限"""
        # 检查是否是组织管理员
        user_org = self.db.query(UserOrganization).filter(
            and_(
                UserOrganization.user_id == self.current_user_id,
                UserOrganization.organization_id == org_id,
                UserOrganization.is_admin == True,
                UserOrganization.is_active == True
            )
        ).first()
        
        return user_org is not None
    
    def _check_tenant_admin_permission(self) -> bool:
        """检查是否有租户管理权限"""
        # 简化实现，检查用户是否为当前租户的任意组织管理员
        user_org = self.db.query(UserOrganization).filter(
            and_(
                UserOrganization.user_id == self.current_user_id,
                UserOrganization.tenant_id == self.tenant_id,
                UserOrganization.is_admin == True,
                UserOrganization.is_active == True
            )
        ).first()
        
        return user_org is not None