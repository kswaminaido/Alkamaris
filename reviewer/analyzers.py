import json
import os
import random
import time

from google import genai
from google.genai import types
from google.genai.errors import ServerError

from .models import Finding
from .prompts import (
    SYSTEM_PROMPT,
    build_review_prompt,
)


class AIReviewer:

    def __init__(self):

        api_key = os.getenv("GEMINI_API_KEY")

        if not api_key:
            raise RuntimeError(
                "GEMINI_API_KEY environment variable is not set."
            )

        model = os.getenv(
            "GEMINI_MODEL",
            "gemini-3.8-flash"
        )

        self.model = model

        self.client = genai.Client(
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

        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            automatic_function_calling=types.AutomaticFunctionCallingConfig(
                disable=True,
            ),
        )

        for attempt in range(3):
            try:
                response = self.client.models.generate_content(
                    model=self.model,
                    contents=prompt,
                    config=config,
                )
                break
            except ServerError as exc:
                if exc.code != 503 or attempt == 2:
                    raise
                time.sleep(2 ** attempt + random.uniform(0, 1))

        content = (response.text or "").strip()

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
