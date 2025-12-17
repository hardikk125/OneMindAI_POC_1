# OneMindAI - Complete UI Text Audit & Recommendations

## Overview
This document contains all UI text, buttons, labels, and messages across all pages/steps of the OneMindAI application, with recommendations for improvements.

---

## STEP 0: Authentication & Loading Screens

### Screen: Loading Screen
| Element | Current Text | Type | Action | Recommendation | Priority |
|---------|--------------|------|--------|-----------------|----------|
| Main Message | "Loading..." | Text | Display while auth checking | "Initializing OneMindAI..." | 🟡 MEDIUM |
| Spinner | (animated) | Visual | Loading indicator | Keep as-is | 🟢 LOW |

### Screen: Login/Sign In
| Element | Current Text | Type | Action | Recommendation | Priority |
|---------|--------------|------|--------|-----------------|----------|
| App Title | "OneMindAI" | Heading | Brand name | Keep as-is | 🟢 LOW |
| Tagline | "Collective Intelligence, Optimised" | Subtitle | Brand message | Keep as-is | 🟢 LOW |
| Button | "Sign In to Continue" | Button | Opens auth modal | "Get Started" or "Sign In" | 🟡 MEDIUM |
| Help Icon | (?) | Icon | Opens help panel | Keep as-is | 🟢 LOW |

---

## STEP 1: Story Mode - Company Selection

### Screen: Company Selection
| Element | Current Text | Type | Action | Recommendation | Priority |
|---------|--------------|------|--------|-----------------|----------|
| Page Title | "Select Your Company" | Heading | Page header | Keep as-is | 🟢 LOW |
| Description | "Choose the company you're working with to get tailored insights and recommendations." | Text | Explains purpose | "Select a company to get industry-specific insights and recommendations" | 🟡 MEDIUM |
| Search Button | (magnifying glass icon) | Button | Toggle search field | Keep icon, add tooltip "Search companies" | 🟡 MEDIUM |
| Layout Toggle | "List view" / "Grid view" / "Stack view" | Button Group | Switch layout | Keep as-is | 🟢 LOW |
| Search Field | (input placeholder) | Input | Filter companies | "Search companies..." | 🟡 MEDIUM |
| Company Cards | (dynamic from data) | Card | Select company | Keep as-is | 🟢 LOW |
| Next Button | "Next" or similar | Button | Proceed to step 1 | "Continue to Role Selection" | 🟡 MEDIUM |
| Progress Bar | "Step 0 of 4" | Progress | Show current step | Keep as-is | 🟢 LOW |

---

## STEP 1: Story Mode - Role Selection

### Screen: Role Selection with Silhouettes
| Element | Current Text | Type | Action | Recommendation | Priority |
|---------|--------------|------|--------|-----------------|----------|
| Page Title | "Choose Your Role" | Heading | Page header | Keep as-is | 🟢 LOW |
| Description | "Select the role that best matches your position to get tailored insights." | Text | Explains purpose | "Choose your role to receive personalized insights and recommendations" | 🟡 MEDIUM |
| Role Cards | (CEO, CFO, CTO, CMO, COO, etc.) | Card | Select role | Keep role names, add brief descriptions | 🟡 MEDIUM |
| Selected Role Display | (shows selected role) | Display | Shows current selection | Keep as-is | 🟢 LOW |
| Focus Area Selector | (dropdown/selector) | Selector | Choose focus area | "Select focus area..." | 🟡 MEDIUM |
| Prompt Preview | (shows generated prompt) | Text | Preview of prompt | "Prompt Preview" | 🟡 MEDIUM |
| Back Button | "← Company Selection" | Button | Go back to step 0 | Keep as-is | 🟢 LOW |
| Next Button | "Continue to Data Import" | Button | Proceed to step 2 | Keep as-is | 🟢 LOW |
| Progress Indicator | "Step 1 of 4 · Choose role & prompt" | Text | Show progress | Keep as-is | 🟢 LOW |

---

## STEP 2: Story Mode - Data Import & Customization

