# SEO Quick Reference Guide - Vaymo

Quick guide for developers to implement SEO best practices in new pages.

---

## Adding SEO to a New Page

### 1. Import SEO Components
```tsx
import SEOHead from "@/components/seo/SEOHead";
import StructuredData from "@/components/seo/StructuredData";
import { get[PageType]Meta } from "@/lib/seo/meta";
import { generate[SchemaType]Schema } from "@/lib/seo/schema";
```

### 2. Add SEO Components to Page
```tsx
export default function MyPage() {
  const seoMeta = getMyPageMeta(); // or generate dynamically based on data

  return (
    <div>
      <SEOHead {...seoMeta} />
      <StructuredData data={generateMySchema()} />
      {/* Page content */}
    </div>
  );
}
```

### 3. Dynamic Meta Example (Equipment Detail)
```tsx
export default function EquipmentDetailPage() {
  const { data: listing } = useQuery({ /* ... */ });

  if (!listing) return <LoadingState />;

  const seoMeta = getEquipmentDetailMeta(listing);
  const productSchema = generateProductSchema(listing);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "https://www.vaymo.it" },
    { name: listing.category.name, url: `https://www.vaymo.it/explore?category=${listing.category.name}` },
    { name: listing.title, url: `https://www.vaymo.it/equipment/${listing.id}` },
  ]);

  return (
    <div>
      <SEOHead {...seoMeta} />
      <StructuredData data={productSchema} />
      <StructuredData data={breadcrumbSchema} />
      {/* Page content */}
    </div>
  );
}
```

---

## SEO Checklist for New Pages

- [ ] Add SEOHead component with appropriate meta tags
- [ ] Implement relevant structured data (Product, Article, etc.)
- [ ] Add breadcrumb schema if page has navigation hierarchy
- [ ] Set noindex/nofollow for private pages (dashboards, settings)
- [ ] Use descriptive, keyword-rich title (50-60 characters)
- [ ] Write compelling meta description (150-160 characters)
- [ ] Add descriptive alt text to all images
- [ ] Use semantic HTML (h1, h2, article, section, nav)
- [ ] Implement proper heading hierarchy (single h1, then h2, h3, etc.)
- [ ] Add canonical URL if page has duplicate content concerns
- [ ] Test with Google Rich Results Test before deployment

---

## Image Optimization

### Best Practices
```tsx
<img
  src={imageUrl}
  alt="Descriptive alt text with keywords"
  width={800}
  height={600}
  loading={isPrimaryImage ? "eager" : "lazy"}
  decoding="async"
  className="w-full h-auto"
/>
```

### For Equipment Photos
```tsx
<img
  src={photo.photo_url}
  alt={
    photo.alt ||
    photo.description ||
    `${listing.title} - ${photo.is_primary ? 'Main image' : `View ${index + 1}`} for rental equipment`
  }
  width={800}
  height={600}
  loading={index === 0 ? "eager" : "lazy"}
  itemProp="image"
/>
```

---

## Structured Data Quick Reference

### Product Schema (Equipment Listings)
```tsx
import { generateProductSchema } from "@/lib/seo/schema";

<StructuredData data={generateProductSchema(listing)} />
```

### Organization Schema (Site-wide)
```tsx
import { generateOrganizationSchema } from "@/lib/seo/schema";

<StructuredData data={generateOrganizationSchema()} />
```

### Breadcrumb Schema
```tsx
import { generateBreadcrumbSchema } from "@/lib/seo/schema";

const breadcrumbs = [
  { name: "Home", url: "https://www.vaymo.it" },
  { name: "Category", url: "https://www.vaymo.it/explore?category=bikes" },
  { name: "Item", url: window.location.href },
];

<StructuredData data={generateBreadcrumbSchema(breadcrumbs)} />
```

### ItemList Schema (Collection Pages)
```tsx
import { generateItemListSchema } from "@/lib/seo/schema";

<StructuredData data={generateItemListSchema(listings, "Mountain Bikes")} />
```

---

## Meta Tag Examples

### Public Pages (should be indexed)
```tsx
<SEOHead
  title="Page Title - Vaymo"
  description="Engaging description with keywords"
  ogType="website"
  ogImage="https://www.vaymo.it/og-images/page.jpg"
  canonical="https://www.vaymo.it/page"
/>
```

### Private Pages (should NOT be indexed)
```tsx
<SEOHead
  title="Dashboard - Vaymo"
  description="Manage your Vaymo account"
  noIndex={true}
  noFollow={true}
/>
```

### Product Pages
```tsx
<SEOHead
  title={`${product.name} - $${product.price}/day - Vaymo`}
  description={`Rent ${product.name} in ${product.location}. ${product.condition} condition. Rated ${avgRating}/5.`}
  ogType="product"
  ogImage={product.primaryImage}
  keywords={[product.name, product.category, product.location, "rental"]}
  canonical={`https://www.vaymo.it/equipment/${product.id}`}
/>
```

---

## Common Mistakes to Avoid

### ❌ DON'T
- Use generic alt text like "image" or "photo"
- Duplicate title tags across pages
- Exceed character limits (title: 60, description: 160)
- Index private/protected pages (use noindex)
- Forget canonical URLs on pages with query parameters
- Use relative URLs in structured data (always use absolute URLs)
- Nest structured data scripts (create separate StructuredData components)

### ✅ DO
- Write unique, descriptive titles for each page
- Include target keywords naturally in meta tags
- Use descriptive, keyword-rich alt text
- Set noindex on admin/user-specific pages
- Include price and ratings in product titles when available
- Test structured data with Google Rich Results Test
- Use lazy loading for images below the fold

---

## Testing Your SEO Implementation

### 1. Rich Results Test
```bash
# Test URL
https://search.google.com/test/rich-results?url=https://www.vaymo.it/equipment/[ID]
```

### 2. Schema Validator
```bash
# Validate JSON-LD
https://validator.schema.org/
```

### 3. Social Media Previews
```bash
# Facebook
https://developers.facebook.com/tools/debug/

# Twitter
https://cards-dev.twitter.com/validator

# LinkedIn
https://www.linkedin.com/post-inspector/
```

### 4. Mobile-Friendly Test
```bash
https://search.google.com/test/mobile-friendly
```

---

## Getting Help

- See full audit report: `SEO_AUDIT_REPORT.md`
- SEO components: `/src/components/seo/`
- Meta utilities: `/src/lib/seo/meta.ts`
- Schema generators: `/src/lib/seo/schema.ts`
- Sitemap utilities: `/src/lib/seo/sitemap.ts`

---

## Quick Tips

1. **Always think about the user first** - SEO follows naturally from good UX
2. **Be descriptive** - Use keywords naturally, don't keyword-stuff
3. **Test before deploying** - Use Google's Rich Results Test
4. **Monitor performance** - Check Google Search Console weekly
5. **Keep it simple** - Don't over-optimize, focus on quality content

**Remember:** Good SEO is about creating value for users, not gaming search engines!
