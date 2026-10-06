from .github import GitHubClient
from .analyzers import AIReviewer


def main():

    github = GitHubClient()

    reviewer = AIReviewer()

    files = github.get_files()

    all_findings = []

    for file in files:

        if not file.patch:
            continue

        filename = file.filename

        # Skip generated files
        if filename.startswith("vendor/"):
            continue

        if filename.startswith("node_modules/"):
            continue

        findings = reviewer.review(
            filename=filename,
            patch=file.patch
        )

        all_findings.extend(findings)

    # Remove duplicates

    unique = {}

    for finding in all_findings:

        key = (
            finding.file,
            finding.line,
            finding.message
        )

        unique[key] = finding

    findings = list(unique.values())

    # Publish comments

    commit_id = github.pull_request.head.sha

    for finding in findings:

        body = (
            f"**{finding.severity.upper()} "
            f"— {finding.category.upper()}**\n\n"
            f"{finding.message}"
        )

        if finding.suggestion:

            body += (
                "\n\n**Suggestion:**\n"
                f"{finding.suggestion}"
            )

        github.create_comment(
            body=body,
            commit_id=commit_id,
            path=finding.file,
            line=finding.line
        )

    # Summary

    summary = create_summary(findings)

    github.create_review(summary)


def create_summary(findings):

    if not findings:

        return """
## 🤖 AI Code Review

No issues were identified in the changed code.

✅ Syntax
✅ Code quality
✅ Duplicate code
✅ Spelling
✅ Test coverage
"""

    counts = {}

    for finding in findings:

        severity = finding.severity

        counts[severity] = (
            counts.get(severity, 0) + 1
        )

    summary = """
## 🤖 AI Code Review

The automated reviewer found the following issues:

"""

    for severity, count in counts.items():

        summary += (
            f"- **{severity.title()}**: "
            f"{count}\n"
        )

    summary += """

Please review the inline comments before merging.
"""

    return summary


if __name__ == "__main__":
    main()