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

  // Extract user data from Kajabi payload
  // Kajabi sends: { name, email, ... }
  const body = req.body;
  const email: string | undefined = body?.email;
  const name: string | undefined = body?.name;

  if (!email) {
    return res.status(400).json({ error: "Missing email in webhook payload" });
  }

  // Determine redirect URL for the invite email
  const siteUrl = process.env.SITE_URL || "https://lmia-search-ui.vercel.app";

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
