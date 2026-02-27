import Groq from 'groq-sdk';

export interface EmailGenerationInput {
    // Lead data
    companyName: string;
    contactName?: string;
    website?: string;
    category?: string;
    // Email config from campaign
    senderName: string;
    senderRole: string;
    senderCompany: string;
    offering: string;
    painPoint: string;
    ctaText: string;
    ctaLink?: string;
    tone: string;
}

export interface GeneratedEmail {
    subject: string;
    body: string;
    htmlBody: string;
}

export class GroqEmailService {
    private client: Groq;
    private model = 'llama-3.3-70b-versatile';

    constructor() {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.warn('GROQ_API_KEY not set. Email generation will use fallback templates.');
        }
        this.client = new Groq({ apiKey: apiKey || 'dummy' });
    }

    async generateEmail(input: EmailGenerationInput): Promise<GeneratedEmail> {
        // Fallback if no API key
        if (!process.env.GROQ_API_KEY) {
            return this.fallbackEmail(input);
        }

        const toneGuide = {
            PROFESSIONAL: 'Formal, authoritative, and warm. Write like a seasoned consultant who genuinely wants to help.',
            FRIENDLY: 'Conversational and approachable, like a trusted colleague sharing a valuable insight.',
            CASUAL: 'Relaxed and natural, like a quick note from someone who stumbled on their business and had a genuine idea.',
        }[input.tone] || 'Professional and business-like.';

        const prompt = `You are a world-class B2B cold email copywriter. Your emails consistently get 40%+ open rates and 15%+ reply rates. Write a hyper-personalized cold outreach email that feels like it was written by a real human who actually researched the recipient's business.

RECIPIENT BUSINESS INTEL:
- Company Name: ${input.companyName}
${input.contactName ? `- Decision Maker: ${input.contactName}` : '- Decision Maker: Unknown (address as business owner)'}
${input.website ? `- Their Website: ${input.website}` : ''}
${input.category ? `- Industry: ${input.category}` : ''}

SENDER PROFILE:
- Name: ${input.senderName}
- Title: ${input.senderRole}
- Company: ${input.senderCompany}

VALUE PROPOSITION:
- What We Offer: ${input.offering}
- Their Likely Pain Point: ${input.painPoint}
- Desired Action: ${input.ctaText}
${input.ctaLink ? `- Booking/CTA Link: ${input.ctaLink}` : ''}

TONE: ${toneGuide}

CRITICAL RULES — follow these EXACTLY:
1. SUBJECT LINE: Max 6-8 words. Must feel personal, NOT salesy. Reference their company name or industry. Never use words like "opportunity", "exciting", "limited time". Examples of great subjects: "Quick thought about {Company}'s growth", "{Company} + better local visibility?", "Noticed something about {Company}".
2. GREETING: If contact name is known, use "Hi {FirstName}," — otherwise use "Hi there,". NEVER use "Dear" or "To whom it may concern".
3. OPENING LINE (crucial): Start with a SPECIFIC observation about their business. Reference their website, their Google presence, their industry position, or something unique. This MUST feel like you actually visited their site. Example: "I was looking at {website} earlier and noticed you've built a solid reputation in {category}."
4. PAIN POINT BRIDGE: Transition naturally from your observation into the pain point. Don't just state it — frame it as an insight. Example: "One thing I've seen with businesses like yours is that [pain point framed as industry trend]."
5. VALUE PROPOSITION: Briefly explain how you solve this — 1-2 sentences max. Be specific about outcomes, not features. Use numbers if possible.
6. CTA: End with a single, low-friction ask. Make it easy to say yes. If there's a link, embed it naturally.
7. SIGN-OFF: Professional signature with name, title, company. Keep it clean.
8. LENGTH: Total email body MUST be 80-150 words. No more. Every word must earn its place.
9. FORMATTING: Use short paragraphs (2-3 sentences max each). Include natural line breaks between paragraphs.
10. ABSOLUTELY NO: "I hope this email finds you well", "I'm reaching out because", "I wanted to touch base", "synergy", "leverage", "circle back", or any corporate cliché.

RESPOND IN EXACTLY THIS JSON FORMAT (no markdown, no code blocks, no extra keys):
{"subject": "your subject line here", "body": "your full email body here with \\n for line breaks between paragraphs"}`;

        try {
            const completion = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: this.model,
                temperature: 0.85,
                max_tokens: 600,
                response_format: { type: 'json_object' },
            });

            const content = completion.choices[0]?.message?.content;
            if (!content) {
                throw new Error('Empty response from Groq');
            }

            const parsed = JSON.parse(content);
            const plainBody = parsed.body || this.fallbackEmail(input).body;
            const subject = parsed.subject || `Quick thought about ${input.companyName}`;

            return {
                subject,
                body: plainBody,
                htmlBody: this.convertToHtml(plainBody, input),
            };
        } catch (error: any) {
            console.error(`Groq email generation failed: ${error.message}. Using fallback.`);
            return this.fallbackEmail(input);
        }
    }

    /**
     * Converts the AI-generated plain text body into styled HTML paragraphs.
     */
    private convertToHtml(plainText: string, input: EmailGenerationInput): string {
        const paragraphs = plainText
            .split(/\n\n|\n/)
            .filter((p: string) => p.trim().length > 0)
            .map((p: string) => {
                // Detect signature lines (short lines at the end like "Best,", "John", "CEO, Acme")
                const trimmed = p.trim();
                return `<p style="margin: 0 0 14px 0; line-height: 1.7; color: #374151;">${trimmed}</p>`;
            })
            .join('\n');

        // If there's a CTA link, make it a styled button
        let ctaButton = '';
        if (input.ctaLink) {
            ctaButton = `
            <div style="text-align: center; margin: 28px 0 16px 0;">
                <a href="${input.ctaLink}" style="display: inline-block; padding: 12px 28px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; letter-spacing: 0.3px;">${input.ctaText || 'Book a Call'}</a>
            </div>`;
        }

        return `${paragraphs}${ctaButton}`;
    }

    private fallbackEmail(input: EmailGenerationInput): GeneratedEmail {
        const greeting = input.contactName ? `Hi ${input.contactName},` : 'Hi there,';
        const websiteRef = input.website ? ` — I took a look at <strong>${input.website}</strong> and` : '';
        const categoryRef = input.category ? ` in the <strong>${input.category}</strong> industry` : '';

        const plainBody = `${greeting}

I came across ${input.companyName}${websiteRef ? ` (${input.website})` : ''} and was genuinely impressed by what you've built${categoryRef}.

${input.painPoint}

At ${input.senderCompany}, we specialize in ${input.offering} — helping businesses like yours see real, measurable results.

${input.ctaText}${input.ctaLink ? `\n${input.ctaLink}` : ''}

Best regards,
${input.senderName}
${input.senderRole}, ${input.senderCompany}`;

        const htmlBody = `
            <p style="margin: 0 0 14px 0; line-height: 1.7; color: #374151;">${greeting}</p>
            <p style="margin: 0 0 14px 0; line-height: 1.7; color: #374151;">I came across <strong>${input.companyName}</strong>${websiteRef} was genuinely impressed by what you've built${categoryRef}.</p>
            <p style="margin: 0 0 14px 0; line-height: 1.7; color: #374151;">${input.painPoint}</p>
            <p style="margin: 0 0 14px 0; line-height: 1.7; color: #374151;">At <strong>${input.senderCompany}</strong>, we specialize in ${input.offering} — helping businesses like yours see real, measurable results.</p>
            <p style="margin: 0 0 14px 0; line-height: 1.7; color: #374151;">${input.ctaText}</p>
            ${input.ctaLink ? `<div style="text-align: center; margin: 28px 0 16px 0;"><a href="${input.ctaLink}" style="display: inline-block; padding: 12px 28px; background-color: #4F46E5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">${input.ctaText || 'Learn More'}</a></div>` : ''}
            <p style="margin: 0 0 4px 0; line-height: 1.7; color: #374151;">Best regards,</p>
            <p style="margin: 0 0 2px 0; line-height: 1.5; color: #111827; font-weight: 600;">${input.senderName}</p>
            <p style="margin: 0; line-height: 1.5; color: #6B7280; font-size: 13px;">${input.senderRole}, ${input.senderCompany}</p>`;

        return {
            subject: `Quick thought about ${input.companyName}`,
            body: plainBody,
            htmlBody,
        };
    }
}
