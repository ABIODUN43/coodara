# Codara API Specification

Version: v1.0

Status: Draft

Owner: Backend Team

Last Updated: July 2026

---

# Table of Contents

1. Overview
2. API Design Principles
3. Base URLs
4. Authentication
5. Standard Response Format
6. HTTP Status Codes
7. API Modules
8. Authentication API
9. Repository API
10. Analysis API
11. Architecture API
12. AI Chat API
13. Organizations API
14. Billing API
15. Settings API
16. Health API
17. GitHub Webhooks
18. Pagination
19. Error Codes
20. Rate Limits
21. Future APIs

---

# 1. Overview

The Codara API enables communication between:

- React Frontend
- FastAPI Backend
- AI Services
- Future Desktop Application
- CLI
- Third-party Integrations

Architecture Style

REST API

Communication

JSON

Authentication

JWT Bearer Token

API Version

v1

---

# 2. API Design Principles

The Codara API follows these principles.

• RESTful

• Predictable Endpoints

• Stateless

• JSON Only

• Versioned APIs

• Secure by Default

• OpenAPI Compatible

• Easy to Extend

Example

/api/v1/...

Future

/api/v2/...

---

# 3. Base URLs

Development

http://localhost:8000/api/v1

Production

https://api.codara.ai/api/v1

---

# 4. Authentication

Protected endpoints require:

Authorization

Bearer <access_token>

Example

Authorization: Bearer eyJhbGc...

---

# 5. Standard Response Format

Successful Response

{
    "success": true,
    "message": "Success",
    "data": {}
}

Failed Response

{
    "success": false,
    "error": {
        "code": "NOT_FOUND",
        "message": "Repository not found"
    }
}

Validation Error

{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid request."
    }
}

---

# 6. HTTP Status Codes

200 OK

201 Created

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

429 Too Many Requests

500 Internal Server Error

---

# 7. API Modules

Authentication

Repositories

Analysis

Architecture

AI Chat

Organizations

Billing

Settings

Health

GitHub Webhooks

---

# 8. Authentication API

POST

/auth/login

Description

Authenticate user.

Request

{
    "email":"user@email.com",
    "password":"password"
}

Response

{
    "success":true,
    "data":{
        "access_token":"...",
        "refresh_token":"...",
        "user":{}
    }
}

------------------------------------

POST

/auth/logout

Description

Logout user.

------------------------------------

GET

/auth/me

Returns currently authenticated user.

------------------------------------

POST

/auth/refresh

Returns a new access token.

---

# 9. Repository API

GET

/repositories

Description

Returns all repositories connected to the account.

------------------------------------

POST

/repositories

Connect GitHub repository.

Request

{
    "repository_url":
    "https://github.com/user/project"
}

------------------------------------

GET

/repositories/{id}

Returns repository details.

------------------------------------

PATCH

/repositories/{id}

Update repository information.

------------------------------------

DELETE

/repositories/{id}

Disconnect repository.

------------------------------------

POST

/repositories/{id}/sync

Synchronize latest commits.

------------------------------------

GET

/repositories/{id}/branches

Returns repository branches.

------------------------------------

GET

/repositories/{id}/commits

Returns commit history.

---

# 10. Analysis API

POST

/analysis/start

Starts repository analysis.

Request

{
    "repository_id":"..."
}

Response

{
    "analysis_id":"..."
}

------------------------------------

GET

/analysis/{analysis_id}

Returns analysis status.

Possible Status

Queued

Running

Completed

Failed

------------------------------------

GET

/analysis/{analysis_id}/metrics

Returns

Architecture Score

Complexity

Coupling

Dependency Graph

Circular Dependencies

Technical Debt

---

# 11. Architecture API

This is Codara's core API.

GET

/architecture/{repository_id}

Returns architecture overview.

------------------------------------

GET

/architecture/{repository_id}/graph

Returns architecture graph.

------------------------------------

GET

/architecture/{repository_id}/memory

Returns Architecture Memory.

------------------------------------

GET

/architecture/{repository_id}/evolution

Returns Architecture Evolution.

------------------------------------

GET

/architecture/{repository_id}/governance

Returns Governance Report.

------------------------------------

GET

/architecture/{repository_id}/intelligence

Returns AI recommendations.

