# MoveIn Media — Resend and Supabase Auth emails

## Booking messages

The Vercel booking API uses Resend for two independent messages:
- Office: detailed new enquiry and booking reference
- Customer: branded receipt with property, requested date/time and booking reference, explicitly noting that this is **not yet a confirmed appointment**

Set `RESEND_API_KEY`, `BOOKING_FROM_EMAIL` (e.g. `MoveIn Media <bookings@movein-media.co.uk>`) and `BOOKING_TO_EMAIL` in Vercel. Use a mailbox you control for the reply address.

## Supabase Auth: use Resend SMTP for invites, confirmation and recovery

Supabase Auth sends invitations, verification emails, and recovery emails; the Vercel Resend API key does **not** automatically configure those. In the Supabase Dashboard open Authentication → SMTP Settings and enable custom SMTP:

- Host: `smtp.resend.com`
- Port: `465` (SSL) or `587` (STARTTLS)
- Username: `resend`
- Password: a **Resend API key**, entered securely in the Supabase Dashboard
- Sender: `MoveIn Media <accounts@movein-media.co.uk>` (use a sender on the verified domain)

Check domain verification and permitted sending limits in Resend before relying on these emails.

Under Authentication → URL Configuration:
- Set Site URL to your actual **production** website origin, never localhost
- Allowlist `https://YOUR_PRODUCTION_DOMAIN/staff` as an additional Redirect URL
- Match Vercel `BOOKING_ALLOWED_ORIGIN` to the same production origin

### Branded Invite User HTML template

Paste into Authentication → Email Templates → Invite User:

```html
<!doctype html>
<html lang="en"><body style="margin:0;background:#f2f6f5;font-family:Arial,Helvetica,sans-serif;color:#183b36">
<div style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #dce6e3;border-radius:16px;overflow:hidden">
<div style="background:#153f39;color:#fff;padding:28px 34px"><strong style="letter-spacing:2px">MOVEIN MEDIA</strong><h1 style="color:#fff;font-size:26px">You're invited to join our team</h1></div>
<div style="padding:30px 34px;line-height:1.6"><p>Hello,</p><p>You've been invited to the MoveIn Media photographer portal. Here you'll find your allocated property shoots, booking details, and job status updates.</p>
<p><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#153f39;color:#fff;text-decoration:none;font-weight:bold;padding:14px 22px;border-radius:8px">Accept invitation</a></p>
<p style="font-size:13px;color:#536963">This invitation is intended only for you. If you weren't expecting it, you can ignore this email. The link may expire.</p>
<p>MoveIn Media Team</p></div>
<div style="background:#f4f7f6;padding:18px 34px;color:#536963;font-size:12px">MoveIn Media · Staff access</div></div></body></html>
```

Recommended subject: `You're invited to MoveIn Media's photographer portal`

### Branded Confirm Signup and Reset Password templates

Use the same header/footer style above and provide only the purpose-specific copy plus an action button referencing `{{ .ConfirmationURL }}`.

- Confirm signup subject: `Confirm your MoveIn Media email address`. Text: `Please confirm your email address to finish setting up your account.`. Button: `Confirm email`.
- Reset password subject: `Reset your MoveIn Media password`. Text: `We received a request to reset your password. If you didn't make this request, ignore this message.`. Button: `Reset password`.

Never insert custom/guessed tokens or a localhost link in templates. Supabase substitutes `{{ .ConfirmationURL }}`.

## Verification

Send a new invite or recovery link to an existing account as appropriate. Confirm it arrives via Resend SMTP and directs to the live staff portal. Test both the booking office alert and the customer acknowledgement. Avoid creating a duplicate photographer account for an already invited user.
