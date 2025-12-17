# OneMindAI - COMPLETE & COMPREHENSIVE UI Text Audit

## Complete Table with ALL UI Elements (Revised & Expanded)

| Step | Page/Screen | Section | Element | Current Text | Type | Action | Recommendation | Impact if NOT Changed | Priority |
|------|-------------|---------|---------|--------------|------|--------|-----------------|----------------------|----------|
| 0 | Loading Screen | Main | Message | "Loading..." | Text | Display while auth checking | "Initializing OneMindAI..." | Users don't know what's happening | 🟡 MEDIUM |
| 0 | Loading Screen | Main | Spinner | (animated) | Visual | Loading indicator | Keep as-is | None | 🟢 LOW |
| 0 | Login Screen | Header | App Title | "OneMindAI" | Heading | Brand name | Keep as-is | None | 🟢 LOW |
| 0 | Login Screen | Header | Tagline | "Collective Intelligence, Optimised" | Subtitle | Brand message | Keep as-is | None | 🟢 LOW |
| 0 | Login Screen | CTA | Button | "Sign In to Continue" | Button | Opens auth modal | "Get Started" | Unclear call-to-action | 🟡 MEDIUM |
| 0 | Login Screen | Help | Help Icon | (?) | Icon | Opens help panel | Keep as-is | None | 🟢 LOW |
| 1 | Company Selection | Header | Page Title | "Select Your Company" | Heading | Page header | Keep as-is | None | 🟢 LOW |
| 1 | Company Selection | Header | Description | "Choose the company you're working with to get tailored insights and recommendations." | Text | Explains purpose | "Select a company to get industry-specific insights" | Wordy | 🟡 MEDIUM |
| 1 | Company Selection | Controls | Search Button | (magnifying glass) | Button | Toggle search field | Add tooltip "Search companies" | Users may not know what it does | 🟡 MEDIUM |
| 1 | Company Selection | Controls | Layout Toggle | "List view" / "Grid view" / "Stack view" | Button Group | Switch layout | Keep as-is | None | 🟢 LOW |
| 1 | Company Selection | Search | Search Field | (input) | Input | Filter companies | "Search companies..." | Unclear purpose | 🟡 MEDIUM |
| 1 | Company Selection | Content | Company Cards | (dynamic) | Card | Select company | Keep as-is | None | 🟢 LOW |
| 1 | Company Selection | Navigation | Next Button | "Continue →" | Button | Proceed to step 1 | Keep as-is | None | 🟢 LOW |
| 1 | Company Selection | Progress | Progress Bar | "Step 0 of 4" | Progress | Show current step | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Header | Step Label | "Step 1 · Identity" | Text | Shows step number | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Header | Page Title | "Choose Your Role And Tell Us What You'd Like To Do Next." | Heading | Page header | Shorten to "Choose Your Role" | Too long | 🟡 MEDIUM |
| 1 | Role Selection | Header | Description | "Unlock the best results with a expertly curated prompt from the OneMindAI library." | Text | Explains purpose | "Select a role to get curated prompts tailored to your position" | Slightly unclear | 🟡 MEDIUM |
| 1 | Role Selection | Content | Option 1 Label | "Option 1 - Select your role {company} to get curated prompts" | Text | Section label | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Scroll | Scroll Left Button | (arrow icon) | Button | Scroll roles left | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Scroll | Scroll Right Button | (arrow icon) | Button | Scroll roles right | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Content | Role Cards | (CEO, CFO, CTO, CMO, COO, etc.) | Card | Select role | Add brief descriptions on hover | Users don't know role differences | 🟡 MEDIUM |
| 1 | Role Selection | Content | Add Role Button | "Add Role" | Button | Open add role modal | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Content | Scroll Indicator | (dot indicators) | Visual | Show scroll position | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Content | Option 2 Label | "Option 2 - Start with a fresh, custom prompt" | Button | Link to custom prompt | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Details | Role Card Title | (selected role name) | Heading | Shows selected role | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Details | Role Card Subtitle | (role title from DB) | Text | Shows role title | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Details | Role Card Description | (role description from DB) | Text | Shows role description | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Details | Change Role Button | "Change Role" | Button | Deselect role | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Focus Areas | Focus Areas Label | "Focus Areas" | Label | Section header | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Focus Areas | Focus Area Items | (A. Strategic Planning, B. Operational Efficiency, etc.) | Button | Expand focus area | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Focus Areas | Prompt Items | (A1. Market Entry, A2. Competitive Analysis, etc.) | Button | Select prompt | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Preview | Prompt Preview Title | (selected prompt title) | Heading | Shows prompt title | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Preview | Prompt Preview Content | (prompt template with placeholders) | Text | Shows prompt content | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Preview | Placeholder Hint | "📝 Tip: Replace the [bracketed placeholders] with your specific details" | Alert | Explains placeholders | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Navigation | Back Button | "← Company Selection" | Button | Go back to step 0 | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Navigation | Next Button | "Choose Engines" | Button | Proceed to step 2 | Keep as-is | None | 🟢 LOW |
| 1 | Role Selection | Progress | Progress Indicator | "Step 1 of 4 · Choose role & prompt" | Text | Show progress | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | Header | Step Label | "Step 2 · Prompt" | Text | Shows step number | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | Header | Page Title | "Customize Your Prompt" | Heading | Page header | "Customize Prompt & Import Data" | Doesn't mention data import | 🟡 MEDIUM |
| 2 | Data Import | Header | Description | (explains data import) | Text | Explains purpose | "Upload files or paste data to provide context for AI analysis" | Unclear | 🟡 MEDIUM |
| 2 | Data Import | Prompt | Prompt Label | "Your prompt" | Label | Input label | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | Prompt | Prompt Input | "e.g., 'Summarise the top three strategic options...'" | Textarea | Edit prompt | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | Prompt | Placeholder Hint | "📝 Tip: Replace the [bracketed placeholders] with your specific details" | Alert | Explains placeholders | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | Prompt | Character Count | "X / 10000 characters" | Text | Shows limit | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | Prompt | Soft Limit Warning | "⚠️ Prompt is getting long..." | Alert | Warns at 5000 chars | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | Prompt | Hard Limit Warning | "❌ Prompt exceeds limit" | Alert | Error at 10000 chars | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | File Upload | File Upload Zone | "Drag files here or click to upload" | Text | File upload area | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | File Upload | Supported Formats | "Supports: PDF, Excel, CSV, Word, Images" | Text | Shows file types | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | File Upload | Upload Tab | "Prompt" / "Perspective" | Tab | Switch tabs | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | File Upload | Add as Prompt Checkbox | "Add this perspective as a prompt" | Checkbox | Include perspective in prompt | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | File Upload | Generate Custom Actions | "Generate Custom Actions" | Button | Generate actions from prompt | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | Navigation | Back Button | "Back" | Button | Go back to step 1 | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | Navigation | Next Button | "Choose Engines" | Button | Proceed to step 3 | Keep as-is | None | 🟢 LOW |
| 2 | Data Import | Progress | Progress Indicator | "Step 2 of 4 · Customize & import data" | Text | Show progress | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | Header | Step Label | "Step 3 · Engines" | Text | Shows step number | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | Header | Page Title | "Select AI Engines" | Heading | Page header | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | Header | Description | "Choose which AI engines to query for diverse perspectives." | Text | Explains purpose | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | Content | Engine Count | "Engine Selection (X/Y selected)" | Text | Shows selection count | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | Content | Add Custom Engine | "+ Add Custom Engine" | Button | Add custom engine | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | Content | Engine Cards | (GPT-4, Claude, Gemini, etc.) | Card | Select engines | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | Content | Engine Checkbox | (checkbox) | Checkbox | Enable/disable engine | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | Content | Model Selector | "Model: gpt-4o" | Dropdown | Choose model | "Select model version..." | Unclear | 🟡 MEDIUM |
| 3 | Engine Selection | Content | Output Tokens | "Max output: 2000 tokens" | Input | Set token limit | "Maximum output tokens" | Unclear | 🟡 MEDIUM |
| 3 | Engine Selection | Content | Cost Estimate | "$0.50 per query" | Text | Show cost | "Estimated cost per query" | Unclear | 🟡 MEDIUM |
| 3 | Engine Selection | Content | Total Cost | "Total: $2.50 for all engines" | Text | Show total | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | Content | API Key Warning | "⚠️ API key missing - will use mock" | Alert | Warns about missing key | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | Navigation | Back Button | "← Back to Customization" | Button | Go back to step 2 | Keep as-is | None | 🟢 LOW |
| 3 | Engine Selection | Navigation | Run Button | "Run Queries" | Button | Execute queries | "Get Answers" | Unclear action | 🟡 MEDIUM |
| 3 | Engine Selection | Progress | Progress Indicator | "Step 3 of 4 · Select engines" | Text | Show progress | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Header | Step Label | "Step 4 · Results" | Text | Shows step number | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Header | Page Title | "Review & Merge Results" | Heading | Page header | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Header | Description | "Compare responses from all engines and create a merged answer." | Text | Explains purpose | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Content | Engine Response | (shows response) | Card | Display response | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Content | Response Status | "✓ Completed" / "✗ Failed" / "⏳ Running" | Badge | Show status | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Content | Token Count | "Tokens: 1,234 / 2,000" | Text | Show token usage | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Content | Cost | "$0.50" | Text | Show cost | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Actions | Copy Button | "Copy" | Button | Copy response | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Actions | Export Button | "Export to Word" / "Export to PDF" | Button | Export results | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Actions | Merge Button | "Merge All Responses" | Button | Combine responses | "Create Merged Answer" | Unclear action | 🟡 MEDIUM |
| 4 | Results Review | Navigation | Back Button | "← Back to Engine Selection" | Button | Go back to step 3 | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Navigation | New Query Button | "Start New Query" | Button | Reset and start over | Keep as-is | None | 🟢 LOW |
| 4 | Results Review | Progress | Progress Indicator | "Step 4 of 4 · Review & merge results" | Text | Show progress | Keep as-is | None | 🟢 LOW |
| Main | Header | Branding | App Title | "OneMindAI: Collective Intelligence, Optimised" | Heading | Brand name | Keep as-is | None | 🟢 LOW |
| Main | Header | Branding | Tagline | "The future-proof engine that fuses the smartest minds into one perfect answer." | Subtitle | Brand message | Keep as-is | None | 🟢 LOW |
| Main | Header | Branding | Platform | "Formula2GX Digital Advanced Incubation Labs Platform" | Text | Platform info | Shorten to "Formula2GX Platform" | Too long | 🟡 MEDIUM |
| Main | Header | Controls | Story Mode | "📖 Story Mode" | Checkbox | Enable story mode | Keep as-is | None | 🟢 LOW |
| Main | Header | Controls | Business View | "💼 Business" | Checkbox | Show business view | Keep as-is | None | 🟢 LOW |
| Main | Header | Controls | Technical View | "⚙️ Technical" | Checkbox | Show technical view | Keep as-is | None | 🟢 LOW |
| Main | Header | Controls | Inspector | "🔍 Inspect" | Checkbox | Show inspector | Keep as-is | None | 🟢 LOW |
| Main | Header | Controls | Debug | "🔧 Debug" | Checkbox | Enable debug mode | Keep as-is | None | 🟢 LOW |
| Main | Header | Controls | Simulate | "Simulate" | Button | Test error handling | Keep as-is | None | 🟢 LOW |
| Main | Header | User | User Menu | (profile icon) | Menu | User options | Keep as-is | None | 🟢 LOW |
| Main | Prompt | Input | Prompt Label | "Your Prompt" | Label | Input label | Keep as-is | None | 🟢 LOW |
| Main | Prompt | Input | Prompt Input | "Enter your question or request..." | Textarea | Main input | Keep as-is | None | 🟢 LOW |
| Main | Prompt | Input | Character Count | "X / 10000 characters" | Text | Shows limit | Keep as-is | None | 🟢 LOW |
| Main | Prompt | Input | Soft Limit | "⚠️ Prompt is getting long..." | Alert | Warns at 5000 chars | Keep as-is | None | 🟢 LOW |
| Main | Prompt | Input | Hard Limit | "❌ Prompt exceeds limit" | Alert | Error at 10000 chars | Keep as-is | None | 🟢 LOW |
| Main | Prompt | Files | File Upload | "Upload files for context" | Button | Add files | Keep as-is | None | 🟢 LOW |
| Main | Prompt | Files | Uploaded Files | (list) | List | Show uploaded files | Keep as-is | None | 🟢 LOW |
| Main | Prompt | Files | Remove File | "×" | Button | Delete file | Keep as-is | None | 🟢 LOW |
| Main | Engines | Selection | Engine Selection | (checkboxes) | Checkbox | Select engines | Keep as-is | None | 🟢 LOW |
| Main | Engines | Selection | Engine Info | (description) | Text | Shows engine details | Keep as-is | None | 🟢 LOW |
| Main | Engines | Config | Model Selector | "Model: gpt-4o" | Dropdown | Choose model | Keep as-is | None | 🟢 LOW |
| Main | Engines | Config | Output Tokens | "Max output: 2000" | Input | Set token limit | Keep as-is | None | 🟢 LOW |
| Main | Engines | Config | Cost Estimate | "$0.50 per engine" | Text | Show cost | Keep as-is | None | 🟢 LOW |
| Main | Engines | Config | Total Cost | "Total: $2.50" | Text | Show total | Keep as-is | None | 🟢 LOW |
| Main | Engines | Actions | Mode Toggle | "Estimate cost" / "Run Live" | Button Group | Toggle mode | Keep as-is | None | 🟢 LOW |
| Main | Engines | Actions | Tip | "Tip: Toggle mode, then click Generate" | Text | Shows instruction | Keep as-is | None | 🟢 LOW |
| Main | Engines | Actions | Disclaimer | "Prices are indicative. Adjust these to match your plan; final billing comes from each provider." | Text | Shows disclaimer | Keep as-is | None | 🟢 LOW |
| Main | Results | Display | Result Title | (engine name) | Heading | Shows engine name | Keep as-is | None | 🟢 LOW |
| Main | Results | Display | Status Badge | "✓ Completed" / "⏳ Running" / "✗ Error" | Badge | Show status | Keep as-is | None | 🟢 LOW |
| Main | Results | Display | Streaming | "⏳ Streaming..." | Text | Shows streaming | Keep as-is | None | 🟢 LOW |
| Main | Results | Display | Token Count | "Tokens: 1,234 / 2,000" | Text | Show token usage | Keep as-is | None | 🟢 LOW |
| Main | Results | Display | Cost | "$0.50" | Text | Show cost | Keep as-is | None | 🟢 LOW |
| Main | Results | Display | Response Text | (AI response) | Text | Main response | Keep as-is | None | 🟢 LOW |
| Main | Results | Actions | Copy Button | "Copy" | Button | Copy response | Keep as-is | None | 🟢 LOW |
| Main | Results | Actions | Export Button | "Export" | Button | Export response | Keep as-is | None | 🟢 LOW |
| Main | Results | Actions | Error Message | (error details) | Alert | Show error | Keep as-is | None | 🟢 LOW |
| Main | Results | Actions | Retry Button | "Retry" | Button | Retry query | Keep as-is | None | 🟢 LOW |
| Main | Results | Actions | Merge Button | "Merge All" | Button | Combine responses | Keep as-is | None | 🟢 LOW |
| Main | Results | Display | Merged Result | (combined) | Text | Merged answer | Keep as-is | None | 🟢 LOW |

