# 🚀 Edge Functions Deployment Guide

## Overview
Two Edge Functions have been created for user management:
- `create-admin` - Creates administrator accounts
- `create-employee` - Creates employee accounts (already existed)

Both functions handle:
- ✅ Supabase Auth account creation
- ✅ Password generation (if not provided)
- ✅ Database entry in `app_users` table
- ✅ Role assignment (admin or employee)
- ✅ Email confirmation bypass

---

## Prerequisites

1. **Supabase CLI installed**
   ```bash
   npm install -g supabase
   ```

2. **Logged into Supabase**
   ```bash
   supabase login
   ```

3. **Project linked**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

---

## Deployment Steps

### Option 1: Deploy Both Functions (Recommended)

```bash
# Navigate to project root
cd c:\Users\rberu\PDSv6_Supabase

# Deploy create-admin function
supabase functions deploy create-admin

# Deploy create-employee function
supabase functions deploy create-employee
```

### Option 2: Deploy All Functions at Once

```bash
supabase functions deploy
```

---

## Verify Deployment

### 1. Check in Supabase Dashboard
- Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/functions
- You should see:
  - ✅ `create-admin`
  - ✅ `create-employee`

### 2. Test the Functions

#### Test create-admin:
```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-admin' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"name":"Test Admin","email":"testadmin@example.com","password":"TestPass123!"}'
```

#### Test create-employee:
```bash
curl -i --location --request POST 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/create-employee' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"name":"Test Employee","email":"testemp@example.com","password":"TestPass123!"}'
```

---

## Environment Variables

The functions automatically use these Supabase environment variables:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (has admin privileges)

These are automatically available in deployed Edge Functions.

---

## How They Work

### create-admin Function:
1. Receives: `{ name, email, password }` (password optional)
2. Generates password if not provided (14 characters)
3. Creates auth user with `role: 'admin'` in user_metadata
4. Inserts/updates record in `app_users` table with `role: 'admin'`
5. Returns: `{ ok: true, user: { id, email, name, role } }`

### create-employee Function:
1. Receives: `{ name, email, password }` (password optional)
2. Generates password if not provided (14 characters)
3. Creates auth user with `role: 'employee'` in user_metadata
4. Inserts/updates record in `app_users` table with `role: 'employee'`
5. Returns: `{ ok: true, user: { id, email, name, role } }`

---

## Error Handling

Both functions return proper error responses:

| Error | Status | Meaning |
|-------|--------|---------|
| `missing_supabase_env` | 500 | Environment variables not set |
| `invalid_json` | 400 | Request body is not valid JSON |
| `missing_email` | 400 | Email field is required |
| `createUser_missing_id` | 500 | Auth user creation failed |
| `app_users_upsert_failed` | 500 | Database insert failed |

---

## Database Requirements

### app_users Table Structure:
```sql
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'owner', 'employee')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Required RLS Policies:
```sql
-- Allow service role to insert/update
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated users to read app_users"
  ON app_users FOR SELECT
  TO authenticated
  USING (true);

-- Service role can do everything (automatically allowed)
```

---

## Troubleshooting

### Function not found:
```bash
# Re-deploy the function
supabase functions deploy create-admin
supabase functions deploy create-employee
```

### Permission denied:
```bash
# Make sure you're logged in
supabase login

# Re-link your project
supabase link --project-ref YOUR_PROJECT_REF
```

### Database errors:
- Check that `app_users` table exists
- Verify RLS policies allow the operation
- Check Supabase logs in dashboard

---

## Testing in Your App

Once deployed, test in the Users & Roles page:

1. **Test Admin Creation:**
   - Click "Add New Administrator"
   - Fill in name and email
   - Click "Create Admin"
   - Should see success message
   - Admin appears in table

2. **Test Employee Creation:**
   - Click "Onboard New Employee"
   - Fill in name and email
   - Click "Create Account"
   - Should see success message
   - Employee appears in table

3. **Test Customer Creation:**
   - Click "Add New Customer"
   - Fill in name (email/phone optional)
   - Click "Add Customer"
   - Should see success message
   - Customer appears in table

---

## Quick Deploy Commands

```bash
# 1. Navigate to project
cd c:\Users\rberu\PDSv6_Supabase

# 2. Deploy both functions
supabase functions deploy create-admin
supabase functions deploy create-employee

# 3. Done! Test in your app
```

---

## Files Created/Modified

- ✅ `supabase/functions/create-admin/index.ts` - NEW
- ✅ `supabase/functions/create-employee/index.ts` - Already existed
- ✅ `EDGE_FUNCTIONS_DEPLOYMENT.md` - This guide

---

**Your Edge Functions are ready to deploy!** 🎉

Just run the deployment commands and they'll be live in Supabase!
