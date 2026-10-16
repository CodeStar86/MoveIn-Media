# MoveIn Media staff portal setup

The `/staff` route contains the administrator and photographer dashboards. Both use Supabase Auth and Row Level Security. The booking form continues to write bookings through the server-side `/api/book` endpoint.

## Environment variables (Vercel)

- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`: server-side credentials used by booking and staff-invitation APIs.
- `VITE_SUPABASE_URL`: public Supabase project API URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: public Supabase publishable key, used by the staff dashboard.
- `BOOKING_ALLOWED_ORIGIN`: production website origin used for invite redirects and booking checks.
- Retain existing Turnstile and Resend settings.

## Activate your initial administrator

1. Create the first administrator in Supabase Authentication > Users. Use a strong temporary password and require changing it on first use.
2. In SQL Editor, use that actual user's auth UUID and your real name (do **not** use the examples literally):

```sql
insert into public.staff_profiles(user_id,full_name,role,active)
values ('REPLACE-WITH-ADMIN-AUTH-UUID'::uuid,'Your name','admin',true);
```

The database has a unique index limiting administrator profiles to one. Do **not** create a public admin registration route.

3. Visit `https://YOUR_DOMAIN/staff`, sign in, and use the Account Security section to change the password.

## Add photographers

The admin can invite photographers from the dashboard. The protected `/api/staff/invite` Vercel Function verifies the caller's Supabase access token, checks the admin role server-side, sends an Auth invitation, and creates their photographer profile. Supabase Authentication email templates and Auth redirect URLs must allow your production `/staff` destination. Invited photographers open the email link, access `/staff`, and set a strong password.

## Job allocation

New website enquiries become unallocated bookings in Supabase. The administrator assigns each booking to one active photographer using the staff dashboard. Photographers can view only assigned bookings, and can transition jobs through assigned → accepted/declined → in_progress → completed. Job updates run through the `movein_update_job` RPC.

## Production readiness

Before accepting real staff activity, check GitHub CI, deploy Vercel, verify Supabase Auth settings, test one invitation, and test one booking allocation and status update with two separate photographer accounts to validate isolation. No email notifications are yet sent automatically when allocating a photographer.
