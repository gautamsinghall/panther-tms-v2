import pytest
from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    decode_token,
)

def test_password_hashing():
    raw_pass = "PantherTMS@2026!"
    hashed = get_password_hash(raw_pass)
    assert hashed != raw_pass
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_payload_and_subdomain_isolation():
    token = create_access_token(
        subject="1",
        tenant_subdomain="demo",
        tenant_id=10,
        role="COMPANY_ADMIN",
        extra_claims={"email": "admin@demo.com"}
    )
    payload = decode_token(token)
    assert payload["sub"] == "1"
    assert payload["subdomain"] == "demo"
    assert payload["tenant_id"] == 10
    assert payload["role"] == "COMPANY_ADMIN"
    assert payload["type"] == "access"
    assert payload["email"] == "admin@demo.com"

def test_token_tampering():
    token = create_access_token(
        subject="1",
        tenant_subdomain="demo",
        tenant_id=10,
        role="COMPANY_ADMIN"
    )
    # Tamper token
    tampered_token = token[:-4] + "xxxx"
    with pytest.raises(Exception):
        decode_token(tampered_token)

@pytest.mark.asyncio
async def test_demo_admin_auto_reactivation_on_login():
    from unittest.mock import AsyncMock, MagicMock
    from app.auth.service import authenticate_user
    from app.auth.schemas import LoginRequest
    from app.control.models import Tenant
    from app.tenant_db.models import User

    # Mock DB session
    db = AsyncMock()
    
    # Inactive demo admin user
    user = User(
        id=1,
        email="admin@demo.com",
        password_hash=get_password_hash("PantherTMS@2026!"),
        full_name="Company Admin",
        role="COMPANY_ADMIN",
        is_active=False
    )
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = user
    db.execute.return_value = result_mock

    tenant = Tenant(id=1, subdomain="demo", company_name="Demo Logistics", db_name="panther_tenant_demo")
    login_data = LoginRequest(email="admin@demo.com", password="PantherTMS@2026!")

    # authenticate_user should auto-reactivate the demo admin and succeed
    token_response = await authenticate_user(db, tenant, login_data)
    assert user.is_active is True
    assert token_response.access_token is not None
    assert token_response.subdomain == "demo"

@pytest.mark.asyncio
async def test_non_demo_user_inactive_raises_error():
    from unittest.mock import AsyncMock, MagicMock
    from app.auth.service import authenticate_user
    from app.auth.schemas import LoginRequest
    from app.control.models import Tenant
    from app.tenant_db.models import User
    from app.core.errors import AppException

    db = AsyncMock()
    user = User(
        id=2,
        email="employee@demo.com",
        password_hash=get_password_hash("Password123!"),
        full_name="Regular Employee",
        role="EMPLOYEE",
        is_active=False
    )
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = user
    db.execute.return_value = result_mock

    tenant = Tenant(id=1, subdomain="demo", company_name="Demo Logistics", db_name="panther_tenant_demo")
    login_data = LoginRequest(email="employee@demo.com", password="Password123!")

    with pytest.raises(AppException) as exc_info:
        await authenticate_user(db, tenant, login_data)
    assert exc_info.value.status_code == 403
    assert exc_info.value.error_code == "USER_INACTIVE"

@pytest.mark.asyncio
async def test_prevent_deactivating_demo_admin_and_self():
    from unittest.mock import AsyncMock, MagicMock
    from app.tenant_db.models import User
    from app.modules.settings.service import update_existing_user
    from app.modules.settings.schemas import UserUpdate
    from app.core.errors import AppException

    db = AsyncMock()
    demo_admin = User(
        id=1,
        email="admin@demo.com",
        password_hash="hash",
        full_name="Company Admin",
        role="COMPANY_ADMIN",
        is_active=True
    )
    result_mock = MagicMock()
    result_mock.scalar_one_or_none.return_value = demo_admin
    db.execute.return_value = result_mock

    # 1. Attempting to deactivate demo admin should raise CANNOT_DEACTIVATE_DEMO_ADMIN
    with pytest.raises(AppException) as exc_info:
        await update_existing_user(db, 1, UserUpdate(is_active=False))
    assert exc_info.value.status_code == 400
    assert exc_info.value.error_code == "CANNOT_DEACTIVATE_DEMO_ADMIN"

    # 2. Attempting to deactivate oneself
    emp = User(
        id=5,
        email="emp@demo.com",
        password_hash="hash",
        full_name="Emp Five",
        role="EMPLOYEE",
        is_active=True
    )
    result_mock.scalar_one_or_none.return_value = emp
    with pytest.raises(AppException) as exc_info2:
        await update_existing_user(db, 5, UserUpdate(is_active=False), current_user=emp)
    assert exc_info2.value.status_code == 400
    assert exc_info2.value.error_code == "CANNOT_DEACTIVATE_SELF"

