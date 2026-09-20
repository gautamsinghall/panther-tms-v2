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
