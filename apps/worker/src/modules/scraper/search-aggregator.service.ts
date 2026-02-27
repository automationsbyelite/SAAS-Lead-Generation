import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface SearchResult {
    title: string;
    url: string;
    phone?: string;
    address?: string;
}

@Injectable()
export class SearchAggregatorService {
    private readonly logger = new Logger(SearchAggregatorService.name);

    /**
     * Route A (Free Tier): SerpApi Google Local
     * Returns business name, website URL, and phone number natively from Google Maps listings.
     */
    async searchFree(query: string, limit: number): Promise<SearchResult[]> {
        const apiKey = process.env.SERPAPI_KEY;
        if (!apiKey) {
            this.logger.error('SERPAPI_KEY is not configured in .env');
            throw new Error('Search API key is not configured');
        }

        this.logger.log(`[FREE] SerpApi Local search: "${query}" (over-fetching ${limit * 3} for quality gate)`);

        try {
            const { data } = await axios.get('https://serpapi.com/search.json', {
                params: {
                    engine: 'google_maps',
                    q: query,
                    type: 'search',
                    api_key: apiKey,
                    num: Math.min(limit * 3, 60), // Over-fetch 3x for quality filtering
                },
                timeout: 15000,
            });

            const results: SearchResult[] = (data.local_results || []).map((r: any) => ({
                title: r.title || 'Unknown Business',
                url: r.website || '',
                phone: r.phone || undefined,
                address: r.address || undefined,
            }));

            this.logger.log(`[FREE] SerpApi returned ${results.length} raw results`);
            return results;
        } catch (error: any) {
            this.logger.error(`[FREE] SerpApi failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Route B (Pro Tier): Oxylabs Web Scraper API
     * Handles JS rendering, proxy rotation, and CAPTCHA solving on their infrastructure.
     * Returns fully rendered HTML for each target URL.
     */
    async searchPro(query: string, limit: number): Promise<SearchResult[]> {
        const username = process.env.OXYLABS_USERNAME;
        const password = process.env.OXYLABS_PASSWORD;

        if (!username || !password) {
            this.logger.warn('[PRO] Oxylabs credentials not configured. Falling back to Free engine.');
            return this.searchFree(query, limit);
        }

        this.logger.log(`[PRO] Oxylabs search: "${query}" (over-fetching ${limit * 3})`);

        try {
            const { data } = await axios.post(
                'https://realtime.oxylabs.io/v1/queries',
                {
                    source: 'google_search',
                    query: query,
                    geo_location: 'United States',
                    parse: true,
                    limit: Math.min(limit * 3, 60),
                },
                {
                    auth: { username, password },
                    timeout: 30000,
                }
            );

            const organic = data?.results?.[0]?.content?.results?.organic || [];
            const results: SearchResult[] = organic.map((r: any) => ({
                title: r.title || 'Unknown Business',
                url: r.url || '',
            }));

            this.logger.log(`[PRO] Oxylabs returned ${results.length} raw results`);
            return results;
        } catch (error: any) {
            this.logger.error(`[PRO] Oxylabs failed: ${error.message}. Falling back to Free engine.`);
            return this.searchFree(query, limit);
        }
    }

    /**
     * Pro Tier: Fetch fully rendered HTML via Oxylabs Web Scraper
     * This replaces Playwright's deep crawl entirely — Oxylabs renders JS on their side.
     */
    async fetchRenderedHtml(url: string): Promise<string> {
        const username = process.env.OXYLABS_USERNAME;
        const password = process.env.OXYLABS_PASSWORD;

        if (!username || !password) return '';

        try {
            const { data } = await axios.post(
                'https://realtime.oxylabs.io/v1/queries',
                {
                    source: 'universal',
                    url: url,
                    render: 'html',
                },
                {
                    auth: { username, password },
                    timeout: 20000,
                }
            );
            return data?.results?.[0]?.content || '';
        } catch {
            return '';
        }
    }
}
