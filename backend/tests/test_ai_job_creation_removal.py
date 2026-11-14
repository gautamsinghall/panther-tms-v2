import pytest
from app.modules.ai.intent_router import classify_intent_and_entities
from app.modules.ai.typed_tools import getHowTo
from app.modules.ai.router import get_job_guide_response


@pytest.mark.parametrize(
    "query",
    [
        "Create a job",
        "Book a job",
        "How do I create a job?",
        "Mujhe job banana hai",
        "Job order banao",
        "जॉब कैसे बनाएं",
        "एक जॉब बनाओ",
        "job kaise book kre",
        "job kaise banaye",
    ],
)
def test_job_creation_routed_to_how_to_guide(query):
    res = classify_intent_and_entities(query)
    assert res.intent == "how_to_create_job"
    assert res.confidence >= 0.95


@pytest.mark.parametrize(
    "query",
    [
        "lr kaise book kre",
        "lr kaise book kare",
        "kaise book kare lr",
        "lr kaise banaye",
        "bilty kaise banayein",
        "kaise kre bilty book",
        "How do I create an LR?",
    ],
)
def test_lr_creation_routed_to_how_to_guide(query):
    res = classify_intent_and_entities(query)
    assert res.intent == "how_to_create_lr"
    assert res.confidence >= 0.95


def test_is_user_permitted_with_detached_or_mock_objects():
    from app.modules.ai.tools import is_user_permitted

    class MockUser:
        id = 1
        role = "ADMIN"
        custom_role = None

    class MockTenant:
        id = "ten1"
        status = "ACTIVE"
        plan = None
        grace_period_until = None

    # Should not raise DetachedInstanceError or any exception
    assert is_user_permitted(MockUser(), MockTenant(), "transport", "lr_booking", "create") is True


def test_typed_tools_get_how_to_job():
    msg, cards, navs = getHowTo("job", lang="en")
    assert "/transport/jobs" in msg
    assert "directly by yourself" in msg.lower() or "accurate" in msg.lower()
    assert any(nav.href == "/transport/jobs" for nav in navs)
    assert len(cards) > 0
    assert cards[0].action["href"] == "/transport/jobs"


def test_get_job_guide_response():
    content, navs = get_job_guide_response(lang="en", has_old_draft=False)
    assert "/transport/jobs" in content
    assert "directly by yourself" in content
    assert any(nav.href == "/transport/jobs" for nav in navs)
