import os

from github import Github


class GitHubClient:

    def __init__(self):
        token = os.environ["GITHUB_TOKEN"]

        self.github = Github(token)

        repository_name = os.environ["GITHUB_REPOSITORY"]

        self.repository = self.github.get_repo(repository_name)

        self.pr_number = int(os.environ["PR_NUMBER"])

        self.pull_request = self.repository.get_pull(
            self.pr_number
        )

    def get_files(self):
        return list(self.pull_request.get_files())

    def get_diff(self):
        files = self.get_files()

        result = []

        for file in files:
            result.append({
                "filename": file.filename,
                "status": file.status,
                "patch": file.patch or "",
                "additions": file.additions,
                "deletions": file.deletions,
            })

        return result

    def create_comment(
        self,
        body,
        commit_id,
        path,
        line,
        side="RIGHT"
    ):
        self.pull_request.create_review_comment(
            body=body,
            commit_id=commit_id,
            path=path,
            line=line,
            side=side,
        )

    def create_review(self, body):
        self.pull_request.create_review(
            body=body
        )