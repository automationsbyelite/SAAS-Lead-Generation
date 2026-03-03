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
    // Agent Intelligence
    companyProfile?: {
        coreOffering: string;
        valueProposition: string;
        targetAudience: string;
        uniqueAngle: string;
        obscureFact?: string;
    } | null;
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

        // Agent Intelligence (If the Research Agent found data)
        const agentContext = input.companyProfile ? `
CRUCIAL CONTEXT (Provided by our Research Agent):
- What They Actively Sell/Do: ${input.companyProfile.coreOffering}
- Their Main Value Prop: ${input.companyProfile.valueProposition}
- Their Audience: ${input.companyProfile.targetAudience}
- THE UNIQUE ANGLE (Trigger Event): ${input.companyProfile.uniqueAngle}
${input.companyProfile.obscureFact ? `- OBSCURE FACT (For P.S. Hook): ${input.companyProfile.obscureFact}` : ''}
` : '';

        // Clean up the contact name (often it's 'Test' or 'Unknown' from basic form data)
        let resolvedContactName = input.contactName?.trim();
        if (resolvedContactName) {
            const lowerName = resolvedContactName.toLowerCase();
            if (['test', 'unknown', 'n/a', 'na', 'test name', 'dummy', 'none'].includes(lowerName)) {
                resolvedContactName = undefined;
            }
        }

        const prompt = `You are an elite, world-class B2B cold email copywriter. Your ONLY job is to write a highly detailed, deeply personalized, conversational cold email that connects our offering to their business reality. Your goal is to write a substantial, thoughtful email that proves you have done deep research.

RECIPIENT BUSINESS INTEL:
- Company Name: ${input.companyName}
${resolvedContactName ? `- Decision Maker: ${resolvedContactName}` : '- Decision Maker: Unknown (address as the leader or team of the business)'}
${input.website ? `- Their Website: ${input.website}` : ''}
${input.category ? `- Industry: ${input.category}` : ''}
${agentContext}

SENDER PROFILE:
- Name: ${input.senderName}
- Title: ${input.senderRole}
- Company: ${input.senderCompany}

VALUE PROPOSITION (What we want to pitch):
- What We Offer: ${input.offering}
- Their Likely Pain Point: ${input.painPoint}
- Desired Action: ${input.ctaText}
${input.ctaLink ? `- Booking/CTA Link: ${input.ctaLink}` : ''}

TONE: ${toneGuide}

CRITICAL RULES — follow these EXACTLY:
1. SUBJECT LINE: Max 6-8 words. Reference their specific core offering or industry.
2. GREETING: If a specific Contact Name is provided, use "Hi {FirstName},". If the Contact Name is Unknown, use a professional greeting like "Hi ${input.companyName} team,". Do NOT use fake names.
3. PARAGRAPH 1 (The Deep Research Hook - 4 to 5 sentences): Prove you spent time studying their business. Give a detailed observation of their specific ${input.companyProfile?.coreOffering || 'services'} and how they serve ${input.companyProfile?.targetAudience || 'their clients'}. Be highly specific. Explain exactly why their approach stands out in the current market.
4. PARAGRAPH 2 (The Insight & Pain Point - 4 to 5 sentences): Build upon your observation. Discuss the broader industry trends and the specific complexities of scaling their model. Seamlessly transition into the likely ${input.painPoint}, explaining the hidden costs or bottlenecks this causes in detail.
5. PARAGRAPH 3 (Our Solution & Value - 4 to 5 sentences): Introduce ${input.offering} as the natural solution. Do not just list features; paint a vivid picture of how their daily operations or bottom line will transform. Use descriptive language to explain the mechanics of how our software/service integrates into their workflow.
6. PARAGRAPH 4 (The Soft Pitch & CTA - 2 sentences): Wrap up your thoughts gracefully. End with a single, low-friction ask: ${input.ctaText}.
7. SIGN-OFF: Professional signature with name, title, company.
8. THE P.S. HOOK: If an "OBSCURE FACT" is provided in the context, you MUST add a warm, conversational "P.S." line below the signature about it.
9. LENGTH & DEPTH ALARM: The email MUST be substantial. It must be at least 250-350 words total. Do NOT write short, 1-sentence paragraphs. Write flowing, comprehensive thoughts.
10. ABSOLUTELY NO: "I hope this email finds you well", "synergy", "circle back", or generic clichés.

RESPOND IN EXACTLY THIS JSON FORMAT:
{"subject": "your subject line here", "body": "your full email body here with \\n\\n for double line breaks between paragraphs"}`;

        try {
            const completion = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: this.model,
                temperature: 0.85,
                max_tokens: 1500,
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
