import { Module } from '@nestjs/common';
import { CtosService } from './ctos.service';
import { CtosController } from './ctos.controller';

@Module({
  controllers: [CtosController],
  providers: [CtosService],
  exports: [CtosService],
})
export class CtosModule {}
