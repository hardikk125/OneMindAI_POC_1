# OneMind AI - Page-by-Page Code Examination
## Step 0 (Company Selection) & Step 2 (Prompt Customization)

**Generated:** December 9, 2025  
**Examiner:** Senior Code Examiner

---

# STEP 0: COMPANY SELECTION

## Overview
Step 0 is the initial company selection screen shown when `storyMode === true && storyStep === 0`.

**Location:** `src/OneMindAI.tsx` (lines 5212-5310)

---

## FUNCTIONAL BUTTONS

| Button | Location | Functional? | Action | API Called? |
|--------|----------|-------------|--------|-------------|
| **Search Toggle** | Header | YES | `setShowCompanySearch(!showCompanySearch)` | NO |
| **Layout: List** | Header | YES | `setCompanyLayout('list')` | NO |
| **Layout: Grid** | Header | YES | `setCompanyLayout('grid')` | NO |
| **Layout: Stack** | Header | YES | `setCompanyLayout('stack')` | NO |
| **Company Card** | Grid/List/Stack | YES | `onCompanySelect(company)` -> `setSelectedCompany(company)` | NO |
| **Continue** | Footer | YES | `setStoryStep(1)` (if company selected) | NO |
| **Scroll Left** (Stack) | Stack view | YES | DOM scroll via `getElementById` | NO |
| **Scroll Right** (Stack) | Stack view | YES | DOM scroll via `getElementById` | NO |

---

## HARDCODED VALUES

### Companies List (FULLY HARDCODED)
**File:** `src/components/CompanyBanner.tsx` (lines 207-338)

```typescript
export const COMPANIES: Company[] = [
  { id: 'hcl', name: 'HCL Tech', logo: <img src="..."/>, description: '...' },
  { id: 'wesco', name: 'Wesco', ... },
  { id: 'accenture', name: 'Accenture', ... },
  { id: 'capgemini', name: 'Capgemini', ... },
  { id: 'tcs', name: 'TCS', ... },
  { id: 'infosys', name: 'Infosys', ... },
  { id: 'wipro', name: 'Wipro', ... },
  { id: 'cognizant', name: 'Cognizant', ... },
  { id: 'deloitte', name: 'Deloitte', ... },
  { id: 'pwc', name: 'PwC', ... }
]
```

**Status:** 10 companies hardcoded with:
- External logo URLs from Wikipedia/CDN
- Fallback SVG logos on image error
- Static descriptions

### Layout Options (HARDCODED)
```typescript
type Layout = 'list' | 'grid' | 'stack'
```

---

## DYNAMIC VALUES (from State)

| State Variable | Type | Initial Value | Source |
|---------------|------|---------------|--------|
| `selectedCompany` | `Company \| null` | `null` | User selection |
| `companyLayout` | `'list' \| 'grid' \| 'stack'` | `'grid'` | User toggle |
| `showCompanySearch` | `boolean` | `false` | User toggle |
| `companySearchQuery` | `string` | `''` | User input |

---

## SUPABASE CONFIGURATION

**Step 0 does NOT use Supabase directly.**

Companies are hardcoded in `CompanyBanner.tsx`, not fetched from database.

---

## API CALLS

**Step 0 makes NO API calls.**

All interactions are local state changes.

---

## COMPONENTS USED

### 1. CompanyBanner
**File:** `src/components/CompanyBanner.tsx`

| Prop | Type | Description |
|------|------|-------------|
| `companies` | `Company[]` | List of companies to display |
| `onCompanySelect` | `(company: Company \| null) => void` | Selection callback |
| `selectedCompanyId` | `string?` | Currently selected company ID |
| `layout` | `'grid' \| 'list' \| 'stack'` | Display layout |
| `searchQuery` | `string` | Filter query |

**Functions:**
- `filteredAndSortedCompanies` - Filters and sorts companies by search query
- Renders 3 different layouts based on `layout` prop

### 2. CompanyCardStack (Alternative - Not Currently Used)
**File:** `src/components/CompanyCardStack.tsx`

Uses `MorphingCardStack` for animated card transitions.

---

## PROCESS FLOW DIAGRAM - STEP 0

