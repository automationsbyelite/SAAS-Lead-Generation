import * as dotenv from 'dotenv';
import path from 'path';
import { SearchAggregatorService } from './modules/scraper/search-aggregator.service';
import { CheerioScraperService } from './modules/scraper/cheerio-scraper.service';

// Load env from the worker directory (one level up)
dotenv.config({ path: path.join(__dirname, '../.env') });

async function testScraper() {
    console.log('🚀 Starting Tiered Scraper Test...');

    const searchService = new SearchAggregatorService();
    const cheerioService = new CheerioScraperService();

    // Check if SerpApi key is present
    if (process.env.SERPAPI_KEY === 'YOUR_SERPAPI_KEY_HERE' || !process.env.SERPAPI_KEY) {
        console.warn('⚠️  Warning: SERPAPI_KEY is not set in .env. Falling back to a hardcoded test URL check.');

        const testUrl = 'https://oxylabs.io/'; // You can change this to any real URL
        console.log(`\n🔍 Testing Cheerio Extraction on: ${testUrl}`);
        const data = await cheerioService.extractFromWebsite(testUrl);
        console.log('✅ Extracted Data:', JSON.stringify(data, null, 2));

        if (!data.phone && !data.email) {
            console.log('❌ Quality Gate Check: Lead would be REJECTED (Missing Phone/Email)');
        } else {
            console.log('💎 Quality Gate Check: Lead would be ACCEPTED');
        }
        return;
    }

    const query = 'Plumbers in Dallas, TX';
    const limit = 3;

    try {
        console.log(`\n🔎 [FREE TIER] Testing SerpApi + Cheerio for: "${query}"`);
        const results = await searchService.searchFree(query, limit);
        console.log(`Found ${results.length} candidates. Processing top result...`);

        if (results.length > 0) {
            const first = results[0];
            console.log(`\n🏢 Company: ${first.title}`);
            console.log(`🔗 Website: ${first.url}`);
            console.log(`📞 Google Maps Phone: ${first.phone || 'N/A'}`);

            if (first.url) {
                console.log('🕵️ Deep Crawling via Cheerio...');
                const extracted = await cheerioService.extractFromWebsite(first.url);
                console.log('✅ Extraction Result:', JSON.stringify(extracted, null, 2));
            }
        }

        // Test Pro Tier if Oxylabs keys are present
        if (process.env.OXYLABS_USERNAME && process.env.OXYLABS_USERNAME !== 'YOUR_OXYLABS_USERNAME') {
            console.log(`\n💎 [PRO TIER] Testing Oxylabs engine...`);
            const proResults = await searchService.searchPro(query, 1);
            console.log(`Pro result found: ${proResults[0]?.title}`);
        }

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
    }
}

testScraper();
