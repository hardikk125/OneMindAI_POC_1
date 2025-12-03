# Credit System Architecture - Summary

## Quick Overview

The OneMindAI credit system converts real money ($10) into credits, which are then used to pay for API calls based on actual token consumption.

```
$10 Purchase → 1,000 Credits → Token Calculation → Model Pricing → Credit Deduction
```

---

## Key Numbers

| Metric | Value |
|--------|-------|
| **1 Credit** | $0.01 USD |
| **$10 Purchase** | 1,000 credits |
| **Signup Bonus** | 100 free credits |
| **Profit Markup** | 30% (backend only) |
| **Deduction Timing** | After successful API response |

---

## Complete Flow

### Step 1: User Adds $10
- User clicks "Buy Credits"
- Payment processed via Stripe/PayPal
- 1,000 credits added to account
- Entry created in `credit_transactions` table

### Step 2: User Makes API Call
- User enters prompt
- Frontend estimates token count
- Shows estimated credit cost
- User confirms

### Step 3: Token Calculation
- **Input Tokens**: Prompt text ÷ 4 characters per token
- **Output Tokens**: Based on user's max output setting (default 1,000)
- **Total Tokens**: Input + Output

Example:
```
Prompt: "Explain quantum computing"
Input: 4 tokens
Output: 1,000 tokens (user setting)
Total: 1,004 tokens
```

### Step 4: Model Pricing Applied
Each model has different pricing per 1M tokens:

```
GPT-4o:
  Input: $2.50/1M tokens
  Output: $10.00/1M tokens
  With 30% markup: $3.25 input, $13.00 output
  In credits: 325 input, 1,300 output per 1M tokens

DeepSeek:
  Input: $0.14/1M tokens
  Output: $0.28/1M tokens
  With 30% markup: $0.182 input, $0.364 output
  In credits: 18.2 input, 36.4 output per 1M tokens

Gemini Flash:
  Input: FREE
  Output: FREE
  In credits: 0 input, 0 output
```

### Step 5: Calculate Actual Cost
```
For GPT-4o with 1,004 tokens:
  Input cost: 4 × (325/1M) = 0.0013 credits
  Output cost: 1,000 × (1,300/1M) = 1.3 credits
  Total: 1.3 credits ≈ 2 credits (rounded up)
```

### Step 6: Check Balance
- Verify user has ≥ 2 credits
- If insufficient: show error, don't deduct
- If sufficient: proceed to deduction

### Step 7: Atomic Deduction
- Call Supabase RPC function: `deduct_credits()`
- Database transaction ensures atomicity
- Update `credits` table: balance - 2
- Insert into `credit_transactions` table
- Insert into `api_usage` table

### Step 8: Update UI
- Show new balance: 998 credits
- Display API response
- Log for analytics

---

## $10 Distribution Example

With 1,000 credits from $10, here's how many queries you can make:

| Model | Avg Query Cost | Queries | Total Output |
|-------|----------------|---------|--------------|
| Gemini Flash | 0 cr | ∞ Unlimited | Unlimited |
| DeepSeek | ~2 cr | ~500 | ~500K tokens |
| GPT-4o Mini | ~10 cr | ~100 | ~100K tokens |
| Claude 3 Haiku | ~15 cr | ~66 | ~66K tokens |
| GPT-4o | ~100 cr | ~10 | ~10K tokens |
| Claude 3.5 Sonnet | ~150 cr | ~6 | ~6K tokens |

---

## Database Schema

### credits table
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key)
- balance: INTEGER (current credits)
- lifetime_earned: INTEGER (total earned)
- lifetime_spent: INTEGER (total spent)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### credit_transactions table
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key)
- amount: INTEGER (positive or negative)
- type: TEXT ('purchase', 'deduct', 'refund', 'bonus')
- description: TEXT
- provider: TEXT ('openai', 'anthropic', etc.)
- model: TEXT ('gpt-4o', 'claude-3.5', etc.)
- tokens: INTEGER (total tokens used)
- created_at: TIMESTAMP
```

### api_usage table
```sql
- id: UUID (primary key)
- user_id: UUID (foreign key)
- provider: TEXT
- model: TEXT
- input_tokens: INTEGER
- output_tokens: INTEGER
- total_tokens: INTEGER
- credits_used: INTEGER
- prompt: TEXT
- response_length: INTEGER
- status: TEXT ('success', 'failed')
- error_message: TEXT
- response_time_ms: INTEGER
- created_at: TIMESTAMP
```

---

## Security & Profit Markup

### Profit Markup (30%)
```
User Credit Cost = Provider Cost × 1.30 × 100 credits/USD

