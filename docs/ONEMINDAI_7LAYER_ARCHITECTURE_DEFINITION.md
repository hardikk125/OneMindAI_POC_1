# 🏗️ OneMindAI 7-Layer Architecture Definition

**Generated:** December 13, 2025  
**Version:** 1.0  
**Status:** Definitive Architecture Reference

---

## Analysis Summary

| Document | Perspective | Focus |
|----------|-------------|-------|
| **File 1** | Conceptual/Enterprise | High-level AI platform architecture (generic) |
| **File 2** | Technical Implementation | Actual code structure and data flows |
| **File 3** | System Analysis | File-by-file breakdown with metrics |

---

## ✅ UNIFIED 7-LAYER DEFINITION FOR OneMindAI

Based on the **actual codebase** and reconciling all three perspectives:

---

## LAYER 1: FRONTEND UI (Presentation Layer)

**What It Is:** User-facing visual components, screens, dashboards, and UI elements.

### OneMindAI Files

| File | Purpose |
|------|---------|
| `src/OneMindAI.tsx` | Main application UI (10,764 lines) |
| `src/App.tsx` | Router between App and Admin |
| `src/components/ui/*` | Buttons, inputs, loaders, icons |
| `src/components/auth/*` | AuthModal, UserMenu |
| `src/components/FileUploadZone.tsx` | File upload UI |
| `src/components/ErrorRecoveryPanel.tsx` | Error display |
| `src/components/ExportButton.tsx` | PDF/Word export UI |
| `src/components/HubSpotModal.tsx` | CRM integration UI |
| `src/admin/pages/*` | Admin dashboard, users, models pages |
| `src/ChartRenderer.tsx` | Chart visualization |

### Impact Examples

- Adding a new button
- Changing layout/styling
- Adding a new screen/page
- Modifying form fields

---

## LAYER 2: FRONTEND STATE & HOOKS (Interaction Layer)

**What It Is:** State management, custom hooks, user session handling, mode selection, and data flow within the frontend.

### OneMindAI Files

| File | Purpose |
|------|---------|
| `src/hooks/useUIConfig.ts` | Dynamic UI configuration |
| `src/hooks/useEngineConfig.ts` | Engine configuration |
| `src/lib/supabase/auth-context.tsx` | AuthProvider + useAuth hook |
| `src/lib/balance-tracker.ts` | Local balance state |
| `src/lib/change-tracker.ts` | Code change tracking |
| `src/lib/super-debug-bus.ts` | Debug event bus |
| React useState in `OneMindAI.tsx` | All application state |

### Impact Examples

- Adding a new custom hook
- Modifying state management logic
- Changing how user sessions work
- Adding new context providers

---

## LAYER 3: FRONTEND SERVICES (Business Logic Layer)

**What It Is:** Client-side business logic, API clients, utilities, calculations, and data transformations.

### OneMindAI Files

| File | Purpose |
|------|---------|
| `src/lib/proxy-client.ts` | Backend API client |
| `src/lib/supabase/credit-service.ts` | Credit operations |
| `src/lib/error-recovery-engine.ts` | Auto-retry logic (2,885 lines) |
| `src/lib/export-utils.ts` | PDF/Word generation |
| `src/lib/file-utils.ts` | File processing |
| `src/lib/chart-utils.ts` | Chart generation |
| `src/core/constants.ts` | Pricing, limits, defaults |
| Token estimation in `OneMindAI.tsx` | `estimateTokens()`, `computeOutCap()` |

### Impact Examples

- Changing cost calculation logic
- Modifying error recovery behavior
- Adding new export formats
- Changing token estimation

---

## LAYER 4: BACKEND API ROUTES (API Layer)

**What It Is:** Express.js routes, API endpoints, request/response handling.

### OneMindAI Files

