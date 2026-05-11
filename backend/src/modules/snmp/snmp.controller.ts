import { Controller, Get, Param, Query } from '@nestjs/common';
import { SnmpService } from './snmp.service';
import { PrismaService } from '../../database/prisma.service';

@Controller('snmp')
export class SnmpController {
  constructor(
    private readonly snmpService: SnmpService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('olt/:oltId/sinais')
  async getSinaisOlt(@Param('oltId') oltId: string) {
    const olt = await this.prisma.olt.findUniqueOrThrow({ where: { id: oltId } });
    return this.snmpService.getAllOnuSignals(
      { ip: olt.ip, community: olt.comunidadeSnmp, version: olt.versaoSnmp as '2c' },
      olt.marca,
    );
  }

  @Get('olt/:oltId/descr')
  async getSysDescr(@Param('oltId') oltId: string) {
    const olt = await this.prisma.olt.findUniqueOrThrow({ where: { id: oltId } });
    const descr = await this.snmpService.getSysDescr({
      ip: olt.ip,
      community: olt.comunidadeSnmp,
    });
    return { descr };
  }

  @Get('olt/:oltId/offline')
  async getOfflineOnus(@Param('oltId') oltId: string) {
    const olt = await this.prisma.olt.findUniqueOrThrow({ where: { id: oltId } });
    const offline = await this.snmpService.getOfflineOnus({
      ip: olt.ip,
      community: olt.comunidadeSnmp,
    });
    return { total: offline.length, indices: offline };
  }
}
