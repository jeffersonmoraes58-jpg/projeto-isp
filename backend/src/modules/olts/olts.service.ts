import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SnmpService } from '../snmp/snmp.service';
import { CreateOltDto } from './dto/create-olt.dto';
import { UpdateOltDto } from './dto/update-olt.dto';

@Injectable()
export class OltsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly snmp: SnmpService,
  ) {}

  create(dto: CreateOltDto) {
    return this.prisma.olt.create({ data: dto });
  }

  findAll() {
    return this.prisma.olt.findMany({ include: { ponPorts: true } });
  }

  async findOne(id: string) {
    const olt = await this.prisma.olt.findUnique({
      where: { id },
      include: { ponPorts: true, ctos: true },
    });
    if (!olt) throw new NotFoundException('OLT não encontrada');
    return olt;
  }

  update(id: string, dto: UpdateOltDto) {
    return this.prisma.olt.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.olt.delete({ where: { id } });
  }

  async testarConexao(id: string) {
    const olt = await this.findOne(id);
    try {
      const descr = await this.snmp.getSysDescr({
        ip: olt.ip,
        community: olt.comunidadeSnmp,
        version: olt.versaoSnmp as '2c',
      });
      return { online: true, descr };
    } catch {
      return { online: false, descr: null };
    }
  }

  async provisionarOnu(oltId: string, serial: string, ponSlot: number, ponPorta: number, onuId: number) {
    const olt = await this.findOne(oltId);
    // Comando CLI Huawei via Telnet/SSH (implementação real usa node-ssh ou telnet-client)
    // Aqui retornamos o comando gerado para log/auditoria
    const comandos = [
      `interface gpon 0/${ponSlot}`,
      `ont add ${ponPorta} sn-auth ${serial} omci ont-lineprofile-id 10 ont-srvprofile-id 10 desc "ISP-${serial}"`,
      `ont ipconfig ${ponPorta} ${onuId} dhcp`,
      `quit`,
    ];
    this.prismaLog(olt.ip, serial, comandos);
    return { oltIp: olt.ip, serial, comandos, status: 'COMANDO_GERADO' };
  }

  private prismaLog(ip: string, serial: string, cmds: string[]) {
    // Audit log — persisted via Prisma em produção
  }
}
