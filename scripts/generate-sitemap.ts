/**
 * Sitemap Generation Script for Vaymo
 *
 * Run this script to generate a complete sitemap.xml file with all public pages.
 *
 * Usage:
 *   npm run generate-sitemap
 *   or
 *   tsx scripts/generate-sitemap.ts
 *
 * Add to package.json:
 *   "scripts": {
 *     "generate-sitemap": "tsx scripts/generate-sitemap.ts",
 *     "build": "vite build && npm run generate-sitemap"
 *   }
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  generateSitemapXML,
  getStaticSitemapUrls,
  getEquipmentSitemapUrls,
  getCategorySitemapUrls,
  type SitemapUrl,
} from "../src/lib/seo/sitemap";

// Load .env.local file
function loadEnvFile() {
  const envPath = join(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith("#")) {
        const [key, ...valueParts] = trimmedLine.split("=");
        if (key && valueParts.length > 0) {
          process.env[key.trim()] = valueParts.join("=").trim();
        }
      }
    }
  }
}

loadEnvFile();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ Missing Supabase environment variables");
  console.error("   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Fetch all available equipment listing IDs
 */
async function fetchEquipmentIds(): Promise<string[]> {
  console.log("📋 Fetching equipment listings...");

  const { data, error } = await supabase
    .from("equipment")
    .select("id")
    .eq("is_available", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error fetching equipment:", error.message);
    return [];
  }

  console.log(`✅ Found ${data?.length || 0} equipment listings`);
  return data?.map((item) => item.id) || [];
}

/**
 * Fetch all category names
 */
async function fetchCategories(): Promise<string[]> {
  console.log("📂 Fetching categories...");

  const { data, error } = await supabase
    .from("categories")
    .select("name")
    .is("parent_id", null) // Only top-level categories
    .order("name");

  if (error) {
    console.error("❌ Error fetching categories:", error.message);
    return [];
  }

  console.log(`✅ Found ${data?.length || 0} categories`);
  return data?.map((cat) => cat.name) || [];
}

/**
 * Main sitemap generation function
 */
async function generateSitemap() {
  console.log("🚀 Starting sitemap generation...\n");

  try {
    // Fetch dynamic data
    const [equipmentIds, categories] = await Promise.all([
      fetchEquipmentIds(),
      fetchCategories(),
    ]);

    // Generate URL arrays
    console.log("\n📝 Generating sitemap URLs...");
    const staticUrls = getStaticSitemapUrls();
    const equipmentUrls = getEquipmentSitemapUrls(equipmentIds);
    const categoryUrls = getCategorySitemapUrls(categories);

    // Combine all URLs
    const allUrls: SitemapUrl[] = [...staticUrls, ...categoryUrls, ...equipmentUrls];

    console.log(`\n📊 Sitemap Statistics:`);
    console.log(`   Static pages: ${staticUrls.length}`);
    console.log(`   Category pages: ${categoryUrls.length}`);
    console.log(`   Equipment pages: ${equipmentUrls.length}`);
    console.log(`   Total URLs: ${allUrls.length}`);

    // Generate XML
    const sitemapXML = generateSitemapXML(allUrls);

    // Write to file
    const outputPath = join(process.cwd(), "public", "sitemap.xml");
    writeFileSync(outputPath, sitemapXML, "utf-8");

    console.log(`\n✅ Sitemap generated successfully!`);
    console.log(`   Output: ${outputPath}`);
    console.log(`   Size: ${(sitemapXML.length / 1024).toFixed(2)} KB`);

    // If sitemap is large (>50,000 URLs or >50MB), warn about splitting
    if (allUrls.length > 50000) {
      console.warn(`\n⚠️  WARNING: Sitemap has ${allUrls.length} URLs`);
      console.warn(`   Google recommends max 50,000 URLs per sitemap`);
      console.warn(`   Consider implementing sitemap index (see sitemap.ts)`);
    }

    if (sitemapXML.length > 50 * 1024 * 1024) {
      console.warn(`\n⚠️  WARNING: Sitemap size is ${(sitemapXML.length / 1024 / 1024).toFixed(2)} MB`);
      console.warn(`   Google recommends max 50 MB per sitemap`);
      console.warn(`   Consider implementing sitemap index (see sitemap.ts)`);
    }

    console.log(`\n🎉 Done!\n`);
  } catch (error) {
    console.error("\n❌ Error generating sitemap:", error);
    process.exit(1);
  }
}

// Run the generator
generateSitemap();
