# Production Authentication Setup Guide

## Overview

This guide covers setting up Supabase authentication for production, including OAuth providers, security configurations, and profit markup settings.

---

## 1. Supabase Project Setup

### Create Production Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project for production
3. Note your:
   - **Project URL**: `https://YOUR_PROJECT.supabase.co`
   - **Anon Key**: Public key for frontend
   - **Service Role Key**: NEVER expose in frontend (backend only)

### Run Database Migration
1. Go to SQL Editor in Supabase Dashboard
2. Copy contents of `supabase/migrations/001_initial_schema.sql`
3. Execute the SQL
4. Verify tables created:
   - `profiles`
   - `credits`
   - `credit_transactions`
   - `api_usage`
   - `user_settings`
   - `conversations`
   - `messages`

---

## 2. OAuth Provider Setup

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Add authorized redirect URI:
   ```
   https://YOUR_PROJECT.supabase.co/auth/v1/callback
   ```
6. Copy Client ID and Client Secret
7. In Supabase: Authentication → Providers → Google → Enable and paste credentials

### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. New OAuth App
3. Set callback URL:
   ```
   https://YOUR_PROJECT.supabase.co/auth/v1/callback
   ```
4. Copy Client ID and Client Secret
5. In Supabase: Authentication → Providers → GitHub → Enable and paste credentials

