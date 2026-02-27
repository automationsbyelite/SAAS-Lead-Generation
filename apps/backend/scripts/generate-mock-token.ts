import { Role } from '../src/shared/enums/role.enum';
import { JwtPayload } from '../src/shared/types/jwt-payload.interface';

async function bootstrap() {
    console.log('Generating Mock JWT Token...');

    // NOTE: In a real system, you would grab this from the database or login
    // Since we already ran the validate-engine.ts script, the database has:
    // Tenant VALIDATION_TENANT and a user 'test@example.com'.

    // You will need to query your postgres DB to get the exact UUIDs to place here if you want to test existing data.
    // BUT the easiest way is to let Postman create them using SUPER_ADMIN or just spoofing the VALIDATION tenant id.

    const payload: JwtPayload = {
        userId: 'b0000000-0000-0000-0000-000000000000', // Mock Test User UUID
        tenantId: 'cabe0033-9fbd-440b-bcf2-848b767dfeb0', // From previous validate-engine run
        role: Role.SUPER_ADMIN, // Super admin bypasses some tenant checks
    };

    const token = Buffer.from(JSON.stringify(payload)).toString('base64');

    console.log('\n=======================================');
    console.log('Use this string as your Bearer Token in Postman:');
    console.log('=======================================\n');
    console.log(token);
    console.log('\n');
}

bootstrap();