### Screen: Data Import & Prompt Customization
| Element | Current Text | Type | Action | Recommendation | Priority |
|---------|--------------|------|--------|-----------------|----------|
| Page Title | "Customize Your Prompt" | Heading | Page header | "Customize Prompt & Import Data" | 🟡 MEDIUM |
| Description | (explains data import) | Text | Explains purpose | "Upload files or paste data to provide context for AI analysis" | 🟡 MEDIUM |
| File Upload Zone | "Drag files here or click to upload" | Text | File upload area | Keep as-is | 🟢 LOW |
| Supported Formats | "Supports: PDF, Excel, CSV, Word, Images" | Text | Shows file types | Keep as-is | 🟢 LOW |
| Prompt Text Area | (editable prompt) | Input | Edit prompt | "Edit your prompt here..." | 🟡 MEDIUM |
| Character Count | "X / 10000 characters" | Text | Shows limit | Keep as-is | 🟢 LOW |
| Warning Message | "Prompt is getting long..." | Alert | Warns about length | Keep as-is | 🟢 LOW |
| Back Button | "← Back to Role Selection" | Button | Go back to step 1 | Keep as-is | 🟢 LOW |
| Next Button | "Continue to Engine Selection" | Button | Proceed to step 3 | Keep as-is | 🟢 LOW |
| Progress Indicator | "Step 2 of 4 · Customize & import data" | Text | Show progress | Keep as-is | 🟢 LOW |

---

## STEP 3: Story Mode - Engine Selection

### Screen: Engine Selection & Configuration
| Element | Current Text | Type | Action | Recommendation | Priority |
|---------|--------------|------|--------|-----------------|----------|
| Page Title | "Select AI Engines" | Heading | Page header | Keep as-is | 🟢 LOW |
| Description | "Choose which AI engines to query for diverse perspectives." | Text | Explains purpose | Keep as-is | 🟢 LOW |
| Engine Cards | (GPT-4, Claude, Gemini, etc.) | Card | Select engines | Keep as-is | 🟢 LOW |
| Engine Checkbox | (checkbox per engine) | Checkbox | Enable/disable engine | Keep as-is | 🟢 LOW |
| Model Selector | "Model: gpt-4o" | Dropdown | Choose model version | "Select model version..." | 🟡 MEDIUM |
| Output Tokens | "Max output: 2000 tokens" | Input | Set token limit | "Maximum output tokens" | 🟡 MEDIUM |
| Cost Estimate | "$0.50 per query" | Text | Show cost | "Estimated cost per query" | 🟡 MEDIUM |
| Total Cost | "Total: $2.50 for all engines" | Text | Show total | Keep as-is | 🟢 LOW |
| API Key Warning | "⚠️ API key missing - will use mock" | Alert | Warns about missing key | Keep as-is | 🟢 LOW |
| Back Button | "← Back to Customization" | Button | Go back to step 2 | Keep as-is | 🟢 LOW |
| Run Button | "Run Queries" | Button | Execute queries | "Run All Engines" or "Get Answers" | 🟡 MEDIUM |
| Progress Indicator | "Step 3 of 4 · Select engines" | Text | Show progress | Keep as-is | 🟢 LOW |

---

## STEP 4: Story Mode - Results & Merge

### Screen: Results Review & Merge
| Element | Current Text | Type | Action | Recommendation | Priority |
|---------|--------------|------|--------|-----------------|----------|
| Page Title | "Review & Merge Results" | Heading | Page header | Keep as-is | 🟢 LOW |
| Description | "Compare responses from all engines and create a merged answer." | Text | Explains purpose | Keep as-is | 🟢 LOW |
| Engine Response Cards | (shows response per engine) | Card | Display response | Keep as-is | 🟢 LOW |
| Response Status | "✓ Completed" / "✗ Failed" / "⏳ Running" | Badge | Show status | Keep as-is | 🟢 LOW |
| Merge Button | "Merge All Responses" | Button | Combine responses | "Create Merged Answer" | 🟡 MEDIUM |
| Export Button | "Export to Word" / "Export to PDF" | Button | Export results | Keep as-is | 🟢 LOW |
| Copy Button | "Copy to Clipboard" | Button | Copy response | Keep as-is | 🟢 LOW |
| Back Button | "← Back to Engine Selection" | Button | Go back to step 3 | Keep as-is | 🟢 LOW |
| New Query Button | "Start New Query" | Button | Reset and start over | Keep as-is | 🟢 LOW |
| Progress Indicator | "Step 4 of 4 · Review & merge results" | Text | Show progress | Keep as-is | 🟢 LOW |

