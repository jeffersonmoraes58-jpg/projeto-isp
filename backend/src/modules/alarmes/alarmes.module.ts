import { Module } from '@nestjs/common';
import { AlarmesService } from './alarmes.service';
import { AlarmesController } from './alarmes.controller';

@Module({
  controllers: [AlarmesController],
  providers: [AlarmesService],
  exports: [AlarmesService],
})
export class AlarmesModule {}