```
┌─────────────────────────────────────────────────────────────────┐
│                        STEP 0: COMPANY SELECTION                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  User sees: "Select Your Company"                                │
│  - Search toggle button                                          │
│  - Layout toggle (List/Grid/Stack)                               │
│  - Company cards (10 hardcoded companies)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
    │ Search Click │   │ Layout Click │   │ Company Click│
    │              │   │              │   │              │
    │ toggles      │   │ changes      │   │ sets         │
    │ search input │   │ layout mode  │   │ selection    │
    └──────────────┘   └──────────────┘   └──────────────┘
            │                   │                   │
            ▼                   ▼                   ▼
    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
    │ State:       │   │ State:       │   │ State:       │
    │ showCompany  │   │ companyLayout│   │ selectedCo   │
    │ Search=true  │   │ ='list/grid' │   │ =Company obj │
    └──────────────┘   └──────────────┘   └──────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │ "Continue" Button    │
                    │ (enabled if company  │
                    │  is selected)        │
                    └──────────────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │ setStoryStep(1)      │
                    │ → Navigate to Step 1 │
                    └──────────────────────┘
```

---

# STEP 2: PROMPT CUSTOMIZATION

## Overview
Step 2 is the prompt editing screen shown when `storyMode === true && storyStep === 2`.

**Location:** `src/OneMindAI.tsx` (lines 5671-5774)

---

## FUNCTIONAL BUTTONS

| Button | Location | Functional? | Action | API Called? |
|--------|----------|-------------|--------|-------------|
| **"Review And Customize"** | Header | YES | `setShowPerspective(false)` | NO |
| **"Add Outside-In Perspective"** | Header | YES | `setShowPerspective(true)` | NO |
| **Back** | Footer | YES | `setStoryStep(1)` | NO |
| **Choose Engines** | Footer | YES | `setStoryStep(3)` (if prompt exists) | NO |
| **File Upload (drag/drop)** | FileUploadZone | YES | `onFilesChange(files)` | NO (local processing) |
| **CRM Integration Buttons** | FileUploadZone | PARTIAL | Opens modal/popup | SOME (HubSpot) |
| **HubSpot Button** | FileUploadZone | YES | `setShowHubSpotModal(true)` | YES (HubSpot API) |

---

## HARDCODED VALUES

### Prompt Limits
**File:** `src/OneMindAI.tsx` (lines 426-430)

```typescript
const LIMITS = {
  PROMPT_SOFT_LIMIT: 10000,    // Warning threshold
  PROMPT_HARD_LIMIT: 50000,   // Maximum allowed
  FILE_SIZE_LIMIT: 10 * 1024 * 1024,  // 10MB
};
```

### CRM Integrations (HARDCODED)
**File:** `src/components/FileUploadZone.tsx` (lines 33-59)

```typescript
const crmIntegrations = [
  { id: 'salesforce', name: 'Salesforce', logo: <svg>...</svg> },
  { id: 'hubspot', name: 'HubSpot', logo: <svg>...</svg> },      // FUNCTIONAL
  { id: 'dynamics', name: 'MS Dynamics', logo: <svg>...</svg> }, // UI only
  { id: 'zoho', name: 'Zoho CRM', logo: <svg>...</svg> },        // UI only
  { id: 'pipedrive', name: 'Pipedrive', logo: <svg>...</svg> },  // UI only
]
```

### Collaboration Integrations (HARDCODED)
**File:** `src/components/FileUploadZone.tsx` (lines 62-108)

```typescript
const collaborationIntegrations = [
  { id: 'sharepoint', name: 'SharePoint', ... },  // UI only
  { id: 'slack', name: 'Slack', ... },            // UI only
  { id: 'jira', name: 'Jira', ... },              // UI only
  { id: 'teams', name: 'MS Teams', ... },         // UI only
  { id: 'notion', name: 'Notion', ... },          // UI only
]
```

**Status:** Only HubSpot integration is functional. Others show UI but have no backend.

### File Limits (HARDCODED)
**File:** `src/lib/file-utils.ts`

