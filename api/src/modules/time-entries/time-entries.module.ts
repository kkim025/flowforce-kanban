import { Module } from '@nestjs/common';
import { TimeEntriesController } from './time-entries.controller';
import { TimeEntriesService } from './time-entries.service';
import { PrismaTimeEntryRepository } from './infrastructure/persistence/prisma-time-entry.repository';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TimeEntriesController],
  providers: [
    TimeEntriesService,
    {
      provide: 'ITimeEntriesRepository',
      useClass: PrismaTimeEntryRepository,
    },
  ],
  exports: [TimeEntriesService],
})
export class TimeEntriesModule {}
