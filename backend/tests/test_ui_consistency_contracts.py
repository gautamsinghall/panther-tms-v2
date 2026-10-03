from types import SimpleNamespace

from app.modules.home.service import IN_TRANSIT_LR_STATUSES, summarize_lr_statuses


def test_dashboard_in_transit_kpi_and_funnel_share_one_status_mapping():
    lrs = [
        SimpleNamespace(status="BOOKED"),
        SimpleNamespace(status="DISPATCHED"),
        SimpleNamespace(status="IN_TRANSIT"),
        SimpleNamespace(status="DELIVERED"),
        SimpleNamespace(status="POD_VERIFIED"),
    ]

    counts = summarize_lr_statuses(lrs)

    assert IN_TRANSIT_LR_STATUSES == ("DISPATCHED", "IN_TRANSIT")
    assert counts["BOOKED"] == 1
    assert counts["IN_TRANSIT"] == 2
    assert counts["DELIVERED"] == 1
    assert counts["POD_VERIFIED"] == 1