### Apple OAuth
1. Go to [Apple Developer Portal](https://developer.apple.com)
2. Certificates, Identifiers & Profiles → Identifiers
3. Register new App ID with Sign In with Apple capability
4. Create Services ID for web authentication
5. Configure domains and return URLs:
   ```
   https://YOUR_PROJECT.supabase.co/auth/v1/callback
   ```
6. Generate private key for Sign In with Apple
7. In Supabase: Authentication → Providers → Apple → Enable and configure

### Microsoft (Azure) OAuth
1. Go to [Azure Portal](https://portal.azure.com)
2. Azure Active Directory → App registrations → New registration
3. Add redirect URI:
   ```
   https://YOUR_PROJECT.supabase.co/auth/v1/callback
   ```
4. Certificates & secrets → New client secret
5. Copy Application (client) ID and secret
6. In Supabase: Authentication → Providers → Azure → Enable and paste credentials

### X (Twitter) OAuth
1. Go to [Twitter Developer Portal](https://developer.twitter.com)
2. Create new project and app
3. Set callback URL:
   ```
   https://YOUR_PROJECT.supabase.co/auth/v1/callback
   ```
4. Copy API Key and API Secret
5. In Supabase: Authentication → Providers → Twitter → Enable and paste credentials

### LinkedIn OAuth
1. Go to [LinkedIn Developer Portal](https://developer.linkedin.com)
2. Create new app
3. Auth → OAuth 2.0 settings → Add redirect URL:
   ```
   https://YOUR_PROJECT.supabase.co/auth/v1/callback
   ```
4. Copy Client ID and Client Secret
5. In Supabase: Authentication → Providers → LinkedIn (OIDC) → Enable and paste credentials

---

## 3. Security Configuration

### Row Level Security (RLS)
All tables have RLS enabled by default. Verify policies:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- View policies
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### JWT Settings
1. Supabase Dashboard → Settings → API
2. JWT expiry: Set to 3600 (1 hour) for security
3. Enable JWT verification

### Rate Limiting
Configure in Supabase Dashboard → Settings → API:
- Request rate limit: 100 requests/minute per user
- Enable abuse detection

---

## 4. Environment Variables

### Frontend (.env)
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_PROXY_URL=https://your-backend-url.com
```

### Backend (.env)
```env
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# AI Provider Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
DEEPSEEK_API_KEY=...
MISTRAL_API_KEY=...
GROQ_API_KEY=...
PERPLEXITY_API_KEY=...
```

### Vercel/Netlify Environment Variables
Add all above variables in deployment platform settings.

---

## 5. Credit System & Profit Markup

### Pricing Structure
Credits are the internal currency:
- **1 credit = $0.01 USD**
- **$10 purchase = 1,000 credits**

### Profit Markup (Backend Only)
The profit markup is configured in `src/lib/supabase/credit-service.ts`:

```typescript
// SECURE - Only in backend calculations
const PROFIT_MARKUP = 0.30; // 30% markup on provider costs
```

**IMPORTANT**: Never expose actual provider costs to frontend. Only show credit prices.

### Pricing Calculation
```
User Credit Cost = (Provider Cost × (1 + PROFIT_MARKUP)) × CREDITS_PER_USD
```

Example for GPT-4o ($2.50/1M input tokens):
```
Credit Cost = $2.50 × 1.30 × 100 = 325 credits per 1M tokens
```

### Secure Backend Pricing
For production, move pricing calculation to backend:

```javascript
// server/pricing.cjs
const PROVIDER_COSTS = {
  openai: {
    'gpt-4o': { input: 2.50, output: 10.00 },
    // ... more models
  },
  // ... more providers
};

const PROFIT_MARKUP = process.env.PROFIT_MARKUP || 0.30;

function calculateCredits(provider, model, inputTokens, outputTokens) {
  const costs = PROVIDER_COSTS[provider]?.[model];
  if (!costs) return 0;
  
  const baseCost = 
    (inputTokens / 1_000_000) * costs.input +
    (outputTokens / 1_000_000) * costs.output;
  
  return Math.ceil(baseCost * (1 + PROFIT_MARKUP) * 100);
}
```

---

## 6. Supabase RPC Functions

### deduct_credits
Atomic credit deduction with transaction logging:

```sql
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT,
  p_provider TEXT DEFAULT NULL,
  p_model TEXT DEFAULT NULL,
  p_tokens INTEGER DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
BEGIN
  -- Get current balance with row lock
  SELECT balance INTO v_current_balance
  FROM credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Check sufficient balance
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct credits
  UPDATE credits
  SET 
    balance = balance - p_amount,
    lifetime_spent = lifetime_spent + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Log transaction
  INSERT INTO credit_transactions (
    user_id, amount, type, description, provider, model, tokens
  ) VALUES (
    p_user_id, -p_amount, 'deduct', p_description, p_provider, p_model, p_tokens
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### add_credits
For purchases and refunds:

```sql
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Add credits
  UPDATE credits
  SET 
    balance = balance + p_amount,
    lifetime_earned = lifetime_earned + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Log transaction
  INSERT INTO credit_transactions (
    user_id, amount, type, description
  ) VALUES (
    p_user_id, p_amount, p_type, p_description
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 7. Production Checklist

### Security
- [ ] RLS enabled on all tables
- [ ] Service role key NOT in frontend
- [ ] HTTPS enforced
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] JWT expiry set appropriately

### Authentication
- [ ] All OAuth providers configured
- [ ] Callback URLs match production domain
- [ ] Email templates customized
- [ ] Email verification enabled

### Credits
- [ ] Database migration run
- [ ] RPC functions created
- [ ] Profit markup configured (backend only)
- [ ] Transaction logging working
- [ ] Signup bonus (100 credits) working

### Monitoring
- [ ] Error tracking (Sentry) configured
- [ ] Usage analytics enabled
- [ ] Credit transaction monitoring
- [ ] API usage logging

---

## 8. Testing Production Auth

### Test OAuth Flow
1. Click each OAuth button
2. Verify redirect to provider
3. Complete authentication
4. Verify redirect back to app
5. Check user created in Supabase

### Test Credit System
1. Sign up (should get 100 credits)
2. Make API call
3. Verify credits deducted
4. Check `credit_transactions` table
5. Check `api_usage` table

### Test Edge Cases
1. Insufficient credits → Should show error
2. Network failure → Should not deduct credits
3. Concurrent requests → Should use atomic operations
4. Session expiry → Should redirect to login

---

## 9. Troubleshooting

### OAuth Not Working
- Check callback URL matches exactly
- Verify credentials are correct
- Check provider is enabled in Supabase

### Credits Not Deducting
- Check RPC function exists
- Verify user has credits record
- Check RLS policies allow access

### Session Issues
- Clear localStorage
- Check JWT expiry settings
- Verify PKCE flow is working

---

## Support

For issues, check:
- Supabase Dashboard → Logs
- Browser Console
- Network tab for API errors
- `credit_transactions` table for audit trail
