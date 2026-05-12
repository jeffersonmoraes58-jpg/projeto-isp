import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateContratoDto, UpdateContratoDto } from './dto/create-contrato.dto';

const include = {
  plano: { select: { nome: true, velocidadeDn: true, velocidadeUp: true, valor: true } },
  ctoPorta: { include: { cto: { select: { nome: true } } } },
};

@Injectable()
export class ContratosService {
  constructor(private readonly prisma: PrismaService) {}

  findByCliente(clienteId: string) {
    return this.prisma.contrato.findMany({
      where: { clienteId },
      include,
      orderBy: { createdAt: 'asc' },
    });
  }

  create(dto: CreateContratoDto) {
    return this.prisma.contrato.create({ data: dto as any, include });
  }

  async update(id: string, dto: UpdateContratoDto) {
    await this.findOne(id);
    return this.prisma.contrato.update({ where: { id }, data: dto as any, include });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.contrato.delete({ where: { id } });
  }

  async bloquear(id: string) {
    await this.findOne(id);
    return this.prisma.contrato.update({ where: { id }, data: { statusPppoe: 'BLOQUEADO' } });
  }

  async desbloquear(id: string) {
    await this.findOne(id);
    return this.prisma.contrato.update({ where: { id }, data: { statusPppoe: 'ATIVO' } });
  }

  private async findOne(id: string) {
    const c = await this.prisma.contrato.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Contrato não encontrado');
    return c;
  }
}
