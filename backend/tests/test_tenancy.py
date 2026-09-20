import pytest
from fastapi import Request
from app.core.tenancy import extract_subdomain_from_host, get_subdomain_from_request
from app.core.database import get_tenant_engine

def test_extract_subdomain_from_host():
    assert extract_subdomain_from_host("demo.localhost") == "demo"
    assert extract_subdomain_from_host("demo.localhost:8000") == "demo"
    assert extract_subdomain_from_host("acme-logistics.localhost:3000") == "acme-logistics"
    assert extract_subdomain_from_host("demo.panthertms.local") == "demo"
    assert extract_subdomain_from_host("abc.panthertms.com:443") == "abc"

    # Non-tenant hosts should return None
    assert extract_subdomain_from_host("localhost") is None
    assert extract_subdomain_from_host("127.0.0.1:8000") is None
    assert extract_subdomain_from_host("api.localhost") is None

def test_subdomain_from_explicit_header():
    scope = {
        "type": "http",
        "headers": [(b"x-tenant-subdomain", b"custom-client")],
    }
    req = Request(scope)
    assert get_subdomain_from_request(req) == "custom-client"

def test_tenant_engine_isolation():
    engine_demo = get_tenant_engine("panther_tenant_demo")
    engine_acme = get_tenant_engine("panther_tenant_acme")
    assert engine_demo is not engine_acme
    assert "panther_tenant_demo" in str(engine_demo.url)
    assert "panther_tenant_acme" in str(engine_acme.url)
