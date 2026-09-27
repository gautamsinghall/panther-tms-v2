"""
Compatibility module alias. All exceptions are defined in app.core.errors.
"""
from app.core.errors import (
    AppException,
    TenantNotFoundException,
    TenantInactiveException,
    UnauthorizedException,
    ForbiddenException,
    EntitlementLockedException,
    DuplicateResourceException,
    RateLimitException,
    ValidationException,
    ResourceNotFoundException,
    InternalServerException,
)

__all__ = [
    "AppException",
    "TenantNotFoundException",
    "TenantInactiveException",
    "UnauthorizedException",
    "ForbiddenException",
    "EntitlementLockedException",
    "DuplicateResourceException",
    "RateLimitException",
    "ValidationException",
    "ResourceNotFoundException",
    "InternalServerException",
]
