import json
from types import SimpleNamespace
from unittest.mock import Mock

import pytest
from google.genai.errors import ServerError

from reviewer.analyzers import AIReviewer
from reviewer.models import Finding
from reviewer.diff import get_changed_lines


def test_changed_lines():

    patch = """
@@ -10,3 +10,5 @@
 existing code
+new code
+another new line
 """

    result = get_changed_lines(patch)

    assert len(result) == 2

    assert result[0]["line"] == 11
    assert result[0]["content"] == "new code"

    assert result[1]["line"] == 12
    assert result[1]["content"] == "another new line"


def test_finding_model():

    finding = Finding(
        file="app/User.php",
        line=42,
        severity="medium",
        category="duplicate",
        message="Duplicate logic detected.",
        suggestion="Extract shared logic.",
    )

    assert finding.file == "app/User.php"
    assert finding.line == 42
    assert finding.severity == "medium"
    assert finding.category == "duplicate"


def test_finding_model_without_suggestion():

    finding = Finding(
        file="app/User.php",
        line=10,
        severity="low",
        category="spelling",
        message="Spelling mistake.",
    )

    assert finding.suggestion is None


def test_finding_json():

    finding = Finding(
        file="app/User.php",
        line=10,
        severity="low",
        category="spelling",
        message="Spelling mistake.",
        suggestion="Correct the spelling.",
    )

    data = json.loads(
        finding.model_dump_json()
    )

    assert data["file"] == "app/User.php"
    assert data["line"] == 10
    assert data["category"] == "spelling"


def test_invalid_severity():

    with pytest.raises(ValueError):

        Finding(
            file="app/User.php",
            line=10,
            severity="unknown",
            category="spelling",
            message="Test",
        )


def test_reviewer_retries_temporary_gemini_outage(monkeypatch):
    monkeypatch.setattr("reviewer.analyzers.time.sleep", lambda _: None)
    reviewer = AIReviewer.__new__(AIReviewer)
    reviewer.model = "gemini-3.8-flash"
    generate = Mock(side_effect=[
        ServerError(503, {"error": {"message": "high demand"}}),
        SimpleNamespace(text="[]"),
    ])
    reviewer.client = SimpleNamespace(models=SimpleNamespace(generate_content=generate))

    assert reviewer.review("app/User.php", "+new code") == []
    assert generate.call_count == 2
    assert generate.call_args.kwargs["config"].automatic_function_calling.disable
