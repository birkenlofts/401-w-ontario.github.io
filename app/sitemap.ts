import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/posts';

export const dynamic = 'force-static';

const BASE = 'https://birkenlofts.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const newestPost = posts[0]?.published_at;
  return [
    { url: `${BASE}/`, lastModified: '2026-07-20', changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE}/history/`, lastModified: '2026-07-20', changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/things-to-do/`, lastModified: '2026-08-16', changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/blog/`, lastModified: newestPost ?? '2026-07-16', changeFrequency: 'weekly', priority: 0.7 },
    ...posts.map((p) => ({
      url: `${BASE}/blog/${p.slug}/`,
      lastModified: p.updated_at,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
