import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtPayload } from '@shared/types/jwt-payload.interface';

@Injectable()
export class MockAuthMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            try {
                // Very basic mock decoding (assumes Base64 JSON)
                // In reality, this should use JwtService to verify a real signed token.
                const payloadStr = Buffer.from(token, 'base64').toString('utf-8');
                const payload = JSON.parse(payloadStr) as JwtPayload;
                (req as any).user = payload;
            } catch (e) {
                // Ignore invalid fake tokens
            }
        }
        next();
    }
}
