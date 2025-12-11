# Environment Setup

## Required Variables
Create a `.env` file in the root directory (based on `.env.example`).

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
VITE_AUTH_MODE=supabase

# Admin/Employee Override (Optional default roles for specific emails)
VITE_ADMIN_EMAILS=admin@example.com
VITE_EMPLOYEE_EMAILS=employee@example.com

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
# Secret keys should NOT be in client-side .env if possible,
# but if using client-side logic or Supabase Edge Functions, configure there.
# For local dev acting as backend:
STRIPE_SECRET_KEY=sk_test_...
```

## Running Locally
1. `npm install`
2. `npm run dev`

## Supabase Setup
1. Create a new Supabase project.
2. Run the SQL migration scripts (TBD) to create tables.
3. Enable Email/Password Auth.
