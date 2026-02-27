import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@WebSocketGateway({
    cors: { origin: '*' },
})
@Injectable()
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
    @WebSocketServer()
    server: Server;

    private logger = new Logger('EventsGateway');
    private redisSubscriber: Redis;

    constructor(private jwtService: JwtService) { }

    onModuleInit() {
        this.redisSubscriber = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379', 10),
        });

        this.redisSubscriber.subscribe('tenant-events', (err) => {
            if (err) this.logger.error(`Failed to subscribe to Redis: ${err.message}`);
            else this.logger.log('Subscribed to Redis tenant-events channel');
        });

        this.redisSubscriber.on('message', (channel, message) => {
            if (channel === 'tenant-events') {
                try {
                    const parsed = JSON.parse(message);
                    if (parsed.tenantId && parsed.event && parsed.data) {
                        this.emitToTenant(parsed.tenantId, parsed.event, parsed.data);
                    }
                } catch (e) {
                    this.logger.error('Failed to parse tenant-event', e);
                }
            }
        });
    }

    onModuleDestroy() {
        this.redisSubscriber?.disconnect();
    }

    async handleConnection(socket: Socket) {
        try {
            const authHeader = socket.handshake.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new Error('Missing or invalid authorization header');
            }

            const token = authHeader.split(' ')[1];
            const payload = this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET || 'super-secret',
            });

            const tenantId = payload.tenantId;
            if (!tenantId) {
                throw new Error('Token missing tenantId');
            }

            socket.data.tenantId = tenantId;
            socket.join(`tenant_${tenantId}`);

            this.logger.log(`Client connected: ${socket.id} (Tenant: ${tenantId})`);
        } catch (error: any) {
            this.logger.warn(`Connection rejected: ${error?.message || 'Unknown error'}`);
            socket.disconnect(true);
        }
    }

    handleDisconnect(socket: Socket) {
        this.logger.log(`Client disconnected: ${socket.id}`);
    }

    emitToTenant(tenantId: string, event: string, data: any) {
        this.server.to(`tenant_${tenantId}`).emit(event, data);
    }
}
