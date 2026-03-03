import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ExtractedData {
    email?: string;
    phone?: string;
    facebook?: string;
    linkedin?: string;
    instagram?: string;
}

// Regex patterns (ported from the legacy PlaywrightService)
const EMAIL_RE = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,})/i;
const PHONE_RE = /(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/;
const FB_RE = /https?:\/\/(www\.)?facebook\.com\/[^\s"'<>]+/i;
const LI_RE = /https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[^\s"'<>]+/i;
const IG_RE = /https?:\/\/(www\.)?instagram\.com\/[^\s"'<>]+/i;

// Junk email patterns to filter out (tracking pixels, assets, etc.)
const JUNK_EMAIL_SUFFIXES = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js'];

@Injectable()
export class CheerioScraperService {
    private readonly logger = new Logger(CheerioScraperService.name);

    /**
     * Smart multi-page extraction:
     * Fetches homepage, /contact, and /about simultaneously, then runs regex over all HTML.
     */
    async extractFromWebsite(baseUrl: string): Promise<ExtractedData> {
        if (!baseUrl) return {};

        // Normalize URL
        const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const targets = [
            base,
            `${base}/contact`,
            `${base}/contact-us`,
            `${base}/about`,
            `${base}/about-us`,
        ];

        // Fetch all pages in parallel (fail silently for 404s)
        const htmlChunks = await Promise.all(
            targets.map(url => this.fetchPage(url))
        );

        const combinedHtml = htmlChunks.join('\n');
        if (!combinedHtml.trim()) {
            this.logger.warn(`No HTML retrieved from ${baseUrl}`);
            return {};
        }

        // Load into cheerio and extract visible text + raw HTML
        const $ = cheerio.load(combinedHtml);
        const fullText = $('body').text() + ' ' + combinedHtml;

        return this.extractData(fullText);
    }

    /**
     * Extract data from pre-rendered HTML (used by Pro tier with Oxylabs-rendered content).
     */
    extractFromHtml(html: string): ExtractedData {
        if (!html) return {};
        const $ = cheerio.load(html);
        const fullText = $('body').text() + ' ' + html;
        return this.extractData(fullText);
    }

    private extractData(text: string): ExtractedData {
        const result: ExtractedData = {};

        const emailMatch = text.match(EMAIL_RE);
        if (emailMatch && !JUNK_EMAIL_SUFFIXES.some(s => emailMatch[0].endsWith(s))) {
            result.email = emailMatch[0];
        }

        const phoneMatch = text.match(PHONE_RE);
        if (phoneMatch) result.phone = phoneMatch[0];

        const fbMatch = text.match(FB_RE);
        if (fbMatch) result.facebook = fbMatch[0].replace(/['"<>]/g, '');

        const liMatch = text.match(LI_RE);
        if (liMatch) result.linkedin = liMatch[0].replace(/['"<>]/g, '');

        const igMatch = text.match(IG_RE);
        if (igMatch) result.instagram = igMatch[0].replace(/['"<>]/g, '');

        return result;
    }

    private async fetchPage(url: string): Promise<string> {
        try {
            const { data } = await axios.get(url, {
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                maxRedirects: 3,
                validateStatus: (s) => s < 400,
            });
            return typeof data === 'string' ? data : '';
        } catch {
            return '';
        }
    }

    /**
     * Extracts pure semantic text (Headers, Paragraphs, Meta Descriptions)
     * optimized specifically for feeding into the LLM Research Agent.
     */
    async extractCompanyContext(url: string): Promise<string> {
        if (!url) return '';

        try {
            const html = await this.fetchPage(url);
            if (!html) return '';

            const $ = cheerio.load(html);

            // Remove useless/noisy elements
            $('script, style, noscript, iframe, svg, nav, footer, header, .nav, .footer, .menu, [role="navigation"]').remove();

            let contextText = '';

            // 1. Grab meta description first (highest value signal)
            const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content');
            if (metaDesc) {
                contextText += `META DESCRIPTION: ${metaDesc.trim()}\n\n`;
            }

            // 2. Grab H1 (Core value prop)
            const h1 = $('h1').first().text().trim();
            if (h1) {
                contextText += `H1 HERO: ${h1}\n\n`;
            }

            // 3. Grab remaining headings and paragraphs to build out features
            $('h2, h3, p').each((_, el) => {
                const text = $(el).text().replace(/\s+/g, ' ').trim();
                // Filter out tiny snippets (likely buttons/menus that weren't caught) or massive walls of text
                if (text.length > 20 && text.length < 1000) {
                    contextText += `${text}\n`;
                }
            });

            // Limit to roughly 5000 characters to prevent blowing out the context window
            // and keep extraction incredibly fast and focused.
            return contextText.slice(0, 5000);
        } catch (error) {
            this.logger.error(`Failed to extract context from ${url}: ${error}`);
            return '';
        }
    }
}
