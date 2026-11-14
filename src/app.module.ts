import { Module } from '@nestjs/common';

// Root module: every feature module (database, ingestion, retrieval, ...) is
// registered here as it is built. Empty for now.
@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule {}
