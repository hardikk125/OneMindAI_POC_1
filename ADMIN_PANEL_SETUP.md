# Admin Panel Setup Guide

## ✅ What's Been Created

### **Admin Panel Files**
- `src/admin/` - Complete admin module with:
  - **Pages**: Dashboard, Users, Models, BugReports, ErrorLogs, Transactions, SystemHealth
  - **Components**: AdminSidebar, StatCard, DataTable
  - **Services**: admin-api.ts (Supabase RPC wrappers)
  - **Hooks**: useAdminAuth.ts (admin authentication)
  - **Types**: TypeScript interfaces for all admin entities

### **Database Migration**
- `supabase/migrations/002_admin_panel_schema.sql`
  - 6 new tables: ai_models, pricing_config, bug_reports, error_logs, system_metrics, admin_activity_log
  - RLS policies for security
  - Admin RPC functions for all operations

### **Routing Setup**
- `src/App.tsx` - Main router between OneMindAI and Admin Panel
- `src/main.tsx` - Updated to use App router
- `src/OneMindAI.tsx` - Updated with onOpenAdmin prop
- `src/components/auth/UserMenu.tsx` - Added "Admin Panel" button for admin users

---

## 🚀 How to Use

### **Step 1: Run the SQL Migration**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy the entire contents of `supabase/migrations/002_admin_panel_schema.sql`
3. Paste and run it
4. Regenerate TypeScript types:
   ```bash
   npx supabase gen types typescript --project-id your-project-id > src/lib/supabase/database.types.ts
   ```

### **Step 2: Make Yourself an Admin**

```sql
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';
```

### **Step 3: Start the App**

```bash
npm run dev
```

### **Step 4: Access Admin Panel**

1. Log in with your account
2. Click on your **user avatar** in the top right
3. Click **"Admin Panel"** button
4. You'll be taken to the admin dashboard

---

## 📊 Admin Panel Features

| Page | Features |
|------|----------|
| **Dashboard** | Overview stats, charts (requests, credits, users, errors) |
| **Users** | View all users, suspend/unsuspend, add credits, view history |
| **Models** | Configure AI models, set pricing, toggle active status |
| **Bug Reports** | Track user-reported bugs, update status, view details |
| **Error Logs** | Monitor application errors, mark resolved, filter by severity |
| **Transactions** | View all credit transactions, filter by type |
| **System Health** | Service status, latency monitoring, incident tracking |

---

## 🔧 Architecture

### **Routing Flow**
```
main.tsx
  ↓
App.tsx (Router)
  ├─ OneMindAI (Main App)
  │   └─ UserMenu → "Admin Panel" button
  └─ AdminApp (Admin Panel)
      └─ AdminSidebar → Pages
```

### **Admin Authentication**
- Uses `useAdminAuth()` hook
- Checks if user role is 'admin' via RPC
- Protected routes - non-admins see access denied message

### **Data Flow**
```
AdminApp
  ↓
Pages (Dashboard, Users, etc.)
  ↓
admin-api.ts (Service layer)
  ↓
Supabase RPC Functions
  ↓
Database
```

---

## 🔐 Security

- **Row Level Security (RLS)** on all tables
- **Admin-only RPC functions** for sensitive operations
- **Role-based access control** via profiles.role
- **Activity logging** for all admin actions
- **No sensitive data** exposed to frontend

---

## 📝 TypeScript Errors

You may see TypeScript errors in `admin-api.ts` until you:
1. Run the SQL migration
2. Regenerate Supabase types

These errors are expected and will resolve after those steps.

---

## 🎯 Next Steps

1. ✅ Run SQL migration
2. ✅ Make yourself admin
3. ✅ Start dev server
4. ✅ Access admin panel via user menu
5. (Optional) Customize pages/components as needed

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify SQL migration ran successfully
3. Confirm your user role is 'admin' in database
4. Check Supabase types were regenerated

