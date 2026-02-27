import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { User } from '../src/modules/user/user.entity';
import { Role } from '@shared/enums/role.enum';
import { JwtPayload } from '@shared/types/jwt-payload.interface';

async function bootstrap() {
    console.log('Bootstrapping App to create Mock User...');
    const app = await NestFactory.createApplicationContext(AppModule);

    const userRepo = app.get<Repository<User>>('UserRepository');

    const payload: JwtPayload = {
        userId: 'b0000000-0000-0000-0000-000000000000',
        tenantId: 'cabe0033-9fbd-440b-bcf2-848b767dfeb0', // Matches VALIDATION_TENANT
        role: Role.TENANT_OWNER,
    };

    let user = await userRepo.findOne({ where: { id: payload.userId } });
    if (!user) {
        user = userRepo.create({
            id: payload.userId,
            tenantId: payload.tenantId,
            email: 'test@example.com',
            passwordHash: 'fake-hash',
            role: Role.TENANT_OWNER,
            isActive: true,
        });
        await userRepo.save(user);
        console.log('Created Mock User in DB!');
    } else {
        console.log('User already exists in DB');
    }

    const token = Buffer.from(JSON.stringify(payload)).toString('base64');

    console.log('\n=======================================');
    console.log('Use this string as your Bearer Token in Postman:');
    console.log('=======================================\n');
    console.log(token);
    console.log('\n');

    await app.close();
    process.exit(0);
}

bootstrap();
