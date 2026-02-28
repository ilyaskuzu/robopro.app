import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/baseUrl";

/**
 * sitemap.xml — Site structure for search engines.
 * Served at /sitemap.xml
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getBaseUrl();
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "weekly" as const, priority: 1 },
    { url: `${base}/llms.txt`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${base}/ai.txt`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 },
    { url: `${base}/identity.json`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${base}/faq-ai.txt`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
  ];
}
