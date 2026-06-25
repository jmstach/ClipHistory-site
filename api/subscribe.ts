//
// POST /api/subscribe
// Body: { email: string, source: string }
//
// STUB. Validates the payload and returns success WITHOUT persisting
// anywhere yet. The form works end-to-end against this; wire up real
// storage before relying on captured addresses.
//
// To make this real, mirror the Markset endpoint: an R2 (S3-compatible)
// bucket holding a JSON array, deduped by lowercased email. Required env
// vars would then be R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
// R2_BUCKET_NAME, and the @aws-sdk/client-s3 read/write helpers. Until that
// destination is decided, this stub just acknowledges the submission.
//

import type { VercelRequest, VercelResponse } from "@vercel/node";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_SOURCES = ["site_hero", "app_preferences"] as const;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, source } = req.body ?? {};

  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  if (!VALID_SOURCES.includes(source)) {
    return res.status(400).json({ error: "Invalid source" });
  }

  // TODO: persist `email` (lowercased, deduped) once a storage destination
  // is chosen. For now, acknowledge so the form completes.
  console.log(`[subscribe stub] would capture: ${email.toLowerCase()} (${source})`);

  return res.status(200).json({ success: true, stub: true });
}