```typescript
export const FILE_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10MB
  MAX_FILES: 10,
  ALLOWED_TYPES: ['pdf', 'doc', 'docx', 'txt', 'csv', 'xlsx', 'xls', 'json', 'md', 'png', 'jpg', 'jpeg', 'gif']
}
```

---

## DYNAMIC VALUES (from State)

| State Variable | Type | Initial Value | Source |
|---------------|------|---------------|--------|
| `prompt` | `string` | `''` or from Step 1 | User input / template |
| `showPerspective` | `boolean` | `false` | User toggle |
| `uploadedFiles` | `UploadedFile[]` | `[]` | User upload |
| `promptWarning` | `string \| null` | `null` | Computed from prompt length |

---

## SUPABASE CONFIGURATION

### Tables Used in Step 2 Context

| Table | Used? | Purpose |
|-------|-------|---------|
| `mode_options` | YES | UI configuration (via useUIConfig) |
| `user_roles` | YES | Role definitions (via useUIConfig) |
| `role_prompts` | YES | Prompt templates (via useUIConfig) |
| `credits` | NO | Not used in Step 2 |
| `api_usage` | NO | Not used in Step 2 |

### useUIConfig Hook
**File:** `src/hooks/useUIConfig.ts`

Fetches from Supabase:
```typescript
// Parallel fetch
const [modesResult, rolesResult, promptsResult] = await Promise.all([
  supabase.from('mode_options').select('*').eq('is_visible', true),
  supabase.from('user_roles').select('*').eq('is_visible', true),
  supabase.from('role_prompts').select('*').eq('is_visible', true),
]);
```

**Real-time subscription:**
```typescript
supabase.channel('role_prompts_changes')
  .on('postgres_changes', { event: '*', table: 'role_prompts' }, ...)
```

---

## API CALLS

### HubSpot Integration (FUNCTIONAL)
**File:** `src/components/HubSpotModal.tsx`, `src/components/HubSpotSendButton.tsx`

| Endpoint | Method | When Called | Purpose |
|----------|--------|-------------|---------|
| `/api/hubspot/contacts` | GET | Modal open | Fetch contacts |
| `/api/hubspot/deals` | GET | Modal open | Fetch deals |
| `/api/hubspot/companies` | GET | Modal open | Fetch companies |
| `/api/hubspot/send` | POST | Send button | Send data to HubSpot |

**Backend:** `server/ai-proxy.cjs` handles HubSpot API proxy

### Other CRM Integrations (NOT FUNCTIONAL)
Salesforce, MS Dynamics, Zoho, Pipedrive buttons exist but have no backend implementation.

---

## COMPONENTS USED

### 1. FileUploadZone
**File:** `src/components/FileUploadZone.tsx`

| Prop | Type | Description |
|------|------|-------------|
| `files` | `UploadedFile[]` | Current uploaded files |
| `onFilesChange` | `(files) => void` | File change callback |
| `disabled` | `boolean` | Disable uploads |
| `defaultTab` | `string` | Default active tab |
| `perspectiveOnly` | `boolean` | Show only perspective view |
| `integrationsOnly` | `boolean` | Show only integrations |

**Functions:**
- `handleDragOver`, `handleDragLeave`, `handleDrop` - Drag & drop handling
- `handleFileChange` - File input handling
- `processFilesWithValidation` - File validation

### 2. HubSpotModal
**File:** `src/components/HubSpotModal.tsx`

Fetches and displays HubSpot data (contacts, deals, companies).

### 3. BarChart
**File:** `src/components/BarChart.tsx`

Used for data visualization in perspective view.

---

## PROCESS FLOW DIAGRAM - STEP 2

