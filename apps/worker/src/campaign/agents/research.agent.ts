import { Injectable, Logger } from '@nestjs/common';
import Groq from 'groq-sdk';
import { CheerioScraperService } from '../../modules/scraper/cheerio-scraper.service';
import { SearchAggregatorService } from '../../modules/scraper/search-aggregator.service';

export interface CompanyProfile {
    coreOffering: string;
    valueProposition: string;
    targetAudience: string;
    uniqueAngle: string; // The "Trigger Event" or specific hook for the email
    obscureFact: string; // A tiny, friendly, obscure fact found on their site for the P.S. hook
}

@Injectable()
export class ResearchAgent {
    private readonly logger = new Logger(ResearchAgent.name);
    private client: Groq;
    private model = 'llama-3.3-70b-versatile';

    constructor(
        private readonly cheerioScraper: CheerioScraperService,
        private readonly searchAggregator: SearchAggregatorService,
    ) {
        const apiKey = process.env.GROQ_API_KEY;
        this.client = new Groq({ apiKey: apiKey || 'dummy' });
    }

    async investigate(website: string, companyName: string): Promise<CompanyProfile | null> {
        this.logger.log(`🔍 [Research Agent] Investigating: ${companyName} (${website})`);

        try {
            // 1. Parallel Data Collection
            const [scrapedHtmlText, serpResults] = await Promise.all([
                this.cheerioScraper.extractCompanyContext(website).catch(() => ''),
                // Fetch external context (news, listings, reviews) if SerpApi is active
                process.env.SERPAPI_KEY ? this.searchAggregator.searchFree(companyName, 3).catch(() => []) : Promise.resolve([])
            ]);

            if (!scrapedHtmlText && (!serpResults || serpResults.length === 0)) {
                this.logger.warn(`⚠️ [Research Agent] No data found for ${companyName}`);
                return null;
            }

            // 2. Format Context for the LLM
            let contextBuilder = `COMPANY NAME: ${companyName}\nWEBSITE: ${website}\n\n`;

            if (scrapedHtmlText) {
                contextBuilder += `--- INTERNAL WEBSITE DATA ---\n${scrapedHtmlText}\n\n`;
            }

            if (serpResults && serpResults.length > 0) {
                contextBuilder += `--- EXTERNAL SEARCH DATA ---\n`;
                serpResults.forEach((res: any, i: number) => {
                    contextBuilder += `[Result ${i + 1}] Title: ${res.title} | URL: ${res.url}\n`;
                });
            }

            // 3. Inference: Synthesize the Company Profile
            const prompt = `You are a world-class B2B Research Analyst. Analyze the following raw data scraped from a target company's website and external search results. 
Your goal is to extract exactly what this company does to help a Copywriter draft a hyper-personalized cold outreach email.

RAW DATA:
${contextBuilder}

INSTRUCTIONS for extraction:
1. coreOffering: What exactly do they sell or do? Be highly specific (e.g., "AI-powered inventory management software", not "software solutions"). Minimum 5 words, maximum 15.
2. valueProposition: What is their main claim to fame or benefit on their site? What problem do they solve?
3. targetAudience: Who is their ideal buyer?
4. uniqueAngle: Find a highly specific detail, mission statement, recent focus area, or unique capability mentioned in the text that could act as a "Trigger Event" for our cold email. This MUST be something a human would notice if they actually read their website. E.g., "They specifically cater to dental offices struggling with missed appointments" or "They recently launched a multi-tenant architecture API".
5. obscureFact: Find a very tiny, friendly, specific detail that proves we spent time on their site. This is for a casual "P.S." line. Example: "They are based in Austin", "They just opened a new office", "They have a company dog named Buster", "They were founded in 2012", "They recently attended [Conference Name]". If nothing is found, return an empty string.

RESPOND IN EXACTLY THIS JSON FORMAT:
{
  "coreOffering": "...",
  "valueProposition": "...",
  "targetAudience": "...",
  "uniqueAngle": "...",
  "obscureFact": "..."
}`;

            const completion = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: this.model,
                temperature: 0.2, // Low temp for factual extraction
                max_tokens: 500,
                response_format: { type: 'json_object' },
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) return null;

            const profile: CompanyProfile = JSON.parse(content);
            this.logger.log(`✅ [Research Agent] Profile Generated for ${companyName}: Found ${profile.coreOffering}`);

            return profile;

        } catch (error: any) {
            this.logger.error(`❌ [Research Agent] Failed to investigate ${companyName}: ${error.message}`);
            return null;
        }
    }
}
