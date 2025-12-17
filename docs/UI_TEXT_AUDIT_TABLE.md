# OneMindAI - UI Text Audit - Complete Table Format

| Step | Page/Screen | Element | Current Text | Type | Action | Recommendation | Impact if NOT Changed | Priority |
|------|-------------|---------|--------------|------|--------|-----------------|----------------------|----------|
| 0 | Loading Screen | Main Message | "Loading..." | Text | Display while auth checking | "Initializing OneMindAI..." | Users don't know what's happening | 🟡 MEDIUM |
| 0 | Loading Screen | Spinner | (animated) | Visual | Loading indicator | Keep as-is | None | 🟢 LOW |
| 0 | Login Screen | App Title | "OneMindAI" | Heading | Brand name | Keep as-is | None | 🟢 LOW |
| 0 | Login Screen | Tagline | "Collective Intelligence, Optimised" | Subtitle | Brand message | Keep as-is | None | 🟢 LOW |
| 0 | Login Screen | Button | "Sign In to Continue" | Button | Opens auth modal | "Get Started" | Unclear call-to-action | 🟡 MEDIUM |
| 0 | Login Screen | Help Icon | (?) | Icon | Opens help panel | Keep as-is | None | 🟢 LOW |
| 1 | Company Selection | Page Title | "Select Your Company" | Heading | Page header | Keep as-is | None | 🟢 LOW |
| 1 | Company Selection | Description | "Choose the company you're working with to get tailored insights and recommendations." | Text | Explains purpose | "Select a company to get industry-specific insights and recommendations" | Wordy | 🟡 MEDIUM |
| 1 | Company Selection | Search Button | (magnifying glass) | Button | Toggle search field | Add tooltip "Search companies" | Users may not know what it does | 🟡 MEDIUM |
| 1 | Company Selection | Layout Toggle | "List view" / "Grid view" / "Stack view" | Button Group | Switch layout | Keep as-is | None | 🟢 LOW |
| 1 | Company Selection | Search Field | (input) | Input | Filter companies | "Search companies..." | Unclear purpose | 🟡 MEDIUM |
| 1 | Company Selection | Company Cards | (dynamic) | Card | Select company | Keep as-is | None | 🟢 LOW |
| 1 | Company Selection | Next Button | "Next" | Button | Proceed to step 1 | "Continue to Role Selection" | Unclear destination | 🟡 MEDIUM |
| 1 | Company Selection | Progress Bar | "Step 0 of 4" | Progress | Show current step | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Page Title | "Choose Your Role" | Heading | Page header | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Description | "Select the role that best matches your position to get tailored insights." | Text | Explains purpose | "Choose your role to receive personalized insights and recommendations" | Slightly wordy | 🟡 MEDIUM |
| 1 | Role Selection | Role Cards | (CEO, CFO, CTO, etc.) | Card | Select role | Add brief descriptions | Users don't know role differences | 🟡 MEDIUM |
| 1 | Role Selection | Selected Role | (shows selection) | Display | Shows current selection | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Focus Area Selector | (dropdown) | Selector | Choose focus area | "Select focus area..." | Unclear purpose | 🟡 MEDIUM |
| 1 | Role Selection | Prompt Preview | (shows prompt) | Text | Preview of prompt | "Prompt Preview" | Unclear what this is | 🟡 MEDIUM |
| 1 | Role Selection | Back Button | "← Company Selection" | Button | Go back to step 0 | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Next Button | "Continue to Data Import" | Button | Proceed to step 2 | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Progress | "Step 1 of 4 · Choose role & prompt" | Text | Show progress | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | Page Title | "Customize Your Prompt" | Heading | Page header | "Customize Prompt & Import Data" | Doesn't mention data import | 🟡 MEDIUM |
| 2 | Data Import | Description | (explains data import) | Text | Explains purpose | "Upload files or paste data to provide context for AI analysis" | Unclear | 🟡 MEDIUM |
| 2 | Data Import | File Upload | "Drag files here or click to upload" | Text | File upload area | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | Supported Formats | "Supports: PDF, Excel, CSV, Word, Images" | Text | Shows file types | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | Prompt Text Area | (editable) | Input | Edit prompt | "Edit your prompt here..." | Unclear | 🟡 MEDIUM |
| 2 | Data Import | Character Count | "X / 10000 characters" | Text | Shows limit | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | Soft Limit Warning | "⚠️ Prompt is getting long..." | Alert | Warns at 5000 chars | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | Hard Limit Warning | "❌ Prompt exceeds limit" | Alert | Error at 10000 chars | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | Back Button | "← Back to Role Selection" | Button | Go back to step 1 | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | Next Button | "Continue to Engine Selection" | Button | Proceed to step 3 | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | Progress | "Step 2 of 4 · Customize & import data" | Text | Show progress | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | Page Title | "Select AI Engines" | Heading | Page header | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | Description | "Choose which AI engines to query for diverse perspectives." | Text | Explains purpose | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | Engine Cards | (GPT-4, Claude, etc.) | Card | Select engines | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | Engine Checkbox | (checkbox) | Checkbox | Enable/disable engine | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | Model Selector | "Model: gpt-4o" | Dropdown | Choose model | "Select model version..." | Unclear | 🟡 MEDIUM |
| 3 | Engine Selection | Output Tokens | "Max output: 2000 tokens" | Input | Set token limit | "Maximum output tokens" | Unclear | 🟡 MEDIUM |
| 3 | Engine Selection | Cost Estimate | "$0.50 per query" | Text | Show cost | "Estimated cost per query" | Unclear | 🟡 MEDIUM |
| 3 | Engine Selection | Total Cost | "Total: $2.50 for all engines" | Text | Show total | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | API Key Warning | "⚠️ API key missing - will use mock" | Alert | Warns about missing key | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | Back Button | "← Back to Customization" | Button | Go back to step 2 | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | Run Button | "Run Queries" | Button | Execute queries | "Get Answers" | Unclear action | 🟡 MEDIUM |
| 3 | Engine Selection | Progress | "Step 3 of 4 · Select engines" | Text | Show progress | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Page Title | "Review & Merge Results" | Heading | Page header | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Description | "Compare responses from all engines and create a merged answer." | Text | Explains purpose | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Engine Response | (shows response) | Card | Display response | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Response Status | "✓ Completed" / "✗ Failed" / "⏳ Running" | Badge | Show status | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Merge Button | "Merge All Responses" | Button | Combine responses | "Create Merged Answer" | Unclear action | 🟡 MEDIUM |
| 4 | Results Review | Export Button | "Export to Word" / "Export to PDF" | Button | Export results | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Copy Button | "Copy to Clipboard" | Button | Copy response | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Back Button | "← Back to Engine Selection" | Button | Go back to step 3 | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | New Query Button | "Start New Query" | Button | Reset and start over | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Progress | "Step 4 of 4 · Review & merge results" | Text | Show progress | Keep as-is | None | 🟢 LOW |
| Main | Header | App Title | "OneMindAI: Collective Intelligence, Optimised" | Heading | Brand name | Keep as-is | None | 🟢 LOW |
| Main | Header | Tagline | "The future-proof engine that fuses the smartest minds into one perfect answer." | Subtitle | Brand message | Keep as-is | None | 🟢 LOW |
| Main | Header | Platform | "Formula2GX Digital Advanced Incubation Labs Platform" | Text | Platform info | Shorten to "Formula2GX Platform" | Too long | 🟡 MEDIUM |
| Main | Header | Story Mode | "📖 Story Mode" | Checkbox | Enable story mode | Keep as-is | None | 🟢 LOW |
| Main | Header | Business View | "💼 Business" | Checkbox | Show business view | Keep as-is | None | 🟢 LOW |
| Main | Header | Technical View | "⚙️ Technical" | Checkbox | Show technical view | Keep as-is | None | 🟢 LOW |
| Main | Header | Inspector | "🔍 Inspect" | Checkbox | Show inspector | Keep as-is | None | 🟢 LOW |
| Main | Header | Debug | "🔧 Debug" | Checkbox | Enable debug mode | Keep as-is | None | 🟢 LOW |
| Main | Header | Simulate | "Simulate" | Button | Test error handling | Keep as-is | None | 🟢 LOW |
| Main | Header | User Menu | (profile icon) | Menu | User options | Keep as-is | None | 🟢 LOW |
| Main | Prompt | Prompt Label | "Your Prompt" | Label | Input label | Keep as-is | None | 🟢 LOW |
| Main | Prompt | Prompt Input | "Enter your question or request..." | Textarea | Main input | Keep as-is | None | 🟢 LOW |
| Main | Prompt | Character Count | "X / 10000 characters" | Text | Shows limit | Keep as-is | None | 🟢 LOW |
| Main | Prompt | Soft Limit | "⚠️ Prompt is getting long..." | Alert | Warns at 5000 chars | Keep as-is | None | 🟢 LOW |
| Main | Prompt | Hard Limit | "❌ Prompt exceeds limit" | Alert | Error at 10000 chars | Keep as-is | None | 🟢 LOW |
| Main | Prompt | File Upload | "Upload files for context" | Button | Add files | Keep as-is | None | 🟢 LOW |
| Main | Prompt | Uploaded Files | (list) | List | Show uploaded files | Keep as-is | None | 🟢 LOW |
| Main | Prompt | Remove File | "×" | Button | Delete file | Keep as-is | None | 🟢 LOW |
| Main | Engines | Engine Selection | (checkboxes) | Checkbox | Select engines | Keep as-is | None | 🟢 LOW |
| Main | Engines | Engine Info | (description) | Text | Shows engine details | Keep as-is | None | 🟢 LOW |
| Main | Engines | Model Selector | "Model: gpt-4o" | Dropdown | Choose model | Keep as-is | None | 🟢 LOW |
| Main | Engines | Output Tokens | "Max output: 2000" | Input | Set token limit | Keep as-is | None | 🟢 LOW |
| Main | Engines | Cost Estimate | "$0.50 per engine" | Text | Show cost | Keep as-is | None | 🟢 LOW |
| Main | Engines | Total Cost | "Total: $2.50" | Text | Show total | Keep as-is | None | 🟢 LOW |
| Main | Engines | Run Button | "Run Live" | Button | Execute queries | "Get Answers" | Unclear | 🟡 MEDIUM |
| Main | Engines | Mock Button | "Run Mock" | Button | Test with mock data | Keep as-is | None | 🟢 LOW |
| Main | Results | Result Title | (engine name) | Heading | Shows engine name | Keep as-is | None | 🟢 LOW |
| Main | Results | Status Badge | "✓ Completed" / "⏳ Running" / "✗ Error" | Badge | Show status | Keep as-is | None | 🟢 LOW |
| Main | Results | Streaming | "⏳ Streaming..." | Text | Shows streaming | Keep as-is | None | 🟢 LOW |
| Main | Results | Token Count | "Tokens: 1,234 / 2,000" | Text | Show token usage | Keep as-is | None | 🟢 LOW |
| Main | Results | Cost | "$0.50" | Text | Show cost | Keep as-is | None | 🟢 LOW |
| Main | Results | Response Text | (AI response) | Text | Main response | Keep as-is | None | 🟢 LOW |
| Main | Results | Copy Button | "Copy" | Button | Copy response | Keep as-is | None | 🟢 LOW |
| Main | Results | Export Button | "Export" | Button | Export response | Keep as-is | None | 🟢 LOW |
| Main | Results | Error Message | (error details) | Alert | Show error | Keep as-is | None | 🟢 LOW |
| Main | Results | Retry Button | "Retry" | Button | Retry query | Keep as-is | None | 🟢 LOW |
| Main | Results | Merge Button | "Merge All" | Button | Combine responses | Keep as-is | None | 🟢 LOW |
| Main | Results | Merged Result | (combined) | Text | Merged answer | Keep as-is | None | 🟢 LOW |

