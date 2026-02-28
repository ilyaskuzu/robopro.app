const CANONICAL_URL = "https://robopro-app.vercel.app";

/**
 * Canonical base URL for sitemap, robots, and metadata.
 * Uses NEXT_PUBLIC_BASE_URL if set (e.g. for staging); otherwise the production domain.
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  }
  return CANONICAL_URL;
}
