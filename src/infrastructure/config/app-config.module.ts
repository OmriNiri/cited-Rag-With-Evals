import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './env.validation.js';

// Shared by the HTTP app (AppModule) and the CLI commands, so both load and
// validate the environment the same way.
// Reads .env into process.env, then runs validateEnv once at startup.
// isGlobal: any module can inject ConfigService without importing ConfigModule.
export const AppConfigModule = ConfigModule.forRoot({
  isGlobal: true,
  validate: validateEnv,
});
