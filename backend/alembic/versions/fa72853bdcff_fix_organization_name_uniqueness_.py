"""fix organization name uniqueness constraint

Revision ID: fa72853bdcff
Revises: adea58a966d9
Create Date: 2025-08-29 09:36:48.920058

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fa72853bdcff'
down_revision: Union[str, None] = 'adea58a966d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the old unique constraint that only considers tenant_id + name
    op.drop_index('idx_org_tenant_name', table_name='sys_organizations')
    
    # Create a new constraint that allows same names in different branches
    # This allows same names at different levels or in different parent organizations
    op.create_index(
        'idx_org_tenant_parent_name',
        'sys_organizations',
        ['tenant_id', 'parent_id', 'name'],
        unique=True
    )
    
    # Also create a non-unique index for just tenant_id + name for query performance
    op.create_index(
        'idx_org_tenant_name_nonunique',
        'sys_organizations',
        ['tenant_id', 'name'],
        unique=False
    )


def downgrade() -> None:
    # Remove the new indexes
    op.drop_index('idx_org_tenant_parent_name', table_name='sys_organizations')
    op.drop_index('idx_org_tenant_name_nonunique', table_name='sys_organizations')
    
    # Recreate the old unique constraint
    op.create_index(
        'idx_org_tenant_name',
        'sys_organizations',
        ['tenant_id', 'name'],
        unique=True
    )