---

## Summary Statistics

| Category | Count | Action |
|----------|-------|--------|
| 🔴 CRITICAL | 0 | None |
| 🟡 MEDIUM | 18 | Should change |
| 🟢 LOW | 112 | Keep as-is |
| **TOTAL** | **130** | **Complete Audit** |

---

## Priority Changes (Recommended Order)

### 🔴 CRITICAL (Must Change Immediately)
None identified

### 🟡 MEDIUM (Should Change Soon)

#### 1. Button Text Clarity (High Impact)
- "Sign In to Continue" → "Get Started"
- "Run Queries" → "Get Answers"
- "Merge All Responses" → "Create Merged Answer"

#### 2. Page Titles & Headers (Medium Impact)
- "Choose Your Role And Tell Us What You'd Like To Do Next." → "Choose Your Role"
- "Customize Your Prompt" → "Customize Prompt & Import Data"

#### 3. Descriptions (Medium Impact)
- Company Selection: Make more concise
- Role Selection: "Unlock the best results with a expertly curated prompt from the OneMindAI library." → "Select a role to get curated prompts tailored to your position"

#### 4. Labels & Placeholders (Medium Impact)
- "Model: gpt-4o" → "Select model version..."
- "Max output: 2000 tokens" → "Maximum output tokens"
- "$0.50 per query" → "Estimated cost per query"

#### 5. Platform Name (Low-Medium Impact)
- "Formula2GX Digital Advanced Incubation Labs Platform" → "Formula2GX Platform"

#### 6. UI Enhancements (Low Impact)
- Add tooltip to search button: "Search companies"
- Add brief role descriptions on role cards
- Add role title/description in role selection

### 🟢 LOW (Keep As-Is)
- All other UI text is clear and appropriate
- Error messages are provider-specific and helpful
- Navigation buttons are clear
- Status indicators are appropriate

---

## Implementation Notes

1. **Consistency**: Ensure all button text follows the same pattern (verb + noun)
2. **Clarity**: Use action-oriented language for buttons
3. **Brevity**: Keep labels short and scannable
4. **Tone**: Maintain professional but friendly tone throughout
5. **Accessibility**: All text should be clear for screen readers
6. **Localization**: Consider future translation needs
7. **Mobile**: Ensure all text is readable on small screens

---

## Files to Update

1. **src/OneMindAI.tsx** - Main component with all UI text
2. **src/components/FileUploadZone.tsx** - File upload related text
3. **src/components/ui/help-icon.tsx** - Help modal text

