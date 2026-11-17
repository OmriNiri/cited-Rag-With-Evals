import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { LLM_CLIENT, type LlmClient } from '../../answering/llm-client.js';
import { validateEnv } from '../config/env.validation.js';
import { LlmModule } from './llm.module.js';

// Wiring test: a real .env FILE -> our validateEnv -> LlmModule. Guards against a
// bug found in Phase 3: @nestjs/config keeps only the keys `validate` returns, so
// LLM_* settings in .env were silently dropped before LlmModule could read them.
describe('LlmModule with settings from a .env file', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'llm-env-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('reads LLM_MODEL and LLM_BASE_URL from the file', async () => {
    const envFile = join(dir, '.env');
    writeFileSync(
      envFile,
      [
        'DATABASE_URL=postgres://u:p@localhost:5432/db',
        'LLM_BASE_URL=http://localhost:11434/v1',
        'LLM_MODEL=model-from-env-file',
      ].join('\n'),
    );

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: envFile,
          validate: validateEnv,
        }),
        LlmModule,
      ],
    }).compile();

    expect(moduleRef.get<LlmClient>(LLM_CLIENT).model).toBe(
      'model-from-env-file',
    );
    await moduleRef.close();
  });
});
