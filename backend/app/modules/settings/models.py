from app.tenant_db.models import User, Role, RolePermission

# Re-export tenant DB models for settings module consistency
__all__ = ["User", "Role", "RolePermission"]
