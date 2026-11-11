import os
import pytest
from app.integrations.gst_pan.client import GstPanClient


def test_normalization_gst_response():
    client = GstPanClient()
    sample_gst = {
        "stjCd": "MHCG1345",
        "lgnm": "TATA MOTORS PASSENGER VEHICLES LIMITED",
        "tradeNam": "TATA MOTORS",
        "stj": "PUNE CANTT_508",
        "dty": "Regular",
        "adadr": [
            {
                "addr": {
                    "bnm": "Bombay House",
                    "loc": "Mumbai",
                    "st": "24, Homi Mody Street",
                    "bno": "Bombay House",
                    "dst": "Mumbai",
                    "pncd": "400001",
                    "stcd": "Maharashtra"
                }
            }
        ],
        "ctb": "Private Limited Company",
        "rgdt": "12/09/2021",
        "gstin": "27AAACT2727Q1ZW"
    }

    normalized = client._normalize_taxpayer_data(sample_gst)
    assert normalized["gstin"] == "27AAACT2727Q1ZW"
    assert normalized["pan"] == "AAACT2727Q"
    assert normalized["legal_name"] == "TATA MOTORS PASSENGER VEHICLES LIMITED"
    assert normalized["trade_name"] == "TATA MOTORS"
    assert normalized["incorporation_date"] == "2021-09-12"
    assert normalized["legal_status"] == "Private Limited"
    assert "Bombay House" in normalized["address"]
    assert normalized["city"] == "Mumbai"
    assert normalized["state"] == "Maharashtra"
    assert normalized["state_code"] == "27"
    assert normalized["pincode"] == "400001"
    assert normalized["country"] == "India"
    assert normalized["billing_state"] == "Maharashtra"


def test_normalization_with_state_code_fallback():
    client = GstPanClient()
    sample_gst = {
        "lgnm": "DELHI LOGISTICS LIMITED",
        "tradeNam": "DELHI LOGISTICS",
        "rgdt": "01/01/2020",
        "ctb": "Private Limited Company",
        "gstin": "07AAAAA0000A1Z5",
        "pradr": {
            "addr": {
                "bnm": "Connaught Place",
                "loc": "New Delhi",
                "dst": "Central Delhi",
                "pncd": "110001",
                "stcd": "07"
            }
        }
    }
    normalized = client._normalize_taxpayer_data(sample_gst)
    assert normalized["gstin"] == "07AAAAA0000A1Z5"
    assert normalized["state"] == "Delhi"
    assert normalized["billing_state"] == "Delhi"
    assert normalized["incorporation_date"] == "2020-01-01"


def test_normalization_pan_response():
    client = GstPanClient()
    sample_pan_inner = {
        "lgnm": "RELIANCE RETAIL LIMITED",
        "tradeNam": "",
        "rgdt": "29/08/2006",
        "ctb": "Public Limited Company",
        "pradr": {
            "addr": {
                "bnm": "Reliance Centre",
                "loc": "Navi Mumbai",
                "st": "Thane Belapur Road",
                "bno": "Block A",
                "dst": "Thane",
                "pncd": "400701",
                "stcd": "Maharashtra"
            }
        }
    }

    normalized = client._normalize_taxpayer_data(
        sample_pan_inner,
        override_gstin="27AABCR1234M1Z5",
        override_pan="AABCR1234M"
    )
    assert normalized["gstin"] == "27AABCR1234M1Z5"
    assert normalized["pan"] == "AABCR1234M"
    assert normalized["legal_name"] == "RELIANCE RETAIL LIMITED"
    assert normalized["trade_name"] == "RELIANCE RETAIL LIMITED"
    assert normalized["incorporation_date"] == "2006-08-29"
    assert normalized["legal_status"] == "Public Limited"
    assert normalized["city"] == "Thane"
    assert normalized["state"] == "Maharashtra"
    assert normalized["pincode"] == "400701"


@pytest.mark.asyncio
async def test_live_search_when_env_credentials_available():
    cid = os.getenv("GST_PAN_CLIENT_ID") or os.getenv("GSP_CLIENT_ID")
    csecret = os.getenv("GST_PAN_CLIENT_SECRET") or os.getenv("GSP_CLIENT_SECRET")
    if not cid or not csecret:
        pytest.skip("No environment credentials configured in .env; skipping live gateway test")

    client = GstPanClient()
    pan_res = await client.search_by_pan("AAACT2727Q", "27")
    assert pan_res["success"] is True
    assert pan_res["gstin"] == "27AAACT2727Q1ZW"