---

## Main App - Header & Controls

### Screen: Main Header Bar
| Element | Current Text | Type | Action | Recommendation | Priority |
|---------|--------------|------|--------|-----------------|----------|
| App Title | "OneMindAI: Collective Intelligence, Optimised" | Heading | Brand name | Keep as-is | 🟢 LOW |
| Tagline | "The future-proof engine that fuses the smartest minds into one perfect answer." | Subtitle | Brand message | Keep as-is | 🟢 LOW |
| Platform | "Formula2GX Digital Advanced Incubation Labs Platform" | Text | Platform info | Consider shortening to "Formula2GX Platform" | 🟡 MEDIUM |
| Story Mode Toggle | "📖 Story Mode" | Checkbox | Enable story mode | Keep as-is | 🟢 LOW |
| Business View Toggle | "💼 Business" | Checkbox | Show business view | Keep as-is | 🟢 LOW |
| Technical View Toggle | "⚙️ Technical" | Checkbox | Show technical view | Keep as-is | 🟢 LOW |
| Inspector Toggle | "🔍 Inspect" | Checkbox | Show inspector | Keep as-is | 🟢 LOW |
| Debug Toggle | "🔧 Debug" | Checkbox | Enable debug mode | Keep as-is | 🟢 LOW |
| Simulate Button | "Simulate" | Button | Test error handling | Keep as-is | 🟢 LOW |
| User Menu | (profile icon) | Menu | User options | Keep as-is | 🟢 LOW |

---

## Main App - Prompt & Engine Selection

### Screen: Prompt Input & Engine Selection
| Element | Current Text | Type | Action | Recommendation | Priority |
|---------|--------------|------|--------|-----------------|----------|
| Prompt Label | "Your Prompt" | Label | Input label | Keep as-is | 🟢 LOW |
| Prompt Input | "Enter your question or request..." | Textarea | Main input | Keep as-is | 🟢 LOW |
| Character Count | "X / 10000 characters" | Text | Shows limit | Keep as-is | 🟢 LOW |
| Soft Limit Warning | "⚠️ Prompt is getting long..." | Alert | Warns at 5000 chars | Keep as-is | 🟢 LOW |
| Hard Limit Warning | "❌ Prompt exceeds limit" | Alert | Error at 10000 chars | Keep as-is | 🟢 LOW |
| File Upload | "Upload files for context" | Button | Add files | Keep as-is | 🟢 LOW |
| Uploaded Files | (list of files) | List | Show uploaded files | Keep as-is | 🟢 LOW |
| Remove File | "×" | Button | Delete file | Keep as-is | 🟢 LOW |
| Engine Selection | (checkboxes per engine) | Checkbox | Select engines | Keep as-is | 🟢 LOW |
| Engine Info | (engine description) | Text | Shows engine details | Keep as-is | 🟢 LOW |
| Model Selector | "Model: gpt-4o" | Dropdown | Choose model | Keep as-is | 🟢 LOW |
| Output Tokens | "Max output: 2000" | Input | Set token limit | Keep as-is | 🟢 LOW |
| Cost Estimate | "$0.50 per engine" | Text | Show cost | Keep as-is | 🟢 LOW |
| Total Cost | "Total: $2.50" | Text | Show total | Keep as-is | 🟢 LOW |
| Run Button | "Run Live" | Button | Execute queries | "Get Answers" or "Run Queries" | 🟡 MEDIUM |
| Mock Button | "Run Mock" | Button | Test with mock data | Keep as-is | 🟢 LOW |

---

## Main App - Results Display

### Screen: Results & Streaming
| Element | Current Text | Type | Action | Recommendation | Priority |
|---------|--------------|------|--------|-----------------|----------|
| Result Title | (engine name) | Heading | Shows engine name | Keep as-is | 🟢 LOW |
| Status Badge | "✓ Completed" / "⏳ Running" / "✗ Error" | Badge | Show status | Keep as-is | 🟢 LOW |
| Streaming Indicator | "⏳ Streaming..." | Text | Shows streaming | Keep as-is | 🟢 LOW |
| Token Count | "Tokens: 1,234 / 2,000" | Text | Show token usage | Keep as-is | 🟢 LOW |
| Cost | "$0.50" | Text | Show cost | Keep as-is | 🟢 LOW |
| Response Text | (AI response) | Text | Main response | Keep as-is | 🟢 LOW |
| Copy Button | "Copy" | Button | Copy response | Keep as-is | 🟢 LOW |
| Export Button | "Export" | Button | Export response | Keep as-is | 🟢 LOW |
| Error Message | (error details) | Alert | Show error | Keep as-is | 🟢 LOW |
| Retry Button | "Retry" | Button | Retry query | Keep as-is | 🟢 LOW |
| Merge Button | "Merge All" | Button | Combine responses | Keep as-is | 🟢 LOW |
| Merged Result | (combined response) | Text | Merged answer | Keep as-is | 🟢 LOW |

