# OAuth Setup & AuthProvider Integration Guide

## Part 1: Enable Google OAuth in Supabase

### Step 1: Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the **Google+ API**:
   - Search for "Google+ API"
   - Click "Enable"

4. Create OAuth 2.0 Credentials:
   - Go to **Credentials** (left sidebar)
   - Click **+ Create Credentials** → **OAuth client ID**
   - Choose **Web application**
   - Add Authorized redirect URIs:
     ```
     https://YOUR_PROJECT.supabase.co/auth/v1/callback
     ```
   - Copy the **Client ID** and **Client Secret**

### Step 2: Add to Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Authentication** → **Providers**
4. Find **Google** and click to expand
5. Toggle **Enable Sign in with Google** ON
6. Paste your credentials:
   - **Client ID**: (from Google Cloud)
   - **Client Secret**: (from Google Cloud)
7. Click **Save**

### Step 3: Verify Callback URL

In Supabase Google provider settings, you'll see:
```
Callback URL: https://YOUR_PROJECT.supabase.co/auth/v1/callback
```

This is automatically generated. Copy it and add to Google Cloud Console if not already there.

---

## Part 2: Enable GitHub OAuth in Supabase

### Step 1: Create GitHub OAuth App

1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the form:
   - **Application name**: OneMindAI
   - **Homepage URL**: `http://localhost:5173` (dev) or your production URL
   - **Authorization callback URL**: 
     ```
     https://YOUR_PROJECT.supabase.co/auth/v1/callback
     ```
4. Click **Register application**
5. You'll see:
   - **Client ID**
   - **Client Secret** (click "Generate a new client secret")

### Step 2: Add to Supabase Dashboard

1. Go to **Authentication** → **Providers** in Supabase
2. Find **GitHub** and click to expand
3. Toggle **Enable Sign in with GitHub** ON
4. Paste your credentials:
   - **Client ID**: (from GitHub)
   - **Client Secret**: (from GitHub)
5. Click **Save**

---

## Part 3: Wrap App with AuthProvider

### Step 1: Update `src/main.tsx`

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './lib/supabase'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)
```

### Step 2: Update `src/App.tsx`

```tsx
import { useAuth } from './lib/supabase'
import { AuthModal, UserMenu, ProtectedRoute } from './components/auth'
import { useState } from 'react'

function App() {
  const { isAuthenticated, isLoading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">OneMindAI</h1>
          
          {isAuthenticated ? (
            <UserMenu 
              onOpenSettings={() => console.log('Settings')}
              onOpenCredits={() => console.log('Credits')}
              onOpenHistory={() => console.log('History')}
            />
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {isAuthenticated ? (
          <ProtectedRoute>
            {/* Your app content here */}
            <div className="text-white">
              <h2 className="text-3xl font-bold mb-4">Welcome to OneMindAI</h2>
              <p>Your authenticated content goes here</p>
            </div>
          </ProtectedRoute>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-3xl font-bold text-white mb-4">Sign in to continue</h2>
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="signin"
      />
    </div>
  )
}

export default App
```

---

## Part 4: Test OAuth Locally

### Step 1: Start Development Server

```bash
npm run dev
```

### Step 2: Test Sign In

1. Open `http://localhost:5173`
2. Click "Sign In"
3. Try:
   - **Email/Password**: Create account with test credentials
   - **Google**: Click "Google" button (should redirect to Google login)
   - **GitHub**: Click "GitHub" button (should redirect to GitHub login)

### Step 3: Verify Session

After successful login:
- User should be redirected back to app
- `UserMenu` should show user info and credits
- `useAuth()` hook should return user data

---

## Part 5: Environment Variables

Make sure your `.env` file has:

```bash
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# OAuth is configured in Supabase Dashboard
# No additional env vars needed for OAuth
```

---

## Part 6: Troubleshooting

### Issue: "Invalid redirect_uri"

**Solution**: Make sure the callback URL in Supabase matches exactly:
```
https://YOUR_PROJECT.supabase.co/auth/v1/callback
```

### Issue: "Google OAuth not working locally"

**Solution**: 
- OAuth requires HTTPS or localhost
- Localhost should work automatically
- For custom domains, add to Google Cloud Console

### Issue: "GitHub OAuth shows error"

**Solution**:
- Verify Client ID and Secret are correct
- Check Authorization callback URL matches Supabase
- Make sure app is public (not private)

### Issue: "User not created after OAuth"

**Solution**:
- Check Supabase Auth logs: **Authentication** → **Logs**
- Verify email is being returned from provider
- Check RLS policies on `profiles` table

---

## Part 7: Production Deployment

### Update Callback URLs

When deploying to production, update OAuth providers:

**Google Cloud Console:**
```
https://yourdomain.com/auth/v1/callback
```

**GitHub OAuth App:**
```
https://yourdomain.com/auth/v1/callback
```

**Supabase Dashboard:**
- Callback URL is auto-generated
- Verify it matches your domain

### Environment Variables

Update `.env.production`:
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Part 8: Security Best Practices

✅ **Do:**
- Keep Client Secret secure (never commit to git)
- Use HTTPS in production
- Validate email on backend
- Implement rate limiting on auth endpoints
- Log authentication events

❌ **Don't:**
- Expose service role key in frontend
- Store passwords in localStorage
- Trust client-side auth checks alone
- Use OAuth without HTTPS in production

---

## Complete Setup Checklist

- [ ] Google OAuth credentials created
- [ ] Google OAuth added to Supabase
- [ ] GitHub OAuth app created
- [ ] GitHub OAuth added to Supabase
- [ ] `src/main.tsx` wrapped with AuthProvider
- [ ] `src/App.tsx` updated with auth UI
- [ ] `.env` file has Supabase credentials
- [ ] Tested email/password signup
- [ ] Tested Google OAuth
- [ ] Tested GitHub OAuth
- [ ] User menu displays correctly
- [ ] Protected routes work
- [ ] Credits display in user menu

---

## Next Steps

1. **Add payment integration** (Stripe) for buying credits
2. **Implement usage tracking** to log API calls
3. **Add admin dashboard** for managing users
4. **Set up email notifications** for low credits
5. **Create subscription plans** (monthly credits)

