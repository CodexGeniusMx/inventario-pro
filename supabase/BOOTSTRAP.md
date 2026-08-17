# Supabase setup — first admin bootstrap

Phase 1 requires a **one-time bootstrap** after creating the auth user.

## 1. Apply migration `00014_bootstrap_first_admin.sql`

If not already applied to your remote project:

```bash
supabase db push
```

Or run the SQL from that file in the Supabase SQL Editor.

## 2. Create the auth user

In Supabase Dashboard → **Authentication** → **Users** → **Add user**:

- Email: your admin email
- Password: secure password
- Copy the user **UUID**

## 3. Bootstrap organization + profile

In Supabase Dashboard → **SQL Editor**, run:

```sql
SELECT bootstrap_first_admin(
  'PASTE-AUTH-USER-UUID-HERE',
  'Your Full Name',
  'Your Company Name',
  'your-company-slug'
);
```

This function:

- Works **only once** (when no organization exists)
- Creates the organization
- Creates an **admin** profile linked to the auth user
- Does **not** weaken RLS

## 4. Sign in

Open `http://localhost:3000/login` and sign in with the credentials from step 2.

## Troubleshooting

| Error | Meaning |
|-------|---------|
| `bootstrap_already_completed` | Organization already exists; use admin invite flow (future phase) |
| `auth_user_not_found` | Wrong UUID or user not created in Auth |
| `profile_already_exists` | Profile row already linked |
| `missing_profile` on login | Bootstrap not run for this user |
