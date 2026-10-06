import json
import os

from openai import OpenAI

from .models import Finding
from .prompts import (
    SYSTEM_PROMPT,
    build_review_prompt,
)


class AIReviewer:

    def __init__(self):

        api_key = os.getenv("OPENAI_API_KEY")

        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY environment variable is not set."
            )

        model = os.getenv(
            "OPENAI_MODEL",
            "gpt-5"
        )

        self.model = model

        self.client = OpenAI(
            api_key=api_key
        )

    def review(
        self,
        filename: str,
        patch: str,
        project_context: str = "",
    ) -> list[Finding]:

        prompt = build_review_prompt(
            filename=filename,
            patch=patch,
            project_context=project_context,
        )

        response = self.client.responses.create(
            model=self.model,
            instructions=SYSTEM_PROMPT,
            input=prompt,
        )

        content = response.output_text.strip()

        if not content:
            return []

        try:

            data = json.loads(content)

        except json.JSONDecodeError as exc:

            raise RuntimeError(
                "AI returned invalid JSON."
            ) from exc

        findings = []

        for item in data:

            findings.append(
                Finding(**item)
            )

        return findings