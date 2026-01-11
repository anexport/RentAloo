/**
 * Sitemap generation utilities for Vaymo
 *
 * Note: For production, consider using a dynamic sitemap generator
 * that runs as a build step or API endpoint to include all equipment listings.
 */

export type SitemapUrl = {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

/**
 * Generate XML sitemap from URL array
 */
export function generateSitemapXML(urls: SitemapUrl[]): string {
  const urlTags = urls
    .map((url) => {
      const parts = [
        "  <url>",
        `    <loc>${escapeXml(url.loc)}</loc>`,
        url.lastmod ? `    <lastmod>${url.lastmod}</lastmod>` : null,
        url.changefreq ? `    <changefreq>${url.changefreq}</changefreq>` : null,
        url.priority !== undefined ? `    <priority>${url.priority.toFixed(1)}</priority>` : null,
        "  </url>",
      ];
      return parts.filter(Boolean).join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlTags}
</urlset>`;
}

/**
 * Escape special XML characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Get static pages for sitemap
 */
export function getStaticSitemapUrls(baseUrl = "https://www.vaymo.it"): SitemapUrl[] {
  const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

  return [
    {
      loc: baseUrl,
      lastmod: now,
      changefreq: "daily",
      priority: 1.0,
    },
    {
      loc: `${baseUrl}/explore`,
      lastmod: now,
      changefreq: "hourly",
      priority: 0.9,
    },
    {
      loc: `${baseUrl}/support`,
      lastmod: now,
      changefreq: "monthly",
      priority: 0.5,
    },
  ];
}

/**
 * Generate sitemap URLs for equipment listings
 */
export function getEquipmentSitemapUrls(
  equipmentIds: string[],
  baseUrl = "https://www.vaymo.it"
): SitemapUrl[] {
  const now = new Date().toISOString().split("T")[0];

  return equipmentIds.map((id) => ({
    loc: `${baseUrl}/equipment/${encodeURIComponent(id)}`,
    lastmod: now,
    changefreq: "weekly" as const,
    priority: 0.8,
  }));
}

/**
 * Generate sitemap URLs for category pages
 */
export function getCategorySitemapUrls(
  categoryNames: string[],
  baseUrl = "https://www.vaymo.it"
): SitemapUrl[] {
  const now = new Date().toISOString().split("T")[0];

  return categoryNames.map((name) => ({
    loc: `${baseUrl}/explore?category=${encodeURIComponent(name.toLowerCase())}`,
    lastmod: now,
    changefreq: "daily" as const,
    priority: 0.7,
  }));
}

/**
 * Generate sitemap index for large sitemaps
 */
export function generateSitemapIndex(sitemapUrls: string[]): string {
  const now = new Date().toISOString();

  const sitemapTags = sitemapUrls
    .map(
      (url) => `  <sitemap>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapTags}
</sitemapindex>`;
}

/**
 * Example: Generate complete sitemap
 * This would typically be called in a build script or API endpoint
 */
export async function generateCompleteSitemap(
  fetchEquipmentIds: () => Promise<string[]>,
  fetchCategories: () => Promise<string[]>
): Promise<string> {
  const staticUrls = getStaticSitemapUrls();
  const equipmentIds = await fetchEquipmentIds();
  const categories = await fetchCategories();

  const equipmentUrls = getEquipmentSitemapUrls(equipmentIds);
  const categoryUrls = getCategorySitemapUrls(categories);

  const allUrls = [...staticUrls, ...equipmentUrls, ...categoryUrls];

  return generateSitemapXML(allUrls);
}
