//
// POST /api/subscribe
// Body: { email: string, source: string }
//
// Captures an email address into the ClipHistory update list, sent from the
// cliphistory.stach.uk hero form (source: "site_hero").
//
// Storage: R2 bucket, key "cliphistory-emails.json". Distinct key from
// Markset's list, so the same bucket can hold both. Duplicates are deduped
// by lowercased email; a second submission is a no-op success.
//
// Required env vars (configure in Vercel Project Settings):
//   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
//

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET_NAME!;
const KEY = "cliphistory-emails.json";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_SOURCES = ["site_hero"] as const;

interface EmailEntry {
  email: string;
  source: string;
  timestamp: string;
  subscribed: boolean;
}

async function readEmails(): Promise<EmailEntry[]> {
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: KEY })
    );
    const body = await res.Body?.transformToString();
    return body ? JSON.parse(body) : [];
  } catch {
    return [];
  }
}

async function writeEmails(entries: EmailEntry[]): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: KEY,
      Body: JSON.stringify(entries, null, 2),
      ContentType: "application/json",
    })
  );
}

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

  // Distinct stages so a 500 response tells us which subsystem broke.
  let stage: "r2-read" | "r2-write" = "r2-read";
  try {
    const entries = await readEmails();
    const normalized = email.toLowerCase();
    const existing = entries.find((e) => e.email === normalized);

    if (existing) {
      if (!existing.subscribed) {
        stage = "r2-write";
        existing.subscribed = true;
        await writeEmails(entries);
      }
      return res.status(200).json({ success: true, alreadySubscribed: true });
    }

    stage = "r2-write";
    entries.push({
      email: normalized,
      source,
      timestamp: new Date().toISOString(),
      subscribed: true,
    });
    await writeEmails(entries);

    return res.status(200).json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Subscribe API error [${stage}]:`, err);
    return res.status(500).json({ error: "Internal server error", stage, detail: message });
  }
}
