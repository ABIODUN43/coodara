# Codara Coding Standards

Version: v1.0

Status: Official

Owner: Engineering Team

Last Updated: July 2026

---

# Table of Contents

1. Purpose
2. Engineering Philosophy
3. General Coding Principles
4. Naming Conventions
5. Project Structure
6. Python Standards
7. TypeScript Standards
8. React Standards
9. FastAPI Standards
10. Database Standards
11. API Standards
12. Error Handling
13. Logging
14. Documentation
15. Testing
16. AI-Assisted Development
17. Code Review Checklist
18. Things We Avoid
19. Definition of Done
20. Conclusion

---

# 1. Purpose

This document defines the coding standards for every engineer contributing to Codara.

Our goals are:

• Readability

• Maintainability

• Consistency

• Scalability

• Security

• Simplicity

Code is read far more often than it is written.

---

# 2. Engineering Philosophy

At Codara, we write code for humans first and computers second.

Every engineer should aim to produce code that is:

Easy to understand

Easy to test

Easy to refactor

Easy to review

Easy to extend

---

# 3. General Coding Principles

Always write code that is:

Simple

Predictable

Consistent

Reusable

Testable

Avoid unnecessary complexity.

Prefer clarity over cleverness.

Small improvements made consistently are better than large rewrites.

---

# 4. Naming Conventions

## Variables

Use descriptive names.

Good

```python
repository_name
analysis_result
architecture_score
```

Bad

```python
x
temp
data
```

---

## Functions

Functions should describe an action.

Good

```python
analyze_repository()

generate_embeddings()

calculate_score()
```

Bad

```python
run()

process()

do_it()
```

---

## Classes

Use PascalCase.

```python
RepositoryAnalyzer

ArchitectureEngine

EmbeddingService
```

---

## Constants

Use uppercase.

```python
MAX_FILE_SIZE

DEFAULT_TIMEOUT

SUPPORTED_LANGUAGES
```

---

## Files

Use snake_case for Python.

```text
analysis_service.py

architecture_engine.py

repository_parser.py
```

Use kebab-case for documentation.

```text
coding-standards.md

api-specification.md
```

---

# 5. Project Structure

Follow the official repository structure.

Do not create random folders.

Business logic belongs in:

services/

Database access belongs in:

repositories/

Routes belong in:

api/

AI belongs in:

ai/

Architecture logic belongs in:

architecture/

Analysis logic belongs in:

analysis/

---

# 6. Python Standards

Use Python 3.12+

Always use:

Type hints

Pydantic models

Dataclasses where appropriate

Meaningful exceptions

Prefer:

```python
def analyze(repo: Repository) -> AnalysisResult:
```

Instead of:

```python
def analyze(repo):
```

---

## Imports

Standard library

↓

Third-party packages

↓

Local imports

Example:

```python
import os

from fastapi import APIRouter

from app.services.analysis_service import AnalysisService
```

---

## Functions

Functions should do one thing.

Prefer:

20–40 lines.

Avoid functions longer than 100 lines.

---

## Classes

One class

↓

One responsibility.

---

# 7. TypeScript Standards

Use strict mode.

Avoid:

```typescript
any
```

Prefer:

```typescript
interface Repository

type AnalysisResponse
```

Generate API types from FastAPI's OpenAPI schema instead of writing duplicate interfaces by hand.

---

# 8. React Standards

Prefer functional components.

Use hooks.

Keep components small.

Move API calls into:

api/

Move business logic into:

features/

Avoid deeply nested components.

Use reusable UI components.

---

# 9. FastAPI Standards

Routes should only:

Validate input

Call services

Return responses

Business logic must not live inside route handlers.

Example:

Bad

```python
@router.post("/")
def create():
    # 200 lines
```

Good

```python
@router.post("/")
def create():
    return service.create()
```

---

# 10. Database Standards

Always use SQLAlchemy ORM.

Use UUID primary keys.

Avoid raw SQL unless necessary.

Use migrations for schema changes.

Never modify production tables manually.

---

# 11. API Standards

Every endpoint must:

Validate input

Validate authentication

Return proper HTTP status codes

Return JSON

Be documented automatically through OpenAPI

Example response:

```json
{
  "success": true,
  "data": {},
  "message": "Repository analyzed successfully."
}
```

Error response:

```json
{
  "success": false,
  "error": {
    "code": "REPOSITORY_NOT_FOUND",
    "message": "Repository does not exist."
  }
}
```

---

# 12. Error Handling

Never silently ignore exceptions.

Do not use:

```python
except:
    pass
```

Instead:

Catch specific exceptions.

Log the error.

Return meaningful messages.

Raise custom exceptions when appropriate.

---

# 13. Logging

Use structured logging.

Every log should include:

Timestamp

Level

Module

Request ID (if available)

Never log:

Passwords

API keys

JWT tokens

Secrets

Personal data

---

# 14. Documentation

Public classes

↓

Must have docstrings.

Public functions

↓

Must have docstrings.

Complex logic

↓

Must include explanatory comments.

Keep documentation synchronized with the code.

---

# 15. Testing

Every feature should include tests.

Testing levels:

Unit Tests

Integration Tests

API Tests

End-to-End Tests (where applicable)

Critical business logic should not be merged without tests.

---

# 16. AI-Assisted Development

AI tools (ChatGPT, Codex, GitHub Copilot, Claude, Gemini, etc.) are encouraged to improve productivity.

However:

Never copy AI-generated code blindly.

Every engineer is responsible for understanding every line of code they submit.

Before committing AI-assisted code:

Read it carefully.

Understand how it works.

Refactor it if necessary.

Ensure it follows Codara's coding standards.

Verify correctness with testing.

Code ownership always belongs to the engineer who submits it, not the AI tool.

---

# 17. Code Review Checklist

Before approving a Pull Request, reviewers should verify:

Correctness

Readability

Performance

Security

Maintainability

Error handling

Logging

Tests

Documentation

Architecture compliance

If any major concern exists, request changes before approval.

---

# 18. Things We Avoid

We do not allow:

God classes

God functions

Duplicate code

Magic numbers

Hardcoded secrets

Deep nesting

Unused code

Commented-out code

Unnecessary abstraction

Premature optimization

Code that only its author understands

---

# 19. Definition of Done

A task is considered complete only when:

The feature works as intended.

Coding standards are followed.

Tests pass.

Documentation is updated.

Code review is approved.

No critical bugs remain.

The feature is merged into the appropriate branch.

---

# 20. Conclusion

Coding standards are not about restricting creativity.

They exist to ensure that every engineer can confidently read, understand, maintain, and extend the Codara codebase.

Consistent code reduces bugs, accelerates onboarding, simplifies reviews, and allows the engineering team to focus on solving meaningful problems rather than deciphering inconsistent implementations.

Quality is a habit, not an afterthought.