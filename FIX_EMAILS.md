# Fixing LMIA site logins & password-reset emails

Two reported problems, **one root cause**: Supabase isn't actually sending emails.

- Users set up in Kajabi can't log into the LMIA site → the **invite email never arrives**, so they never set a password.
- Password reset → the **reset email never arrives**.

The LMIA site and the Kajabi course are **separate logins**. A Kajabi account only
becomes an LMIA login after the user clicks the invite email and sets a password.
If the email doesn't send, there is no LMIA login.

---

## Step 1 — Turn on real email (THE fix). ~10 min, in Supabase dashboard.

Supabase's built-in email is throttled to a few per hour and is not for production.
You must connect a real email provider (SMTP).

1. Make a free [Resend](https://resend.com) account (or SendGrid / Postmark / SES).
2. Verify your sending domain in that provider (add the DNS records they give you).
3. In **Supabase → Authentication → Emails → SMTP Settings**:
   - Toggle **Enable Custom SMTP** ON.
   - Fill in the host / port / username / password from the provider.
   - Set the **sender email** to an address on your verified domain.
4. Click **Save**.

## Step 2 — Allow the LMIA site URL. ~2 min, in Supabase dashboard.

In **Supabase → Authentication → URL Configuration**:
- **Site URL**: the LMIA site address (e.g. `https://lmia-search-ui.vercel.app`).
- **Redirect URLs**: add the same URL (and any custom domain).

Then in **Vercel → Project → Settings → Environment Variables**, confirm `SITE_URL`
matches that exact address. Redeploy after changing it.

## Step 3 — Confirm users are actually being created. ~2 min.

In **Supabase → Authentication → Users**, check that a recently-added Kajabi user
appears in the list.
- **They appear** → it was purely an email problem; Step 1 fixes it.
- **They don't appear** → the Kajabi webhook isn't firing. Check that Kajabi's
  automation is calling `/api/webhooks/kajabi?secret=...` with the correct secret.

## Step 4 — Test end to end. ~3 min.

1. Add a test user in Kajabi (or send yourself an invite).
2. Confirm the invite email arrives → click it → you should land on **"Set Password"**.
3. Set a password → you're logged into the LMIA site.
4. Log out → "Forgot password?" → confirm that email arrives too.

---

### Code side (already fixed)

Invited users now reliably land on the "Set Password" screen instead of being
silently logged in or stuck. No further code changes needed for this issue —
everything remaining is the dashboard setup above.
