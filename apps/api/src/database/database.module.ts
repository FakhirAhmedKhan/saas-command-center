import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseHealthService } from './database-health.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [PrismaService, DatabaseHealthService],
  exports: [PrismaService, DatabaseHealthService],
})
export class DatabaseModule {}
