import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller.js';
import { validateEnv } from './infrastructure/config/env.validation.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';

// Root module: every feature module is registered here as it is built.
@Module({
  imports: [
    // Reads .env into process.env, then runs validateEnv once at startup.
    // isGlobal: any module can inject ConfigService without importing ConfigModule.
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