| File | Endpoints |
|------|-----------|
| `server/ai-proxy.cjs` | `/api/openai`, `/api/anthropic`, `/api/gemini`, `/api/mistral`, `/api/deepseek`, `/api/perplexity`, `/api/groq`, `/api/xai`, `/api/kimi` |
| `server/ai-proxy.cjs` | `/api/hubspot/*` (OAuth, contacts, companies, deals) |
| `server/ai-proxy.cjs` | `/health` (health check) |
| `server/balance-api.cjs` | Balance tracking API |

### Impact Examples

- Adding a new API endpoint
- Changing request/response format
- Adding new AI provider route
- Modifying streaming behavior

---

## LAYER 5: BACKEND MIDDLEWARE (Security & Processing Layer)

**What It Is:** Authentication, validation, rate limiting, security headers, CORS, request preprocessing.

### OneMindAI Files

| File | Middleware |
|------|------------|
| `server/ai-proxy.cjs:24-27` | Helmet (security headers) |
| `server/ai-proxy.cjs:29-55` | CORS configuration |
| `server/ai-proxy.cjs:61-72` | Rate limiting (60 req/min) |
| `server/ai-proxy.cjs` | Request validation per route |
| `server/ai-proxy.cjs` | API key injection from env |

### Impact Examples

- Changing rate limits
- Adding new CORS origins
- Modifying security headers
- Adding request validation

---

## LAYER 6: DATABASE (Data Layer)

**What It Is:** Database schema, tables, indexes, RLS policies, migrations, stored procedures, queries.

### OneMindAI Files

| File | Purpose |
|------|---------|
| `supabase/migrations/001_initial_schema.sql` | Core tables (profiles, credits, transactions) |
| `supabase/migrations/002_admin_panel_schema.sql` | Admin tables |
| `supabase/migrations/003_ui_configuration.sql` | UI config tables |
| `supabase/migrations/004_add_executive_roles.sql` | Role prompts |
| `supabase/migrations/005_engine_ui_config.sql` | Engine config |
| `supabase/migrations/006_system_and_provider_config.sql` | System/provider config |
| `supabase/migrations/20241204_engine_management.sql` | AI engines/models |

### Tables

- `profiles`, `credits`, `credit_transactions`, `api_usage`
- `user_settings`, `conversations`, `messages`
- `ai_engines`, `ai_models`, `system_config`, `provider_config`
- `mode_options`, `user_roles`, `role_prompts`

### Impact Examples

- Adding a new table
- Modifying columns
- Adding indexes
- Changing RLS policies
- Creating new RPC functions

---

## LAYER 7: EXTERNAL SERVICES (Integration Layer)

**What It Is:** Third-party API integrations, AI providers, OAuth providers, external services.

### OneMindAI Integrations

| Service | Purpose | Files |
|---------|---------|-------|
| **OpenAI** | GPT-4, GPT-4o, GPT-5 | `ai-proxy.cjs:767-862` |
| **Anthropic** | Claude 3.5 Sonnet, Haiku | `ai-proxy.cjs:864-955` |
| **Google AI** | Gemini 2.0/2.5 Flash | `ai-proxy.cjs:957-1091` |
| **DeepSeek** | DeepSeek Chat, Coder | `ai-proxy.cjs:1248-1350` |
| **Mistral** | Mistral Large/Medium/Small | `ai-proxy.cjs:1093-1170` |
| **Perplexity** | Sonar Pro/Small | `ai-proxy.cjs:1172-1246` |
| **Groq** | Llama 3.3, Mixtral | `ai-proxy.cjs:1352-1450` |
| **xAI** | Grok Beta | `ai-proxy.cjs:1452-1550` |
| **Kimi/Moonshot** | 8K/32K/128K | `ai-proxy.cjs:1552-1650` |
| **HubSpot** | CRM OAuth integration | `ai-proxy.cjs:104-760` |
| **Supabase Auth** | Google, GitHub, Microsoft, Twitter, LinkedIn, Apple | `auth-context.tsx` |

### Impact Examples

- Adding a new AI provider
- Changing API endpoints
- Modifying OAuth flow
- Adding new CRM integration

---

