# 🤖 AI Code Reviewer

An automated GitHub Pull Request code review agent that analyzes changed code and posts review comments directly on Pull Requests.

The reviewer combines static analysis tools with AI to identify:

- Syntax errors
- Bugs
- Duplicate code
- Spelling mistakes
- Security problems
- Performance issues
- Missing validation
- Missing error handling
- Missing test cases
- Code-quality problems
- Maintainability issues

---

## Architecture

```text
Developer
    |
    | Creates / updates Pull Request
    v
GitHub Pull Request
    |
    v
GitHub Actions
    |
    +-----------------------+
    |                       |
    v                       v
Static Analysis          AI Reviewer
    |                       |
    |                       |
    +-----------+-----------+
                |
                v
        Finding Aggregator
                |
                v
        Confidence Filter
                |
                v
        GitHub PR Comments
```

---

# Project Structure

```text
ai-code-reviewer/
│
├── .github/
│   └── workflows/
│       └── code-review.yml
│
├── reviewer/
│   ├── __init__.py
│   ├── agent.py
│   ├── analyzers.py
│   ├── diff.py
│   ├── github.py
│   ├── models.py
│   └── prompts.py
│
├── tests/
│   └── test_agent.py
│
├── .env
├── .gitignore
├── requirements.txt
└── README.md
```

---

# Requirements

- Python 3.11+
- GitHub repository
- GitHub Actions enabled
- Gemini API key

---

# 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/ai-code-reviewer.git
```

```bash
cd ai-code-reviewer
```

---

# 2. Create Python virtual environment

Windows:

```powershell
python -m venv venv
```

Activate:

```powershell
venv\Scripts\activate
```

Linux/macOS:

```bash
python3 -m venv venv
```

```bash
source venv/bin/activate
```

---

# 3. Install dependencies

```bash
pip install -r requirements.txt
```

---

# 4. Configure Gemini

Create a Gemini API key in Google AI Studio.

Create a `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Never commit `.env` to GitHub.

Add this to `.gitignore`:

```gitignore
.env
venv/
__pycache__/
.pytest_cache/
```

---

# 5. GitHub Token

When running inside GitHub Actions, you do NOT need to manually create a `GITHUB_TOKEN`.

GitHub automatically creates a repository-scoped `GITHUB_TOKEN` for every workflow job.

The workflow should use:

```yaml
permissions:
  contents: read
  pull-requests: write
```

and:

```yaml
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

# 6. Add Gemini secret to GitHub

Open your repository:

```text
Repository
    ↓
Settings
    ↓
Secrets and variables
    ↓
Actions
    ↓
New repository secret
```

Create:

```text
Name:
GEMINI_API_KEY
```

Value:

```text
your Gemini API key
```

Do not create a `GITHUB_TOKEN` secret manually.

---

# 7. GitHub Actions workflow

Create:

```text
.github/workflows/code-review.yml
```

```yaml
name: AI Code Review

on:
  pull_request:
    types:
      - opened
      - synchronize
      - reopened

permissions:
  contents: read
  pull-requests: write

jobs:
  code-review:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: |
          pip install -r requirements.txt

      - name: Run AI Code Review
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GEMINI_MODEL: gemini-2.5-flash
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY: ${{ github.repository }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
        run: |
          python -m reviewer.agent
```

---

# 8. Run tests

Run:

```bash
pytest
```

Expected result:

```text
5 passed
```

---

# 9. How the reviewer works

When a developer creates a Pull Request:

```text
Pull Request
     |
     v
GitHub Action
     |
     v
Get changed files
     |
     v
Get Git diff
     |
     v
AI Code Review
     |
     v
Generate structured findings
     |
     v
Validate findings
     |
     v
Post inline GitHub comments
```

---

# 10. Example finding

The AI may detect:

```php
$user = User::find($id);
```

and determine that the same query already exists elsewhere.

The Pull Request receives:

```text
🟠 MEDIUM — DUPLICATE

This query duplicates logic already used
in another method.

Suggestion:

Extract the shared user lookup into a
reusable method or service.
```

---

# 11. Spelling detection

Example:

```php
return response()->json([
    'message' => 'User sucessfully created'
]);
```

The reviewer can report:

```text
🟡 LOW — SPELLING

"sucessfully" is misspelled.

Suggestion:
Change it to "successfully".
```

---

# 12. Missing tests

If a Pull Request adds:

```php
public function deleteUser($id)
{
    User::findOrFail($id)->delete();

    return response()->json([
        'message' => 'User deleted'
    ]);
}
```

but does not add tests, the reviewer can report:

```text
🟠 MEDIUM — TEST

A new delete operation was introduced,
but no corresponding feature test was found.

Recommended tests:

- Successful deletion
- Missing user
- Unauthorized deletion
```

---

# 13. Static analysis

AI should not be responsible for every type of code problem.

For PHP projects, use:

```text
PHPStan
PHPCPD
PHP CS Fixer
PHPUnit
```

For JavaScript/React:

```text
ESLint
Prettier
Jest
```

For security:

```text
Semgrep
```

The recommended architecture is:

```text
Static Analysis
       +
AI Analysis
       |
       v
Combined Findings
```

---

# 14. Laravel support

The reviewer can be extended to detect Laravel-specific problems such as:

- N+1 queries
- Missing eager loading
- Missing FormRequest validation
- Incorrect HTTP status codes
- Missing authorization
- Incorrect middleware
- Mass-assignment issues
- Missing database indexes
- Poor Eloquent queries
- Missing API tests
- Missing feature tests

---

# 15. React support

The reviewer can also detect React problems such as:

- Missing useEffect dependencies
- Unnecessary re-renders
- State mutation
- Missing list keys
- Incorrect async handling
- Missing error handling
- Unused imports
- Incorrect API handling

---

# 16. Security

Never commit:

```text
GEMINI_API_KEY
GitHub Personal Access Tokens
Private keys
Database passwords
AWS credentials
```

Use:

```text
GitHub Secrets
Environment variables
Secret managers
```

---

# 17. Future improvements

Planned improvements:

- Laravel-specific reviewer
- React-specific reviewer
- Automatic test generation
- Duplicate-code detector
- Security analyzer
- PHPStan integration
- ESLint integration
- PHPCPD integration
- Semgrep integration
- Review confidence scoring
- Review dashboard
- PR approval/blocking rules
- GitHub App support
- Multi-repository support

---

# 18. Goal

The final developer experience should be:

```text
Developer creates PR
        ↓
AI reviewer starts automatically
        ↓
Code is analyzed
        ↓
Issues are detected
        ↓
Comments appear directly
on changed lines
        ↓
Developer fixes issues
        ↓
Developer pushes again
        ↓
AI reviews the new changes
```

The goal is to make code review faster while keeping the final decision with human developers.
