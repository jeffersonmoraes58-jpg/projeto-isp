import { Module } from '@nestjs/common';
import { OltsService } from './olts.service';
import { OltsController } from './olts.controller';
import { SnmpModule } from '../snmp/snmp.module';

@Module({
  imports: [SnmpModule],
  controllers: [OltsController],
  providers: [OltsService],
  exports: [OltsService],
})
export class OltsModule {}
