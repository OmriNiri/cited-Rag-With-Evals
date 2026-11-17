import { Module } from '@nestjs/common';
import { AnsweringModule } from './answering/answering.module.js';
import { HealthController } from './health/health.controller.js';
import { AppConfigModule } from './infrastructure/config/app-config.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';

// Root module of the HTTP API: every feature module is registered here as it is built.
@Module({
  imports: [AppConfigModule, DatabaseModule, AnsweringModule],
  controllers: [HealthController],
})
export class AppModule {}
