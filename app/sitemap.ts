import { MetadataRoute } from 'next';
import { POPULAR_NICHES } from '@/src/lib/nicheData';
import { APP_URL } from '@/src/lib/config';

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = APP_URL || 'https://rankonetsy.com';

    const nicheUrls = POPULAR_NICHES.map((niche) => ({
        url: `${baseUrl}/trends/${niche.slug}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
    }));

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/app`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.9,
        },
        ...nicheUrls,
    ];
}