## 📊 Visual Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    OneMindAI 7-LAYER ARCHITECTURE               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [7] EXTERNAL SERVICES ─────────────────────────────────────────│
│      OpenAI, Anthropic, Google, DeepSeek, Mistral, Perplexity,  │
│      Groq, xAI, Kimi, HubSpot, Supabase Auth (6 OAuth providers)│
│                              ↑                                  │
│  [6] DATABASE ──────────────────────────────────────────────────│
│      Supabase PostgreSQL: profiles, credits, transactions,      │
│      ai_engines, ai_models, system_config, provider_config      │
│                              ↑                                  │
│  [5] BACKEND MIDDLEWARE ────────────────────────────────────────│
│      Helmet, CORS, Rate Limiting (60/min), API Key Injection    │
│                              ↑                                  │
│  [4] BACKEND API ROUTES ────────────────────────────────────────│
│      /api/openai, /api/anthropic, /api/gemini, /api/hubspot/*   │
│      server/ai-proxy.cjs (1,669 lines)                          │
│                              ↑                                  │
│  [3] FRONTEND SERVICES ─────────────────────────────────────────│
│      proxy-client.ts, credit-service.ts, error-recovery-engine  │
│      export-utils.ts, file-utils.ts, chart-utils.ts             │
│                              ↑                                  │
│  [2] FRONTEND STATE & HOOKS ────────────────────────────────────│
│      useUIConfig, useEngineConfig, useAuth, AuthProvider        │
│      React useState, Context, balance-tracker                   │
│                              ↑                                  │
│  [1] FRONTEND UI ───────────────────────────────────────────────│
│      OneMindAI.tsx, App.tsx, components/*, admin/pages/*        │
│      Screens: Login, Company, Role, Data, Engine, Results       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Impact Analysis Table for Workflow

Use this in the safety-guard workflow:

| # | Layer | Impact Level | Files Affected | Description |
|---|-------|--------------|----------------|-------------|
| 1 | **Frontend UI** | NONE/LOW/MEDIUM/HIGH | `OneMindAI.tsx`, `components/*` | React components, screens, styling |
| 2 | **Frontend State & Hooks** | NONE/LOW/MEDIUM/HIGH | `hooks/*`, `auth-context.tsx` | State management, custom hooks, context |
| 3 | **Frontend Services** | NONE/LOW/MEDIUM/HIGH | `lib/*`, `core/*` | Business logic, API clients, utilities |
| 4 | **Backend API Routes** | NONE/LOW/MEDIUM/HIGH | `ai-proxy.cjs` | Express routes, endpoints, streaming |
| 5 | **Backend Middleware** | NONE/LOW/MEDIUM/HIGH | `ai-proxy.cjs` | Auth, CORS, rate limiting, security |
| 6 | **Database** | NONE/LOW/MEDIUM/HIGH | `migrations/*.sql` | Tables, indexes, RLS, RPC functions |
| 7 | **External Services** | NONE/LOW/MEDIUM/HIGH | `ai-proxy.cjs`, `auth-context.tsx` | AI providers, OAuth, CRM integrations |

---

## 🔑 Key Differences from Generic 7-Layer

| Generic (File 1) | OneMindAI Specific |
|------------------|-------------------|
| Infrastructure Layer | Not applicable (Vercel/Railway managed) |
| Data & Knowledge Layer | Merged into Database (Layer 6) |
| AI Orchestration Layer | Split between Backend Routes (4) and External Services (7) |
| Intelligence Layer | Part of Frontend Services (3) - token estimation, cost calculation |
| Interaction Layer | Frontend State & Hooks (2) |
| Front End Layer | Frontend UI (1) |
| Core Backend Layer | Backend API Routes (4) + Middleware (5) |

---

## Summary

This is the **definitive 7-layer definition for OneMindAI** based on the actual codebase structure. Use this as the reference for:

- Impact analysis in change requests
- Architecture discussions
- Code organization decisions
- Risk assessment for modifications
- Team onboarding and documentation

---

**Document Status:** ✅ Ready for Use  
**Last Updated:** December 13, 2025
