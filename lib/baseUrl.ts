/**
 * Canonical base URL for the site.
 * Vercel sets VERCEL_URL automatically; use NEXT_PUBLIC_BASE_URL for overrides.
 */
export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://robopro-app.vercel.app";
}