------------------------------------

GET

/architecture/{repository_id}/decisions

Returns Architecture Decision History.

---

# 12. AI Chat API

POST

/chat

Request

{
    "repository_id":"...",
    "message":"Explain this architecture."
}

Response

{
    "answer":"..."
}

------------------------------------

GET

/chat/history

Returns previous conversations.

------------------------------------

DELETE

/chat/history

Deletes chat history.

---

# 13. Organizations API

GET

/organizations

Returns organizations.

------------------------------------

POST

/organizations

Create organization.

------------------------------------

GET

/organizations/{id}

Returns organization.

------------------------------------

PATCH

/organizations/{id}

Update organization.

------------------------------------

DELETE

/organizations/{id}

Delete organization.

---

# 14. Billing API

GET

/billing/plans

Returns pricing plans.

------------------------------------

GET

/billing/subscription

Returns current subscription.

------------------------------------

POST

/billing/checkout

Starts checkout.

------------------------------------

POST

/billing/cancel

Cancels subscription.

------------------------------------

POST

/billing/webhook

Payment provider webhook.

---

# 15. Settings API

GET

/settings

Returns user settings.

------------------------------------

PATCH

/settings

Updates user settings.

---

# 16. Health API

GET

/health

Returns

{
    "status":"healthy"
}

---

# 17. GitHub Webhooks

POST

/webhooks/github

Push Event

------------------------------------

POST

/webhooks/github/pull-request

Pull Request Event

------------------------------------

POST

/webhooks/github/issues

Issue Event

---

# 18. Pagination

Large collections use pagination.

Example

{
    "page":1,
    "page_size":20,
    "total":145,
    "items":[]
}

---

# 19. Error Codes

AUTH_INVALID_CREDENTIALS

AUTH_EXPIRED_TOKEN

AUTH_FORBIDDEN

USER_NOT_FOUND

REPOSITORY_NOT_FOUND

REPOSITORY_ALREADY_CONNECTED

ANALYSIS_FAILED

ARCHITECTURE_NOT_FOUND

ARCHITECTURE_GRAPH_ERROR

CHAT_LIMIT_EXCEEDED

SUBSCRIPTION_REQUIRED

RATE_LIMIT_EXCEEDED

INTEGRATION_FAILED

INTERNAL_SERVER_ERROR

---

# 20. Rate Limits

Anonymous Users

60 requests/minute

Authenticated Users

300 requests/minute

Enterprise

Unlimited (configurable)

---

# 21. Future APIs

The following modules are planned for future releases.

Teams API

Manage teams, invitations and roles.

------------------------------------

Notifications API

Architecture alerts.

Analysis completion notifications.

System notifications.

------------------------------------

Integrations API

GitHub

GitLab

Bitbucket

Azure DevOps

Jira

Linear

Slack

Microsoft Teams

------------------------------------

Reports API

Generate

PDF

Markdown

HTML

JSON

Architecture Reports

Technical Debt Reports

Architecture Evolution Reports

------------------------------------

CLI API

Support future

codara CLI

------------------------------------

SDK API

Official SDKs

Python

JavaScript

Go

Java

---

# API Naming Convention

Resources

Plural nouns

Example

/repositories

/organizations

/users

------------------------------------

Actions

Use verbs only when necessary.

Good

POST /analysis/start

POST /repositories/{id}/sync

Bad

GET /doAnalysis

GET /runRepository

---

# Security

JWT Authentication

HTTPS Only

Rate Limiting

Input Validation

Output Validation

Request Logging

Role-Based Access Control (RBAC)

Secure Headers

---

# Versioning Strategy

Current Version

/api/v1

Future

/api/v2

Breaking changes will only occur in a new API version.

---

# OpenAPI

The FastAPI backend is the single source of truth for the API.

Swagger Documentation

/docs

OpenAPI JSON

/openapi.json

Frontend TypeScript types will be automatically generated from the OpenAPI schema to ensure backend and frontend remain synchronized.

---

# Conclusion

This document defines the official API contract between the Codara frontend, backend, AI services, and future integrations. All API changes must be reviewed, documented, and versioned before implementation. New endpoints should follow the established naming conventions, response formats, authentication model, and versioning strategy to maintain consistency across the platform.