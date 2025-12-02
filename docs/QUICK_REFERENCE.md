# OAuth & Auth Quick Reference

## 🚀 Quick Setup (5 minutes)

### 1. Get OAuth Credentials

**Google:**
- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create OAuth 2.0 credentials
- Copy Client ID & Secret

**GitHub:**
- Go to [GitHub Settings](https://github.com/settings/developers)
- Create OAuth App
- Copy Client ID & Secret

### 2. Add to Supabase

In Supabase Dashboard → Authentication → Providers:
- **Google**: Paste Client ID & Secret → Save
- **GitHub**: Paste Client ID & Secret → Save

### 3. Wrap App

In `src/main.tsx`:
```tsx
import { AuthProvider } from './lib/supabase'

<AuthProvider>
  <OneMindAI />
</AuthProvider>
```

### 4. Use Auth

```tsx
import { useAuth } from '@/lib/supabase'
import { AuthModal, UserMenu } from '@/components/auth'

const { user, credits, signIn, signOut } = useAuth()

// Show login
<AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />

// Show user menu
<UserMenu />
```

---

## 📋 Common Tasks

### Check if User is Logged In
```tsx
const { isAuthenticated } = useAuth()

if (isAuthenticated) {
  // Show dashboard
} else {
  // Show login screen
}
```

### Get User Info
```tsx
const { user, profile, credits } = useAuth()

console.log(user?.email)           // "user@example.com"
console.log(profile?.full_name)    // "John Doe"
console.log(credits?.balance)      // 100
```

### Protect a Page
```tsx
import { ProtectedRoute } from '@/components/auth'

<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

### Deduct Credits
```tsx
import { deductCredits } from '@/lib/supabase'

const { success } = await deductCredits(
  userId,
  5,              // amount
  'openai',       // provider
  'gpt-4o',       // model
  1500            // tokens used
)

if (success) {
  console.log('Credits deducted')
} else {
  console.log('Insufficient credits')
}
```

### Check Credit Balance
```tsx
const { credits, hasEnoughCredits } = useAuth()

if (hasEnoughCredits(5)) {
  // User has at least 5 credits
}
```

### Refresh Credits
```tsx
const { refreshCredits } = useAuth()

// After API call succeeds
await refreshCredits()
```

### Sign Out
```tsx
const { signOut } = useAuth()

await signOut()
```

---

## 🔐 Security Checklist

- [ ] Never expose `SUPABASE_SERVICE_KEY` in frontend
- [ ] Always deduct credits AFTER successful API response
- [ ] Use `ProtectedRoute` to guard sensitive pages
- [ ] Validate user input with `sanitizeInput()`
- [ ] Log all API usage for auditing
- [ ] Use HTTPS in production
- [ ] Enable Row Level Security on all tables

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| OAuth not working | Check callback URL matches Supabase |
| User not created | Check email is returned from provider |
| Credits not deducting | Make sure deduct is called AFTER success |
| Can't access user data | Wrap app with `<AuthProvider>` |
| RLS policy error | Check user_id matches auth.uid() |

---

## 📚 Documentation Files

- `OAUTH_SETUP_GUIDE.md` - Detailed OAuth setup
- `AUTH_INTEGRATION_EXAMPLE.tsx` - Code examples
- `auth-credit-system-presentation.html` - Visual presentation
- `QUICK_REFERENCE.md` - This file

---

## 🎯 Next Steps

1. ✅ Set up OAuth providers
2. ✅ Wrap app with AuthProvider
3. ✅ Add auth UI to header
4. ⬜ Implement payment (Stripe)
5. ⬜ Add admin dashboard
6. ⬜ Set up email notifications

---

## 💡 Pro Tips

**Tip 1: Auto-refresh on page load**
```tsx
useEffect(() => {
  refreshCredits()
}, [])
```

**Tip 2: Show credit warning**
```tsx
{credits && credits.balance < 10 && (
  <div className="text-yellow-400">
    ⚠️ Low credits: {credits.balance} remaining
  </div>
)}
```

**Tip 3: Log all API calls**
```tsx
await logApiUsage(
  userId,
  provider,
  model,
  promptTokens,
  completionTokens,
  creditsUsed,
  success
)
```

**Tip 4: Handle OAuth errors gracefully**
```tsx
const { error } = await signInWithGoogle()
if (error) {
  setErrorMessage(error.message)
}
```

---

## 📞 Support

For issues:
1. Check browser console for errors
2. Check Supabase Auth logs
3. Verify environment variables
4. Check callback URLs match exactly