---

## Error Messages & Alerts

### Error Messages by Provider
| Provider | Error Type | Current Message | Recommendation | Priority |
|----------|-----------|-----------------|-----------------|----------|
| OpenAI | 401 Auth | "🔑 ChatGPT: Invalid or expired API key..." | Keep as-is | 🟢 LOW |
| OpenAI | 429 Rate Limit | "⏱️ ChatGPT: Rate limit exceeded..." | Keep as-is | 🟢 LOW |
| OpenAI | 500 Server | "⚠️ ChatGPT: Server error..." | Keep as-is | 🟢 LOW |
| Claude | 401 Auth | "🔑 Claude: Invalid or expired API key..." | Keep as-is | 🟢 LOW |
| Claude | 403 Permission | "🚫 Claude: API key lacks permissions..." | Keep as-is | 🟢 LOW |
| Gemini | 401 Auth | "🔑 Gemini: Invalid API key..." | Keep as-is | 🟢 LOW |
| Mistral | 401 Auth | "🔑 Mistral: API key invalid or missing..." | Keep as-is | 🟢 LOW |
| Perplexity | 429 Rate Limit | "⏱️ Perplexity: Rate limit exceeded..." | Keep as-is | 🟢 LOW |
| DeepSeek | 401 Auth | "🔑 DeepSeek: Invalid API key..." | Keep as-is | 🟢 LOW |
| All | Truncation | "✂️ [Engine]: Response was cut off..." | Keep as-is | 🟢 LOW |

---

## Buttons & Actions Summary

| Button | Current Text | Action | Recommendation | Priority |
|--------|--------------|--------|-----------------|----------|
| Sign In | "Sign In to Continue" | Open auth modal | "Get Started" | 🟡 MEDIUM |
| Company Next | "Next" | Go to role selection | "Continue to Role Selection" | 🟡 MEDIUM |
| Role Next | "Continue to Data Import" | Go to data import | Keep as-is | 🟢 LOW |
| Data Next | "Continue to Engine Selection" | Go to engine selection | Keep as-is | 🟢 LOW |
| Engine Run | "Run Queries" | Execute queries | "Get Answers" | 🟡 MEDIUM |
| Results Merge | "Merge All Responses" | Merge responses | "Create Merged Answer" | 🟡 MEDIUM |
| Export | "Export to Word" / "Export to PDF" | Export results | Keep as-is | 🟢 LOW |
| Copy | "Copy to Clipboard" | Copy response | Keep as-is | 🟢 LOW |
| Retry | "Retry" | Retry failed query | Keep as-is | 🟢 LOW |
| Back | "← [Previous Step]" | Go back | Keep as-is | 🟢 LOW |

---

## Summary of Recommendations

### 🔴 CRITICAL (Must Change)
None identified

### 🟡 MEDIUM (Should Change)
1. **Loading Message**: "Loading..." → "Initializing OneMindAI..."
2. **Sign In Button**: "Sign In to Continue" → "Get Started"
3. **Company Description**: Make more concise
4. **Role Selection**: Add brief role descriptions
5. **Data Import Title**: "Customize Your Prompt" → "Customize Prompt & Import Data"
6. **Model Selector**: Add placeholder "Select model version..."
7. **Output Tokens**: Label as "Maximum output tokens"
8. **Cost Estimate**: Label as "Estimated cost per query"
9. **Engine Run Button**: "Run Queries" → "Get Answers"
10. **Merge Button**: "Merge All Responses" → "Create Merged Answer"
11. **Platform Name**: Shorten "Formula2GX Digital Advanced Incubation Labs Platform"

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