```
┌─────────────────────────────────────────────────────────────────┐
│                    STEP 2: PROMPT CUSTOMIZATION                  │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  User arrives from Step 1 with:                                  │
│  - selectedCompany (from Step 0)                                 │
│  - selectedRole (from Step 1)                                    │
│  - prompt (template from Step 1 or empty)                        │
└─────────────────────────────────────────────────────────────────┘
                                │
            ┌───────────────────┴───────────────────┐
            ▼                                       ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│  "Review And Customize" │           │ "Outside-In Perspective"│
│  (showPerspective=false)│           │ (showPerspective=true)  │
└─────────────────────────┘           └─────────────────────────┘
            │                                       │
            ▼                                       ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│  PROMPT EDITOR VIEW     │           │  PERSPECTIVE VIEW       │
│  - Textarea for prompt  │           │  - Persona tab          │
│  - Character counter    │           │  - Business tab         │
│  - Placeholder hints    │           │  - Competitors tab      │
│  - FileUploadZone       │           │  - Market trends tab    │
└─────────────────────────┘           └─────────────────────────┘
            │                                       │
            └───────────────────┬───────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FILE UPLOAD ZONE                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Drag & Drop │  │ CRM Buttons │  │ Collab Btns │              │
│  │   Area      │  │ (HubSpot    │  │ (SharePoint │              │
│  │             │  │  works)     │  │  UI only)   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
        ┌─────────────────┐       ┌─────────────────┐
        │   "Back"        │       │ "Choose Engines"│
        │   Button        │       │   Button        │
        │                 │       │ (disabled if    │
        │ setStoryStep(1) │       │  prompt empty)  │
        └─────────────────┘       └─────────────────┘
                                          │
                                          ▼
                              ┌─────────────────────┐
                              │ setStoryStep(3)     │
                              │ → Navigate to Step 3│
                              └─────────────────────┘
```

---

## HUBSPOT API FLOW (When HubSpot Button Clicked)

```
┌─────────────────┐
│ User clicks     │
│ HubSpot button  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ setShowHubSpotModal(true)                                        │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ HubSpotModal Component Mounts                                    │
│                                                                  │
│ useEffect → fetchHubSpotData()                                   │
│   ├── GET /api/hubspot/contacts                                  │
│   ├── GET /api/hubspot/deals                                     │
│   └── GET /api/hubspot/companies                                 │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend: server/ai-proxy.cjs                                     │
│                                                                  │
│ Proxies to HubSpot API:                                          │
│   https://api.hubapi.com/crm/v3/objects/contacts                 │
│   https://api.hubapi.com/crm/v3/objects/deals                    │
│   https://api.hubapi.com/crm/v3/objects/companies                │
│                                                                  │
│ Uses: HUBSPOT_ACCESS_TOKEN from .env                             │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ User selects data → clicks "Send to Prompt"                      │
│                                                                  │
│ Selected data appended to prompt state                           │
│ Modal closes                                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## SUMMARY TABLE

| Category | Step 0 | Step 2 |
|----------|--------|--------|
| **Supabase Used** | NO | YES (via useUIConfig) |
| **API Calls** | NONE | HubSpot only |
| **Hardcoded Data** | Companies (10) | CRM integrations, file limits |
| **Dynamic Data** | Company selection | Prompt, files, perspective |
| **Functional Buttons** | 7 | 6+ |
| **Non-functional UI** | None | 4 CRM buttons, 5 collab buttons |

---

## RECOMMENDATIONS

### Step 0 Improvements
1. **Move COMPANIES to Supabase** - Allow admin to manage companies
2. **Add company logos table** - Store logos in Supabase storage
3. **Add "Add Company" functionality** - Currently no way to add custom companies

### Step 2 Improvements
1. **Implement remaining CRM integrations** - Salesforce, Dynamics, Zoho, Pipedrive
2. **Implement collaboration integrations** - SharePoint, Slack, Jira, Teams, Notion
3. **Add file preview** - Show uploaded file contents
4. **Add prompt templates** - Quick-insert common prompt patterns

---

## FILES REFERENCED

| File | Purpose |
|------|---------|
| `src/OneMindAI.tsx` | Main application component |
| `src/components/CompanyBanner.tsx` | Company selection UI |
| `src/components/CompanyCardStack.tsx` | Alternative company UI |
| `src/components/FileUploadZone.tsx` | File upload and integrations |
| `src/components/HubSpotModal.tsx` | HubSpot data modal |
| `src/hooks/useUIConfig.ts` | Supabase config hook |
| `src/lib/supabase/client.ts` | Supabase client |
| `src/lib/file-utils.ts` | File processing utilities |
| `server/ai-proxy.cjs` | Backend API proxy |
