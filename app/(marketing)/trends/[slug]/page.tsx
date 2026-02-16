import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DashboardClient from '@/app/components/DashboardClient';
import { POPULAR_NICHES } from '@/src/lib/nicheData';
import { getSimulatedEtsyData } from '@/src/lib/etsyDataEngine';

// Generate static params for all 20 niches
export async function generateStaticParams() {
    return POPULAR_NICHES.map((niche) => ({
        slug: niche.slug,
    }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const niche = POPULAR_NICHES.find((n) => n.slug === slug);

    if (!niche) {
        return {
            title: 'Niche Not Found',
        };
    }

    return {
        title: `Best Etsy Keywords for ${niche.title} - 2026 Guide`,
        description: `Detailed market analysis for ${niche.title} on Etsy. Market demand: High. Competition: Low. Get the best keywords and tags to rank higher in 2026.`,
        alternates: {
            canonical: `https://rankonetsy.com/trends/${slug}`,
        }
    };
}

export default async function NicheTrendPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const niche = POPULAR_NICHES.find((n) => n.slug === slug);

    if (!niche) {
        notFound();
    }

    // Pre-fetch simulated data for this niche
    const initialData = await getSimulatedEtsyData(niche.title);

    return (
        <DashboardClient
            initialKeyword={niche.title}
            initialData={initialData}
            readOnly={true}
        />
    );
}
