import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { StatusPorta } from '@prisma/client';

@Injectable()
export class ClientesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClienteDto) {
    const { ctoPortaId, ...data } = dto as CreateClienteDto & { ctoPortaId?: string };

    const cliente = await this.prisma.cliente.create({ data });

    if (ctoPortaId) {
      await this.prisma.ctoPorta.update({
        where: { id: ctoPortaId },
        data: { clienteId: cliente.id, status: StatusPorta.OCUPADA },
      });
    }

    return cliente;
  }

  findAll(filtros?: { status?: string; inadimplente?: boolean }) {
    return this.prisma.cliente.findMany({
      where: {
        ...(filtros?.status && { statusPppoe: filtros.status as any }),
        ...(filtros?.inadimplente && { statusFinanceiro: 'INADIMPLENTE' }),
      },
      include: {
        plano: { select: { nome: true, velocidadeDn: true, velocidadeUp: true, valor: true } },
        ctoPorta: { include: { cto: { select: { nome: true } } } },
      },
      orderBy: { nome: 'asc' },
    });
  }

  async findOne(id: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: {
        plano: true,
        ctoPorta: { include: { cto: true } },
        faturas: { orderBy: { vencimento: 'desc' }, take: 12 },
      },
    });
    if (!cliente) throw new NotFoundException('Cliente não encontrado');
    return cliente;
  }

  update(id: string, dto: UpdateClienteDto) {
    return this.prisma.cliente.update({ where: { id }, data: dto as any });
  }

  async bloquearPppoe(id: string) {
    return this.prisma.cliente.update({
      where: { id },
      data: { statusPppoe: 'BLOQUEADO', statusFinanceiro: 'INADIMPLENTE' },
    });
  }

  async desbloquearPppoe(id: string) {
    return this.prisma.cliente.update({
      where: { id },
      data: { statusPppoe: 'ATIVO', statusFinanceiro: 'EM_DIA' },
    });
  }

  // Atualiza status ONU em lote (chamado pelo job SNMP)
  async syncOnuStatus(updates: { serialOnu: string; sinalDbm: number | null; online: boolean }[]) {
    const ops = updates.map((u) =>
      this.prisma.cliente.updateMany({
        where: { serialOnu: u.serialOnu },
        data: {
          sinalOnu: u.sinalDbm,
          statusOnu: u.online ? 'ONLINE' : 'OFFLINE',
        },
      }),
    );
    return this.prisma.$transaction(ops);
  }
}
