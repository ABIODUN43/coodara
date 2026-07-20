# OAuth Flow

1. User clicks GitHub login.

2. Frontend calls:

GET /auth/github

3. User authorizes GitHub.

4. GitHub redirects:

/auth/github/callback?code=xyz

5. Coodara:

- Exchanges code
- Retrieves user
- Creates JWT
- Creates session

6. Dashboard loads.