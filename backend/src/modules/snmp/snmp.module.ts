import { Module } from '@nestjs/common';
import { SnmpService } from './snmp.service';
import { SnmpController } from './snmp.controller';

@Module({
  controllers: [SnmpController],
  providers: [SnmpService],
  exports: [SnmpService],
})
export class SnmpModule {}
