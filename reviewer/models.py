from pydantic import BaseModel
from typing import Literal


class Finding(BaseModel):

    file: str

    line: int

    severity: Literal[
        "critical",
        "high",
        "medium",
        "low"
    ]

    category: Literal[
        "syntax",
        "duplicate",
        "spelling",
        "test",
        "security",
        "bug",
        "quality",
        "performance"
    ]

    message: str

    suggestion: str | None = None