Example (GPT-4o):
  Provider charges: $2.50/1M tokens
  Your cost: $2.50 × 1.30 = $3.25/1M tokens
  Your profit: $0.75/1M tokens (30%)
```

### Markup Breakdown
- Provider Cost: 100%
- Infrastructure: 10%
- Payment Processing: 5%
- Support & Operations: 8%
- Profit: 7%

### Security Best Practices
1. **Frontend**: Never expose provider costs or markup
2. **Backend**: All pricing calculations happen here
3. **Environment Variables**: Store costs in backend .env only
4. **Audit Trail**: Every transaction is logged
5. **RLS Policies**: Users can only see their own data

---

## Important Rules

### ✅ DO
- Deduct credits AFTER successful API response
- Use atomic RPC functions for deductions
- Log all transactions for audit trail
- Calculate pricing on backend only
- Show only credit prices to users
- Verify sufficient balance before deduction

### ❌ DON'T
- Deduct credits before API response
- Expose provider costs to frontend
- Show profit markup to users
- Use non-atomic operations
- Trust client-side calculations
- Deduct for failed requests

---

## Real-World Example

**Scenario**: User with $10 (1,000 credits) makes 5 queries

| Query | Model | Tokens | Cost | Balance |
|-------|-------|--------|------|---------|
| 1 | GPT-4o Mini | 550 | 8 cr | 992 |
| 2 | DeepSeek | 900 | 2 cr | 990 |
| 3 | Claude Haiku | 675 | 9 cr | 981 |
| 4 | Gemini Flash | 1200 | 0 cr | 981 |
| 5 | GPT-4o | 291 | 1 cr | 980 |

**Result**: 5 queries, 52 credits used, 948 credits remaining

---

## Failed Request Handling

If an API call fails (e.g., rate limit, timeout):
1. No credits are deducted
2. Error is logged in `api_usage` table with status='failed'
3. User can retry without losing credits
4. Balance remains unchanged

---

## Monitoring & Analytics

Track usage with queries on `api_usage` table:

```sql
-- Total credits spent today
SELECT SUM(credits_used) 
FROM api_usage 
WHERE user_id = 'xxx' 
AND DATE(created_at) = TODAY();

-- Most used model
SELECT model, COUNT(*), SUM(credits_used)
FROM api_usage
WHERE user_id = 'xxx'
GROUP BY model
ORDER BY COUNT(*) DESC;

-- Average cost per query
SELECT AVG(credits_used)
FROM api_usage
WHERE user_id = 'xxx';
```

---

## Production Checklist

- [ ] Database migration run
- [ ] RPC functions created
- [ ] RLS policies enabled
- [ ] Profit markup configured (backend only)
- [ ] Payment gateway integrated
- [ ] Signup bonus working (100 credits)
- [ ] Credit deduction working
- [ ] Transaction logging working
- [ ] Audit trail accessible
- [ ] Error handling for failed requests
- [ ] Monitoring/analytics setup

---

## Files Reference

- **Architecture Diagram**: `docs/credit-system-architecture.html` (Open in browser)
- **Production Setup**: `docs/PRODUCTION_AUTH_SETUP.md`
- **Code Implementation**: `src/lib/supabase/credit-service.ts`
- **Database Schema**: `supabase/migrations/001_initial_schema.sql`
- **Frontend Integration**: `src/OneMindAI.tsx` (lines ~2685-2713)

---

## Support

For questions about the credit system:
1. Check `docs/credit-system-architecture.html` for visual flow
2. Review `src/lib/supabase/credit-service.ts` for code
3. Check Supabase logs for transaction details
4. Query `credit_transactions` table for audit trail
