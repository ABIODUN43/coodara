# Coodara Authentication

Version: 1.0

## Overview

Coodara uses GitHub OAuth and JWT
authentication.

## Components

- security.py
- github_service.py
- auth_service.py

## Authentication Flow

User
 ↓
GitHub OAuth
 ↓
GitHub Callback
 ↓
JWT Generation
 ↓
Dashboard