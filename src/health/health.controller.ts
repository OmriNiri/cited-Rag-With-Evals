import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../infrastructure/database/database.module.js';

// GET /health — proves the whole chain works: HTTP -> Nest -> pool -> Postgres.
// It uses the pool directly because checking infrastructure is its only job.
@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  async check(): Promise<{ status: string; database: string }> {
    try {
      await this.pool.query('SELECT 1');
      return { status: 'ok', database: 'up' };
    } catch {
      // 503 tells monitors/CI "the service exists but cannot work right now".
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
      });
    }
  }
}
