import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Verify webhook secret
  const secret = req.query.secret;
  if (!secret || secret !== process.env.KAJABI_WEBHOOK_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Validate server-side env vars
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Extract user data from Kajabi payload.
  // Different Kajabi events nest the data differently — `payment.succeeded` and
  // `cart purchase` don't share an identical shape — so check the common paths.
  const body = req.body ?? {};
  const source = body.payload ?? body.data ?? body; // some events wrap data in payload/data
  const member = source.member ?? source.customer ?? source.contact ?? source.user ?? {};

  const email: string | undefined =
    source.email ?? member.email ?? body.email;
  const name: string | undefined =
    source.name ?? member.name ?? body.name ?? member.first_name ?? "";

  if (!email) {
    // Log the keys (not full PII) so we can see the real shape in Vercel logs.
    console.error("Kajabi webhook: no email found. Top-level keys:", Object.keys(body));
    return res.status(400).json({ error: "Missing email in webhook payload" });
  }

  console.log("Kajabi webhook received for:", email);

  // Determine redirect URL for the invite email (the real production site)
  const siteUrl = process.env.SITE_URL || "https://www.itc-ls.com";

  // Invite the user (creates account + sends "set password" email)
  // If user already exists, Supabase returns an error — we handle it gracefully
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { name: name || "" },
    redirectTo: siteUrl,
  });

  if (error) {
    // User already registered — not a real error
    if (error.message.includes("already") || error.status === 422) {
      return res.status(200).json({ message: "User already exists, skipping invite" });
    }
    console.error("Supabase invite error:", error);
    return res.status(500).json({ error: "Failed to invite user" });
  }

  return res.status(200).json({
    message: "User invited successfully",
    userId: data.user.id,
  });
}
