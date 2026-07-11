# Git Workflow

Version: v1.0

Status: Official

Owner: Engineering Team

Last Updated: July 2026

---

# Table of Contents

1. Purpose
2. Git Philosophy
3. Branch Strategy
4. Branch Naming Convention
5. Development Workflow
6. Commit Message Convention
7. Pull Request Workflow
8. Code Review Process
9. Merge Strategy
10. Releases
11. Hotfix Workflow
12. Versioning
13. Git Best Practices
14. Things We Avoid
15. Git Commands Cheat Sheet
16. Conclusion

---

# 1. Purpose

This document defines the Git workflow used by the Codara engineering team.

Every engineer must follow this workflow to ensure:

• Consistent development

• Clean Git history

• Safe collaboration

• Easy code reviews

• Reliable releases

---

# 2. Git Philosophy

Git is more than version control.

Git records the history of Codara.

Every commit should tell a story.

A new engineer should be able to understand the project's evolution by reading the Git history.

---

# 3. Branch Strategy

We follow a simplified GitHub Flow.

```

main
│
├── feature/authentication

├── feature/repository-upload

├── feature/architecture-memory

├── feature/analysis-engine

├── feature/dashboard-ui

├── bugfix/login-error

├── hotfix/security-patch

└── release/v1.0.0

```

---

## Main Branch

The `main` branch is always stable.

Rules:

• Always deployable

• Protected

• No direct commits

• Only merged through Pull Requests

---

## Feature Branches

Every new feature gets its own branch.

Examples:

```

feature/dashboard

feature/github-integration

feature/chat

feature/rag

feature/architecture-memory

```

---

## Bug Fix Branches

Examples:

```

bugfix/login

bugfix/token-expiration

bugfix/sidebar

```

---

## Hotfix Branches

Used only for production emergencies.

Examples:

```

hotfix/auth-bug

hotfix/payment-failure

hotfix/security

```

---

## Release Branches

Examples:

```

release/v0.1.0

release/v0.5.0

release/v1.0.0

```

---

# 4. Branch Naming Convention

Use lowercase.

Separate words with hyphens.

Good

```

feature/architecture-memory

feature/repository-analysis

bugfix/login

hotfix/security

```

Bad

```

newFeature

test

mybranch

temp

```

---

# 5. Development Workflow

Step 1

Update your local repository.

```bash
git checkout main
git pull origin main
```

---

Step 2

Create a new branch.

```bash
git checkout -b feature/dashboard
```

---

Step 3

Develop the feature.

Commit regularly.

---

Step 4

Push the branch.

```bash
git push origin feature/dashboard
```

---

Step 5

Open a Pull Request.

---

Step 6

Request code review.

---

Step 7

Address review comments.

---

Step 8

Merge into `main`.

---

Step 9

Delete the feature branch after merging.

---

# 6. Commit Message Convention

We follow the Conventional Commits specification.

Format

```
type(scope): short description
```

Examples

```
feat(auth): add JWT authentication

feat(chat): implement AI conversation endpoint

fix(api): handle invalid repository URL

docs(handbook): update engineering handbook

refactor(ai): simplify prompt builder

style(frontend): format dashboard layout

test(auth): add login endpoint tests

perf(analysis): optimize dependency parser

chore(ci): update GitHub Actions workflow
```

---

## Commit Types

| Type | Purpose |
|-------|----------|
| feat | New feature |
| fix | Bug fix |
| docs | Documentation |
| refactor | Code improvement without changing behavior |
| style | Formatting only |
| test | Tests |
| perf | Performance improvements |
| chore | Maintenance tasks |
| build | Build system changes |
| ci | CI/CD changes |

---

# 7. Pull Request Workflow

Every Pull Request should include:

Title

Summary

Problem being solved

Screenshots (if UI changes)

Testing performed

Checklist

Example

```
Title

feat(repository): add GitHub repository import

Description

Adds repository import using GitHub API.

Includes authentication.

Adds repository validation.

Tests added.

Documentation updated.
```

---

# 8. Code Review Process

At least one engineer must review every Pull Request.

Reviewers should check:

Correctness

Architecture

Coding Standards

Performance

Security

Documentation

Tests

Maintainability

Readability

Reviewers should explain requested changes clearly and respectfully.

---

# 9. Merge Strategy

Use **Squash and Merge** for feature branches.

Benefits:

• Cleaner Git history

• One commit per feature

• Easier to revert changes

Do not merge branches with unnecessary merge commits.

---

# 10. Releases

Release format:

```
vMAJOR.MINOR.PATCH
```

Examples

```
v0.1.0

v0.2.0

v1.0.0

v1.2.3
```

---

## Version Rules

Major

Breaking changes.

Minor

New features.

Patch

Bug fixes.

---

# 11. Hotfix Workflow

For production issues:

Create

```
hotfix/security
```

Fix issue.

Review quickly.

Merge into `main`.

Tag new release.

Deploy immediately.

---

# 12. Versioning

Codara follows Semantic Versioning (SemVer).

```
MAJOR.MINOR.PATCH
```

Example

```
1.4.2

Major = Breaking API

Minor = New feature

Patch = Bug fix
```

---

# 13. Git Best Practices

Commit often.

Keep commits small.

Write meaningful commit messages.

Pull before starting work.

Rebase when appropriate to keep history clean.

Delete merged branches.

Resolve conflicts promptly.

Never force-push to `main`.

Keep branches focused on one task.

---

# 14. Things We Avoid

Never commit directly to `main`.

Never commit secrets or API keys.

Never commit generated files unless required.

Never leave broken code in shared branches.

Never create huge Pull Requests that mix unrelated features.

Never use vague commit messages such as:

```
update

fix

changes

work

done

final

new
```

Every commit should clearly explain what changed.

---

# 15. Git Commands Cheat Sheet

Clone repository

```bash
git clone <repository-url>
```

Create branch

```bash
git checkout -b feature/my-feature
```

Check status

```bash
git status
```

Stage changes

```bash
git add .
```

Commit

```bash
git commit -m "feat(auth): implement JWT login"
```

Push

```bash
git push origin feature/my-feature
```

Pull latest changes

```bash
git pull origin main
```

Delete merged branch

```bash
git branch -d feature/my-feature
```

---

# 16. Conclusion

A disciplined Git workflow enables the Codara team to collaborate efficiently, maintain a clean project history, and deliver reliable software.

Every branch, commit, and Pull Request should contribute to a clear and understandable history of the project. As Codara grows, following these practices will make onboarding easier, simplify debugging, and reduce the risk of introducing errors into production.