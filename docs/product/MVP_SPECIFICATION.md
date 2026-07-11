# Codara MVP Specification

Version: 1.0

Status: Official

Owner: Product & Engineering

Last Updated: July 2026

---

# Table of Contents

1. Purpose
2. MVP Goals
3. MVP Scope
4. User Journey
5. Pages
6. Backend APIs
7. Database Tables
8. Core Features
9. AI Features
10. Architecture Features
11. Non-MVP Features
12. Acceptance Criteria
13. Release Checklist

---

# 1. Purpose

This document defines exactly what will be included in Codara Version 1.0 (MVP).

The MVP should solve one problem exceptionally well:

Help developers understand the architecture of their software using AI.

Everything in this document is considered part of the first public beta.

Anything not listed is considered out of scope.

---

# 2. MVP Goals

Users should be able to:

✓ Sign in

✓ Connect GitHub

✓ Import repositories

✓ Analyze repositories

✓ Generate architecture diagrams

✓ View architecture insights

✓ Chat with AI

✓ Store architecture history

✓ Return later to previous analyses

---

# 3. MVP Scope

Included

Authentication

GitHub OAuth

Organizations

Repository Import

Repository Analysis

Architecture Diagram

Architecture Memory

AI Chat

Dashboard

Profile

Settings

Analysis History

Excluded

Billing

Enterprise Governance

Slack Integration

VS Code Extension

CLI

Predictive AI

Multi-repository analysis

Marketplace

Plugins

---

# 4. User Journey

Landing Page

↓

Login with GitHub

↓

Dashboard

↓

Import Repository

↓

Repository Analysis

↓

Architecture Generated

↓

Architecture Score

↓

AI Chat

↓

Architecture Memory

↓

Analysis History

---

# 5. Pages

## Landing

Purpose

Introduce Codara.

Components

Hero

Features

Benefits

Pricing (Coming Soon)

FAQ

Footer

Buttons

Login

GitHub

Documentation

---

## Authentication

GitHub OAuth

Email Login (optional future)

Session Management

Logout

---

## Dashboard

Cards

Recent Repositories

Recent Analyses

Architecture Score

Recent AI Chats

Quick Actions

---

## Repository

Repository List

Repository Details

Repository Import

Analysis Status

Branches

Commits

---

## Analysis

Technology Stack

Languages

Dependencies

Repository Metrics

Complexity

Architecture Summary

---

## Architecture

Architecture Diagram

Dependency Graph

Architecture Memory Timeline

Architecture Evolution (basic)

Architecture Score

Detected Issues

Recommendations

---

## AI Chat

Conversation

Streaming Responses

Suggested Questions

Repository Context

Conversation History

---

## Profile

Personal Information

GitHub Account

Organizations

Preferences

---

## Settings

Theme

Notifications

Security

Connected Accounts

API Settings (future)

---

# 6. Backend APIs

Authentication

POST /auth/login

POST /auth/logout

GET /auth/me

Repositories

GET /repositories

POST /repositories

GET /repositories/{id}

DELETE /repositories/{id}

Analysis

POST /analysis/{repository_id}

GET /analysis/{id}

Architecture

GET /architecture/{repository_id}

GET /architecture/history/{repository_id}

Chat

POST /chat

GET /chat/history

Organizations

GET /organizations

POST /organizations

Settings

GET /settings

PUT /settings

---

# 7. Database Tables

Users

Organizations

Organization Members

Repositories

Branches

Commits

Analysis

Architecture Snapshots

Architecture Decisions

Architecture Scores

Conversations

Messages

Embeddings

Settings

Audit Logs

---

# 8. Core Features

## Authentication

GitHub OAuth

JWT

Protected Routes

Session Management

---

## Repository Import

GitHub Integration

Clone Repository

Store Metadata

Branch Selection

---

## Repository Analysis

Language Detection

Dependency Analysis

Metrics

Project Structure

Technology Detection

---

## Architecture Generation

Component Graph

Dependency Graph

Architecture Summary

Architecture Score

---

## Architecture Memory

Snapshots

Timeline

History

Architecture Decisions

---

## AI Chat

Repository-aware Chat

Architecture Questions

Code Explanation

Summary Generation

Conversation History

---

# 9. AI Features

LLM Integration

Embeddings

RAG

Prompt Templates

Conversation Memory

Repository Context

Architecture Context

Architecture Explanation

Future Recommendations (basic)

---

# 10. Architecture Features

Architecture Memory

Architecture Intelligence

Architecture Evolution (basic)

Architecture Score

Architecture Recommendations

Dependency Visualization

Architecture Timeline

---

# 11. Non-MVP Features

Not included in Version 1.

Enterprise Governance

Billing

Team Collaboration

Comments

Notifications

Slack Integration

VS Code Extension

CLI

Architecture Prediction

Architecture Forecasting

Advanced Compliance

Custom AI Models

Marketplace

---

# 12. Acceptance Criteria

Authentication

✓ User logs in successfully.

✓ Protected routes work.

Repository

✓ Repository imports successfully.

✓ Repository metadata stored.

Analysis

✓ Repository analyzed successfully.

✓ Technologies detected.

Architecture

✓ Diagram generated.

✓ Architecture score displayed.

AI

✓ User can ask architecture questions.

✓ AI uses repository context.

Dashboard

✓ Shows recent repositories.

✓ Shows recent analyses.

✓ Shows architecture score.

History

✓ Previous analyses available.

✓ Architecture snapshots stored.

---

# 13. Release Checklist

Backend

✓ APIs complete

✓ Database migrations complete

✓ Authentication complete

✓ AI integration complete

✓ Logging complete

✓ Testing complete

Frontend

✓ Landing page complete

✓ Dashboard complete

✓ Repository pages complete

✓ Architecture page complete

✓ AI Chat complete

✓ Responsive UI complete

Infrastructure

✓ Docker

✓ PostgreSQL

✓ Redis

✓ Background Workers

✓ Monitoring

Documentation

✓ API documentation

✓ Engineering handbook

✓ Architecture documentation

✓ README updated

---

# Definition of MVP Success

Version 1.0 is considered successful if a new user can:

1. Visit the landing page.
2. Sign in with GitHub.
3. Import a repository.
4. Analyze the repository.
5. View the generated architecture.
6. Understand architecture insights.
7. Chat with the AI about the repository.
8. Return later and continue from previous analyses without losing context.

---

# Conclusion

The Codara MVP is designed to validate the core vision of Software Architecture Intelligence.

The focus is on delivering a seamless experience that enables developers to import repositories, understand their architecture, interact with AI, and build a persistent architectural memory.

Features outside this scope will be introduced in future releases once the core workflow has been validated with real users.