import pytest
from datetime import date, datetime, timezone
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, text

from app.tenant_db.models import (
    TenantBase,
    Account,
    Branch,
    Vendor,
)
from app.control.models import ControlBase
from app.modules.general import service as general_service
from app.modules.general import schemas as general_schemas
from app.modules.misc.tally_chart_of_accounts import seed_indian_accounting_chart_of_accounts

@pytest.fixture
async def session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)
        await conn.run_sync(ControlBase.metadata.create_all)

    session_maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_maker() as s:
        await seed_indian_accounting_chart_of_accounts(s)
        ho = Branch(id=1, name="Mumbai Central Hub", code="MUM-HO", is_head_office=True, state="Maharashtra")
        s.add(ho)
        await s.commit()
        yield s

@pytest.mark.asyncio
async def test_vendor_full_lifecycle(session):
    # 1. Create vendor with all fields
    create_data = general_schemas.VendorCreate(
        name="Apex Freight Lines Pvt Ltd",
        incorporation_date=date(2018, 3, 15),
        phone="9876543210",
        email="contact@apexfreight.com",
        pan="AAACA1234F",
        pan_state="27",
        tan_no="MUMA12345B",
        gstin="27AAACA1234F1Z5",
        billing_state="Maharashtra",
        gst_exempt="No",
        tds_declaration="Applicable - 194C",
        address_type="Registered Office",
        address="101 Transport Hub, Sector 19",
        country="India",
        state="Maharashtra",
        city="Navi Mumbai",
        pincode="400705",
        secondary_address_type="Branch Office",
        secondary_address="Plot 5, Kalamboli Yard",
        secondary_country="India",
        secondary_state="Maharashtra",
        secondary_city="Panvel",
        secondary_pincode="410218",
        fax="022-27891234",
        website="https://apexfreight.com",
        industry="Transporter / Fleet Owner",
        legal_status="Private Limited",
        group_company="Apex Holdings",
        account_status="Active",
        is_active=True,
    )
    v = await general_service.create_vendor(session, create_data, office_id=1)
    assert v.id is not None
    assert v.name == "Apex Freight Lines Pvt Ltd"
    assert v.is_active is True
    assert v.account_status == "Active"

    # Validate response schema serialization
    resp = general_schemas.VendorResponse.model_validate(v)
    assert resp.id == v.id
    assert resp.industry == "Transporter / Fleet Owner"

    # 2. Update / Edit vendor
    update_data = general_schemas.VendorUpdate(
        name="Apex Freight Lines India Pvt Ltd",
        city="Mumbai",
        account_status="Active",
    )
    v_updated = await general_service.update_vendor(session, v.id, update_data)
    assert v_updated.name == "Apex Freight Lines India Pvt Ltd"
    assert v_updated.city == "Mumbai"
    assert v_updated.is_active is True
    assert v_updated.account_status == "Active"

    # 3. Deactivate vendor via PUT (is_active=False)
    deact_put = general_schemas.VendorUpdate(
        is_active=False,
        account_status="Inactive",
    )
    v_deact = await general_service.update_vendor(session, v.id, deact_put)
    assert v_deact.is_active is False
    assert v_deact.account_status == "Inactive"

    # 4. Re-activate vendor via PUT
    react_put = general_schemas.VendorUpdate(
        is_active=True,
        account_status="Active",
    )
    v_react = await general_service.update_vendor(session, v.id, react_put)
    assert v_react.is_active is True
    assert v_react.account_status == "Active"

    # 5. Deactivate vendor via delete_vendor service (DELETE endpoint)
    v_deleted = await general_service.delete_vendor(session, v.id)
    assert v_deleted.is_active is False
    assert v_deleted.account_status == "Inactive"

    # 6. Verify list_vendors returns the record with correct inactive status
    v_list = await general_service.list_vendors(session, office_id=1, include_unassigned=True)
    found = [item for item in v_list if item.id == v.id]
    assert len(found) == 1
    assert found[0].is_active is False
    assert found[0].account_status == "Inactive"

@pytest.mark.asyncio
async def test_vendor_response_with_null_dates(session):
    # Test that dictionary or legacy record with null created_at/updated_at validates cleanly without 500 error
    data = {
        "id": 999,
        "name": "Legacy Vendor",
        "is_active": True,
        "account_status": "Active",
        "created_at": None,
        "updated_at": None,
    }
    resp = general_schemas.VendorResponse.model_validate(data)
    assert resp.id == 999
    assert resp.name == "Legacy Vendor"
    assert resp.created_at is None
    assert resp.updated_at is None