---

## Summary Statistics

| Category | Count | Action |
|----------|-------|--------|
| 🔴 CRITICAL | 0 | None |
| 🟡 MEDIUM | 15 | Should change |
| 🟢 LOW | 70 | Keep as-is |
| **TOTAL** | **85** | **Audit Complete** |

---

## Priority Changes (Recommended Order)

### 1. Button Text Clarity (High Impact)
- "Sign In to Continue" → "Get Started"
- "Run Queries" → "Get Answers"
- "Merge All Responses" → "Create Merged Answer"
- "Next" → "Continue to Role Selection"

### 2. Labels & Descriptions (Medium Impact)
- "Loading..." → "Initializing OneMindAI..."
- "Customize Your Prompt" → "Customize Prompt & Import Data"
- "Model: gpt-4o" → "Select model version..."
- "Max output: 2000 tokens" → "Maximum output tokens"
- "$0.50 per query" → "Estimated cost per query"

### 3. Platform Name (Low Impact)
- "Formula2GX Digital Advanced Incubation Labs Platform" → "Formula2GX Platform"

### 4. Role Descriptions (Enhancement)
- Add brief descriptions to each role card (CEO, CFO, CTO, etc.)

### 5. Tooltips (UX Enhancement)
- Add tooltip to search button: "Search companies"
- Add label to prompt preview: "Prompt Preview"

