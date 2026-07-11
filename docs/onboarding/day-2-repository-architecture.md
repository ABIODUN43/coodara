codara/
│
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── CHANGELOG.md
├── .gitignore
├── .editorconfig
├── .dockerignore
├── .env.example
├── docker-compose.yml
├── pnpm-workspace.yaml
│
├── apps/
│   │
│   ├── frontend/
│   │   │
│   │   ├── public/
│   │   │   ├── favicon.ico
│   │   │   ├── robots.txt
│   │   │   ├── manifest.json
│   │   │   └── images/
│   │   │
│   │   ├── src/
│   │   │   │
│   │   │   ├── api/
│   │   │   │   ├── client.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── repositories.ts
│   │   │   │   ├── architecture.ts
│   │   │   │   ├── analysis.ts
│   │   │   │   ├── chat.ts
│   │   │   │   ├── organizations.ts
│   │   │   │   ├── billing.ts
│   │   │   │   └── settings.ts
│   │   │   │
│   │   │   ├── assets/
│   │   │   │   ├── fonts/
│   │   │   │   ├── icons/
│   │   │   │   ├── illustrations/
│   │   │   │   ├── logos/
│   │   │   │   └── images/
│   │   │   │
│   │   │   ├── components/
│   │   │   │   ├── common/
│   │   │   │   ├── ui/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── repositories/
│   │   │   │   ├── architecture/
│   │   │   │   ├── analysis/
│   │   │   │   ├── chat/
│   │   │   │   ├── navigation/
│   │   │   │   ├── forms/
│   │   │   │   └── feedback/
│   │   │   │
│   │   │   ├── features/
│   │   │   │   ├── authentication/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── repositories/
│   │   │   │   ├── architecture/
│   │   │   │   ├── analysis/
│   │   │   │   ├── chat/
│   │   │   │   ├── organizations/
│   │   │   │   ├── billing/
│   │   │   │   └── settings/
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   ├── useRepository.ts
│   │   │   │   ├── useArchitecture.ts
│   │   │   │   ├── useAnalysis.ts
│   │   │   │   └── useChat.ts
│   │   │   │
│   │   │   ├── layouts/
│   │   │   │   ├── MarketingLayout.tsx
│   │   │   │   ├── DashboardLayout.tsx
│   │   │   │   ├── AuthLayout.tsx
│   │   │   │   └── SettingsLayout.tsx
│   │   │   │
│   │   │   ├── pages/
│   │   │   │
│   │   │   │   ├── marketing/
│   │   │   │   │   ├── Home/
│   │   │   │   │   ├── Features/
│   │   │   │   │   ├── Pricing/
│   │   │   │   │   ├── Documentation/
│   │   │   │   │   ├── About/
│   │   │   │   │   └── Contact/
│   │   │   │   │
│   │   │   │   ├── auth/
│   │   │   │   │   └── Login/
│   │   │   │   │
│   │   │   │   ├── dashboard/
│   │   │   │   ├── repositories/
│   │   │   │   ├── repository/
│   │   │   │   ├── architecture/
│   │   │   │   ├── analysis/
│   │   │   │   ├── chat/
│   │   │   │   ├── organizations/
│   │   │   │   ├── billing/
│   │   │   │   ├── settings/
│   │   │   │   ├── profile/
│   │   │   │   └── not-found/
│   │   │   │
│   │   │   ├── providers/
│   │   │   │   ├── AuthProvider.tsx
│   │   │   │   ├── QueryProvider.tsx
│   │   │   │   ├── ThemeProvider.tsx
│   │   │   │   └── NotificationProvider.tsx
│   │   │   │
│   │   │   ├── routes/
│   │   │   ├── store/
│   │   │   ├── styles/
│   │   │   ├── types/
│   │   │   │   ├── generated/
│   │   │   │   └── ui/
│   │   │   ├── utils/
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   │
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── README.md
│   │
│   └── backend/
│       │
│       ├── app/
│       │   │
│       │   ├── api/
│       │   │   ├── dependencies.py
│       │   │   ├── router.py
│       │   │   └── v1/
│       │   │       ├── auth.py
│       │   │       ├── repositories.py
│       │   │       ├── architecture.py
│       │   │       ├── analysis.py
│       │   │       ├── chat.py
│       │   │       ├── organizations.py
│       │   │       ├── billing.py
│       │   │       └── settings.py
│       │   │
│       │   ├── core/
│       │   │   ├── config.py
│       │   │   ├── security.py
│       │   │   ├── logging.py
│       │   │   ├── exceptions.py
│       │   │   └── constants.py
│       │   │
│       │   ├── models/
│       │   ├── schemas/
│       │   ├── repositories/
│       │   ├── services/
│       │   │
│       │   ├── ai/
│       │   │   ├── llm/
│       │   │   │   ├── manager.py
│       │   │   │   ├── openai.py
│       │   │   │   ├── anthropic.py
│       │   │   │   └── gemini.py
│       │   │   │
│       │   │   ├── embeddings/
│       │   │   ├── rag/
│       │   │   ├── memory/
│       │   │   ├── reasoning/
│       │   │   ├── evaluation/
│       │   │   └── prompts/
│       │   │
│       │   ├── analysis/
│       │   ├── architecture/
│       │   ├── workers/
│       │   ├── database/
│       │   │   ├── migrations/
│       │   │   ├── seed/
│       │   │   ├── session.py
│       │   │   ├── engine.py
│       │   │   └── base.py
│       │   │
│       │   ├── middleware/
│       │   ├── utils/
│       │   ├── tests/
│       │   └── __init__.py
│       │
│       ├── main.py
│       ├── pyproject.toml
│       ├── requirements.txt
│       ├── Dockerfile
│       └── README.md
│
├── docs/
│   ├── onboarding/
│   ├── product/
│   ├── architecture/
│   ├── api/
│   ├── engineering/
│   ├── adr/
│   ├── roadmap/
│   ├── meeting-notes/
│   └── research/
│
├── infrastructure/
│   ├── docker/
│   ├── nginx/
│   ├── monitoring/
│   ├── deployment/
│   └── github-actions/
│
├── scripts/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── .github/
    ├── workflows/
    ├── ISSUE_TEMPLATE/
    ├── DISCUSSION_TEMPLATE/
    └── PULL_REQUEST_TEMPLATE.md