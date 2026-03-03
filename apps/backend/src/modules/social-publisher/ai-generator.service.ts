import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Mistral } from '@mistralai/mistralai';
import { fal } from '@fal-ai/client';

export interface GenerateImageDto {
    topic: string;
    style?: string;
    aspectRatio?: string;
}

@Injectable()
export class AiGeneratorService {
    private readonly logger = new Logger(AiGeneratorService.name);
    private readonly mistral: Mistral;

    constructor() {
        const mistralKey = process.env.MISTRAL_API_KEY;
        const falKey = process.env.FAL_AI_API_KEY;

        if (!mistralKey || !falKey) {
            this.logger.warn('MISTRAL_API_KEY or FAL_AI_API_KEY is not defined in .env! AI generation will fail.');
        }

        this.mistral = new Mistral({
            apiKey: process.env.MISTRAL_API_KEY || 'dummy_key',
        });

        // Initialize fal.ai
        if (falKey) {
            fal.config({
                credentials: process.env.FAL_AI_API_KEY,
            });
        }
    }

    async generateImage(dto: GenerateImageDto) {
        const { topic, style = 'Photorealistic', aspectRatio = '1:1' } = dto;

        if (!process.env.MISTRAL_API_KEY || !process.env.FAL_AI_API_KEY) {
            throw new HttpException(
                'AI features are not configured. Please add Mistral and Fal.ai keys to the server.',
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        // ─────────────────────────────────────────────────────────────
        // STEP 1: Decide model + generation philosophy
        // ─────────────────────────────────────────────────────────────
        let targetModel = 'fal-ai/flux-pro';
        let inferenceSteps = 32;
        let guidanceScale = 5.5;
        let styleGuidelines = '';

        const lowerStyle = style.toLowerCase();

        if (['photorealistic', 'lifestyle', 'minimalist', 'cinematic'].includes(lowerStyle)) {
            targetModel = 'fal-ai/flux-pro';
            inferenceSteps = 32;
            guidanceScale = 5.0;
            styleGuidelines = `
STYLE FOCUS:
- Ultra-realistic Instagram lifestyle photography
- Authentic, candid, unposed real-world moments
- Shot on a high-end smartphone or DSLR camera (e.g., 35mm lens, f/1.8, natural depth of field)
- Natural lighting (e.g., golden hour, soft overcast, or cinematic ambient light)
- Include "slightly uneven fur/hair texture", "natural skin texture", and "subtle natural flaws"
- Use "natural film-like color grading, slightly muted"
- Believable environments with real-world physics and textures

AVOID (CRITICAL):
- Words like: "Hyperrealistic", "8K", "Masterpiece", "Ultra-detailed", "Trending on ArtStation"
- Plastic, airbrushed, CGI, or stock-photo perfection
- Overly vibrant, HDR, or artificially saturated colors
- Perfect symmetry or stiff, unnatural poses
      `.trim();
        } else if (['fantasy', 'digital art', 'anime', 'sci-fi'].includes(lowerStyle)) {
            targetModel = 'fal-ai/z-image/turbo';
            inferenceSteps = 28;
            guidanceScale = 7.5;
            styleGuidelines = `
STYLE FOCUS:
- Cinematic, visually striking ${style} illustration
- Stylized, dramatic lighting and rich atmospheric details
- High-end concept art aesthetic
      `.trim();
        } else {
            targetModel = 'fal-ai/flux-pro';
            inferenceSteps = 32;
            guidanceScale = 5.5;
            styleGuidelines = `
STYLE FOCUS:
- Authentic ${style} look
- Natural colors and lighting
- Social-media-friendly realism
      `.trim();
        }

        try {
            // ─────────────────────────────────────────────────────────────
            // STEP 2: Mistral prompt engineering
            // ─────────────────────────────────────────────────────────────
            const systemPrompt = `
You are a world-class professional photographer and viral Instagram creative director.

Your task is to generate a complete Instagram post package consisting of:
1. A highly authentic, social-media-optimized image generation prompt
2. An engaging, conversion-optimized Instagram caption
3. A set of relevant and trending hashtags

IMAGE PROMPT RULES (CRITICAL):
- The image MUST be indistinguishable from a real photograph taken by a human.
- Write the prompt describing the exact camera, lighting, framing, and tangible textures.
- Focus intensely on authenticity, real-world lighting, natural colors, and subtle imperfections.
- NEVER use AI-art buzzwords like: "8K", "hyperrealistic", "masterpiece", "ultra-detailed", or "CGI".
- The prompt should read like a set description for a photoshoot.

OUTPUT FORMAT:
Return ONLY a valid JSON object with this exact structure (no markdown wrapper):

{
  "imagePrompt": "string (the highly realistic photographic prompt)",
  "caption": "string",
  "hashtags": "string"
}
      `.trim();

            const userMessage = `
Create an Instagram post package for the following topic:

Topic: "${topic.trim()}"
Style: ${style}
Aspect Ratio: ${aspectRatio}

${styleGuidelines}

Make the image prompt vivid, specific, and optimized for maximum authentic engagement on Instagram.
      `.trim();

            this.logger.log(`Requesting prompt engineering from Mistral for topic: ${topic}`);

            const chatResponse = await this.mistral.chat.complete({
                model: 'mistral-large-latest',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage },
                ],
                temperature: 0.7,
            });

            let aiContent;
            try {
                let contentString = chatResponse.choices?.[0]?.message?.content?.toString() || '{}';

                // Safety cleanup (in case model wraps JSON)
                if (contentString.startsWith('\`\`\`')) {
                    contentString = contentString
                        .replace(/^\`\`\`(json)?/i, '')
                        .replace(/\`\`\`$/i, '')
                        .trim();
                }

                aiContent = JSON.parse(contentString);
            } catch (err) {
                this.logger.error('Failed to parse AI response', err);
                throw new HttpException('Failed to parse AI response from Mistral', HttpStatus.BAD_GATEWAY);
            }

            const enhancedPrompt = aiContent.imagePrompt;

            if (!enhancedPrompt) {
                throw new HttpException('Mistral returned an invalid prompt', HttpStatus.BAD_GATEWAY);
            }

            // ─────────────────────────────────────────────────────────────
            // STEP 3: fal.ai image generation
            // ─────────────────────────────────────────────────────────────
            this.logger.log(`Requesting image generation from ${targetModel} via fal.ai`);

            const sizeMap: Record<string, string> = {
                '1:1': 'square_hd',
                '16:9': 'landscape_16_9',
                '9:16': 'portrait_16_9',
                '4:3': 'landscape_4_3',
            };

            const imageSize = sizeMap[aspectRatio] || 'square_hd';

            const result = await fal.subscribe(targetModel, {
                input: {
                    prompt: enhancedPrompt,
                    image_size: imageSize,
                    num_inference_steps: inferenceSteps,
                    guidance_scale: guidanceScale,
                    num_images: 1,
                    enable_safety_checker: true,
                },
                logs: false,
            }) as any;

            const imageUrl = result?.data?.images?.[0]?.url;

            if (!imageUrl) {
                this.logger.error(`fal.ai generation failed. Response: ${JSON.stringify(result)}`);
                throw new HttpException('fal.ai image generation failed', HttpStatus.BAD_GATEWAY);
            }

            this.logger.log('Image generated successfully.');

            return {
                imageUrl,
                prompt: enhancedPrompt,
                caption: aiContent.caption,
                hashtags: aiContent.hashtags,
                topic: topic.trim(),
                style,
                aspectRatio,
                modelUsed: targetModel,
            };

        } catch (err: any) {
            this.logger.error(`AI Generation Error: ${err.message}`, err.stack);

            // Re-throw HttpExceptions as is
            if (err instanceof HttpException) {
                throw err;
            }

            throw new HttpException(
                err.message || 'Internal server error during AI generation',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }
}
