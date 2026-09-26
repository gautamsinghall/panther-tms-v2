import pytest
from app.core.errors import AppException
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.tenant_db.models import TenantBase, SeriesMaster
from app.modules.settings.series_service import (
    STANDARD_VOUCHER_METADATA,
    allocate_or_validate_voucher_number,
    compute_series_display_data,
    initialize_all_standard_series,
    check_series_status,
)


@pytest.mark.asyncio
async def test_standard_vouchers_catalog_and_mandatory_rules():
    # 1. Total standard vouchers should be 15
    assert len(STANDARD_VOUCHER_METADATA) == 15

    # 2. Check 4 mandatory manual vouchers
    mandatory_codes = {"LR", "HIRE_CHALLAN", "TRANSPORT_INVOICE", "GENERAL_INVOICE"}
    for meta in STANDARD_VOUCHER_METADATA:
        code = meta["document_type"]
        if code in mandatory_codes:
            assert meta["is_mandatory_manual"] is True, f"{code} should be mandatory manual"
            assert meta["series_mode"] == "MANUAL", f"{code} should default to MANUAL"
        else:
            assert meta["is_mandatory_manual"] is False, f"{code} should default to AUTOMATIC"
            assert meta["series_mode"] == "AUTOMATIC", f"{code} should default to AUTOMATIC"


@pytest.mark.asyncio
async def test_series_allocation_and_manual_enforcement():
    # Setup in-memory sqlite async db
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async with async_session() as session:
        # Case 1: Mandatory Manual Voucher (LR) without series configured
        with pytest.raises(AppException) as exc_info:
            await allocate_or_validate_voucher_number(
                db=session,
                document_type="LR",
                manual_number=None,
                financial_year="2026-2027",
            )
        assert exc_info.value.status_code == 400
        assert "Manual series is mandatory" in exc_info.value.message

        # Case 2: Configure LR series as MANUAL
        lr_series = SeriesMaster(
            document_type="LR",
            prefix="LR-2026-",
            suffix="-DEL",
            starting_number=1,
            current_number=0,
            financial_year="2026-2027",
            series_mode="MANUAL",
            is_active=True,
        )
        session.add(lr_series)
        await session.commit()

        # Check status
        status = await check_series_status(session, "LR")
        assert status["configured"] is True
        assert status["series_mode"] == "MANUAL"
        assert status["prefix"] == "LR-2026-"
        assert status["suffix"] == "-DEL"
        assert status["next_number"] == 1
        assert status["next_number_formatted"] == "LR-2026-0001-DEL"

        # With series configured: creating without manual voucher number defaults to configured next number
        auto_assigned = await allocate_or_validate_voucher_number(
            db=session,
            document_type="LR",
            manual_number=None,
            financial_year="2026-2027",
        )
        assert auto_assigned == "LR-2026-0001-DEL"
        assert lr_series.current_number == 1

        # Valid manual voucher creation with user-specified sequence (e.g., physical book page "0005")
        assigned = await allocate_or_validate_voucher_number(
            db=session,
            document_type="LR",
            manual_number="0005",
            financial_year="2026-2027",
        )
        assert assigned == "LR-2026-0005-DEL"
        assert lr_series.current_number == 5

        # Case 3: Automatic Series (e.g., PAYMENT_VOUCHER)
        pv_series = SeriesMaster(
            document_type="PAYMENT_VOUCHER",
            prefix="PV/26/",
            suffix="/HO",
            starting_number=100,
            current_number=0,
            financial_year="2026-2027",
            series_mode="AUTOMATIC",
            is_active=True,
        )
        session.add(pv_series)
        await session.commit()

        # Display data computation
        pv_display = compute_series_display_data(pv_series)
        assert pv_display["last_used_formatted"] is None
        assert pv_display["next_number"] == 100
        assert pv_display["next_number_formatted"] == "PV/26/0100/HO"
        assert pv_display["is_mandatory_manual"] is False

        # First allocation
        num1 = await allocate_or_validate_voucher_number(
            db=session,
            document_type="PAYMENT_VOUCHER",
            manual_number=None,
            financial_year="2026-2027",
        )
        assert num1 == "PV/26/0100/HO"
        assert pv_series.current_number == 100

        # Second allocation
        num2 = await allocate_or_validate_voucher_number(
            db=session,
            document_type="PAYMENT_VOUCHER",
            manual_number=None,
            financial_year="2026-2027",
        )
        assert num2 == "PV/26/0101/HO"
        assert pv_series.current_number == 101

        pv_display2 = compute_series_display_data(pv_series)
        assert pv_display2["last_used_formatted"] == "PV/26/0101/HO"
        assert pv_display2["next_number"] == 102
        assert pv_display2["next_number_formatted"] == "PV/26/0102/HO"

    await engine.dispose()


@pytest.mark.asyncio
async def test_initialize_all_standard_series():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(TenantBase.metadata.create_all)

    async with async_session() as session:
        created = await initialize_all_standard_series(session, financial_year="2026-2027")
        assert len(created) == 15

        for item in created:
            if item["document_type"] in ["LR", "HIRE_CHALLAN", "TRANSPORT_INVOICE", "GENERAL_INVOICE"]:
                assert item["series_mode"] == "MANUAL"
                assert item["is_mandatory_manual"] is True
            else:
                assert item["series_mode"] == "AUTOMATIC"
                assert item["is_mandatory_manual"] is False
            assert "prefix" in item
            assert "next_number_formatted" in item

    await engine.dispose()

