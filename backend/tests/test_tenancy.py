import pytest
from fastapi import Request
from app.core.tenancy import (
    generate_tenant_id,
    sanitize_company_code,
    get_tenant_id_from_request,
)
from app.core.database import get_tenant_engine

def test_generate_tenant_id():
    tid = generate_tenant_id()
    assert len(tid) == 10
    assert tid.isalnum()
    assert tid.islower()
    
    # Ensure randomness/uniqueness across multiple generations
    tids = {generate_tenant_id() for _ in range(50)}
    assert len(tids) == 50

def test_sanitize_company_code():
    assert sanitize_company_code("Bharat Logistics") == "BHARATLOGISTICS"
    assert sanitize_company_code("Acme-Express_123") == "ACMEEXPRESS"
    assert sanitize_company_code("shree ram freight") == "SHREERAMFREIGHT"
    assert sanitize_company_code("ABC & XYZ Logistics Pvt. Ltd.") == "ABCXYZLOGISTICSPVTLTD"
    assert sanitize_company_code("---###---") == ""

def test_get_tenant_id_from_headers():
    # 1. X-Tenant-ID header
    scope1 = {
        "type": "http",
        "headers": [(b"x-tenant-id", b"k9x2m4p8t1")],
    }
    req1 = Request(scope1)
    assert get_tenant_id_from_request(req1) == "k9x2m4p8t1"

    # 2. X-Company-Code header
    scope2 = {
        "type": "http",
        "headers": [(b"x-company-code", b"BHARATLOGISTICS")],
    }
    req2 = Request(scope2)
    assert get_tenant_id_from_request(req2) == "BHARATLOGISTICS"

    # 3. Legacy header
    scope3 = {
        "type": "http",
        "headers": [(b"x-tenant-subdomain", b"demo123456")],
    }
    req3 = Request(scope3)
    assert get_tenant_id_from_request(req3) == "demo123456"

def test_tenant_engine_isolation():
    engine_1 = get_tenant_engine("panther_tenant_k9x2m4p8t1")
    engine_2 = get_tenant_engine("panther_tenant_z7y1w3q5r2")
    assert engine_1 is not engine_2
    assert "panther_tenant_k9x2m4p8t1" in str(engine_1.url)
    assert "panther_tenant_z7y1w3q5r2" in str(engine_2.url)
