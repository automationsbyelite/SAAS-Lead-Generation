import * as nodemailer from 'nodemailer';

export interface SendEmailPayload {
    to: string;
    subject: string;
    body: string;
    html?: string;
    replyTo?: string;
}

export class EmailClient {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.ethereal.email',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    /**
     * Wraps the AI-generated HTML body content in a professional, responsive email template.
     */
    wrapInTemplate(htmlBody: string, subject: string): string {
        const senderCompany = process.env.SMTP_FROM_NAME || 'Our Company';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${subject}</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <!-- Outer wrapper -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6;">
        <tr>
            <td align="center" style="padding: 32px 16px;">
                <!-- Inner card -->
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                    
                    <!-- Accent bar -->
                    <tr>
                        <td style="height: 4px; background: linear-gradient(90deg, #4F46E5, #7C3AED, #4F46E5); font-size: 0; line-height: 0;">&nbsp;</td>
                    </tr>
                    
                    <!-- Email body -->
                    <tr>
                        <td style="padding: 36px 40px 32px 40px; font-size: 15px; line-height: 1.7; color: #374151;">
                            ${htmlBody}
                        </td>
                    </tr>
                    
                    <!-- Divider -->
                    <tr>
                        <td style="padding: 0 40px;">
                            <div style="height: 1px; background-color: #e5e7eb;"></div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 40px 28px 40px; text-align: center;">
                            <p style="margin: 0 0 8px 0; font-size: 12px; color: #9CA3AF; line-height: 1.5;">
                                Sent by <strong style="color: #6B7280;">${senderCompany}</strong>
                            </p>
                            <p style="margin: 0; font-size: 11px; color: #D1D5DB; line-height: 1.5;">
                                You're receiving this because we believe our service may be relevant to your business.
                                <br/>
                                <a href="#" style="color: #9CA3AF; text-decoration: underline;">Unsubscribe</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
    }

    async sendEmail(payload: SendEmailPayload): Promise<{ messageId: string }> {
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS || process.env.SMTP_USER === 'your_email@gmail.com') {
            console.warn('[EmailClient] SMTP credentials not configured. Email simulated.');
            console.log(`  → To: ${payload.to}`);
            console.log(`  → Subject: ${payload.subject}`);
            console.log(`  → Body preview: ${payload.body.substring(0, 100)}...`);
            return { messageId: `simulated-${Date.now()}` };
        }

        try {
            // If raw HTML content was provided, wrap it in the professional template
            const finalHtml = payload.html
                ? this.wrapInTemplate(payload.html, payload.subject)
                : undefined;

            const info = await this.transporter.sendMail({
                from: `"${process.env.SMTP_FROM_NAME || 'SaaS Platform'}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
                to: payload.to,
                subject: payload.subject,
                text: payload.body,
                html: finalHtml || undefined,
                replyTo: payload.replyTo || undefined,
            });

            return { messageId: info.messageId };
        } catch (error: any) {
            throw new Error(`Failed to send email via SMTP: ${error.message}`);
        }
    }
}

