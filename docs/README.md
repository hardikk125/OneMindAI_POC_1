# OneMindAI Authentication & Credit System Documentation

## 📚 Documentation Files

### 🚀 Start Here
1. **[SETUP_SUMMARY.md](./SETUP_SUMMARY.md)** - Overview of what's done and what you need to do
2. **[VISUAL_SETUP_GUIDE.md](./VISUAL_SETUP_GUIDE.md)** - Step-by-step with ASCII diagrams

### 📖 Detailed Guides
3. **[OAUTH_SETUP_GUIDE.md](./OAUTH_SETUP_GUIDE.md)** - Complete OAuth setup for Google & GitHub
4. **[AUTH_INTEGRATION_EXAMPLE.tsx](./AUTH_INTEGRATION_EXAMPLE.tsx)** - 6 code examples
5. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick lookup for common tasks

### 🎨 Visual
6. **[auth-credit-system-presentation.html](./auth-credit-system-presentation.html)** - Interactive presentation (open in browser)

---

## ⚡ Quick Start (15 minutes)

### 1. Get OAuth Credentials
- **Google**: [Google Cloud Console](https://console.cloud.google.com/) → Credentials
- **GitHub**: [GitHub Settings](https://github.com/settings/developers) → OAuth Apps

### 2. Add to Supabase
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Authentication → Providers
- Add Google and GitHub credentials

### 3. Run Migration
- SQL Editor → New query
- Copy `supabase/migrations/001_initial_schema.sql`
- Run query

### 4. Test
```bash
npm run dev
# Visit http://localhost:5173
# Click Sign In and test
```

---

## 🎯 What's Included

### ✅ Production-Ready Code
- Supabase client with PKCE auth flow
- AuthProvider context with session management
- AuthModal component (Login/Signup/Reset)
- UserMenu component (shows credits)
- ProtectedRoute component (guards pages)
- Credit service with atomic operations
- Database schema with Row Level Security
- TypeScript types for all tables

### ✅ Already Integrated
- `src/main.tsx` wrapped with AuthProvider
- Build passes successfully
- All dependencies installed

### ✅ Documentation
- Setup guides
- Code examples
- Quick reference
- Visual presentation

---

## 📋 File Structure

```
src/lib/supabase/
├── client.ts              # Supabase client
├── types.ts               # Database types
├── auth-context.tsx       # AuthProvider + hooks
├── credit-service.ts      # Credit operations
└── index.ts               # Barrel exports

src/components/auth/
├── AuthModal.tsx          # Login/Signup UI
├── UserMenu.tsx           # User dropdown
├── ProtectedRoute.tsx     # Auth guard
└── index.ts               # Exports

supabase/migrations/
└── 001_initial_schema.sql # Database schema

docs/
├── README.md                          # This file
├── SETUP_SUMMARY.md                   # What's done & what to do
├── VISUAL_SETUP_GUIDE.md              # Step-by-step with diagrams
├── OAUTH_SETUP_GUIDE.md               # Detailed OAuth setup
├── AUTH_INTEGRATION_EXAMPLE.tsx       # Code examples
├── QUICK_REFERENCE.md                 # Quick lookup
└── auth-credit-system-presentation.html # Visual presentation
```

---

## 🔑 Key Features

| Feature | Details |
|---------|---------|
| **Auth Flow** | PKCE (most secure for SPAs) |
| **Providers** | Email/Password, Google, GitHub |
| **Database** | PostgreSQL with Row Level Security |
| **Credits** | Atomic operations, no race conditions |
| **Pricing** | Per-model, transparent pricing |
| **Signup Bonus** | 100 credits for new users |
| **Audit Log** | All transactions logged |
| **Analytics** | API usage tracking |

---

## 💻 Usage Examples

### Check Authentication
```tsx
const { isAuthenticated, user } = useAuth()

if (isAuthenticated) {
  console.log('User:', user?.email)
}
```

### Protect a Page
```tsx
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

### Show User Menu
```tsx
<UserMenu 
  onOpenSettings={() => {}}
  onOpenCredits={() => {}}
  onOpenHistory={() => {}}
/>
```

### Deduct Credits
```tsx
await deductCredits(
  userId,
  5,           // amount
  'openai',    // provider
  'gpt-4o',    // model
  1500         // tokens
)
```

---

## 🔒 Security

✅ PKCE auth flow
✅ Row Level Security on all tables
✅ JWT tokens with auto-refresh
✅ Atomic credit operations
✅ No service key in frontend
✅ Password strength validation
✅ Encrypted sessions

---

## 📞 Documentation Guide

**Choose based on your needs:**

| If you want to... | Read this |
|-------------------|-----------|
| Get started quickly | SETUP_SUMMARY.md |
| See step-by-step with diagrams | VISUAL_SETUP_GUIDE.md |
| Detailed OAuth setup | OAUTH_SETUP_GUIDE.md |
| Code examples | AUTH_INTEGRATION_EXAMPLE.tsx |
| Quick lookup | QUICK_REFERENCE.md |
| Visual overview | auth-credit-system-presentation.html |

---

## ✨ Next Steps

1. ✅ Read SETUP_SUMMARY.md
2. ✅ Follow VISUAL_SETUP_GUIDE.md
3. ✅ Get OAuth credentials
4. ✅ Add to Supabase
5. ✅ Run database migration
6. ✅ Test authentication
7. ⬜ Integrate into your UI
8. ⬜ Add payment system (Stripe)
9. ⬜ Create admin dashboard
10. ⬜ Set up email notifications

---

## 🆘 Troubleshooting

**OAuth not working?**
- Check callback URL matches exactly
- Verify credentials are correct
- Check Supabase Auth logs

**User not created?**
- Check email is returned from provider
- Verify RLS policies

**Can't access user data?**
- Make sure app is wrapped with `<AuthProvider>`
- Check useAuth() is called inside AuthProvider

**Credits not deducting?**
- Make sure deduct is called AFTER successful API response
- Check user has enough credits

---

## 📊 Credit Pricing

| Provider | Model | Input | Output |
|----------|-------|-------|--------|
| OpenAI | GPT-4.1 | 100 | 300 |
| OpenAI | GPT-4o | 25 | 100 |
| Anthropic | Claude 3.5 Sonnet | 30 | 150 |
| Google | Gemini Flash | FREE | FREE |
| DeepSeek | DeepSeek Chat | 1.4 | 2.8 |
| Groq | Llama 3.3 70B | 0.59 | 0.79 |

---

## 🎉 You're Ready!

The authentication system is **production-ready**. Follow the setup guides and you're done!

**Questions?** Check the documentation files or the code comments.

---

**Last Updated:** December 1, 2024
**Status:** ✅ Production Ready
**Build:** ✅ Passing

