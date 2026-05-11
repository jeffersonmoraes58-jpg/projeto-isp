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

  async findAll(filtros?: { status?: string; inadimplente?: boolean; page?: number; limit?: number }) {
    const page = filtros?.page ?? 1;
    const limit = filtros?.limit ?? 20;
    const where: any = {
      ...(filtros?.status && { statusPppoe: filtros.status }),
      ...(filtros?.inadimplente && { statusFinanceiro: 'INADIMPLENTE' }),
    };

    const [data, total] = await Promise.all([
      this.prisma.cliente.findMany({
        where,
        include: {
          plano: { select: { nome: true, velocidadeDn: true, velocidadeUp: true, valor: true } },
          ctoPorta: { include: { cto: { select: { nome: true } } } },
        },
        orderBy: { nome: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.cliente.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async exportarCsv(filtros?: { status?: string; inadimplente?: boolean }): Promise<string> {
    const where: any = {
      ...(filtros?.status && { statusPppoe: filtros.status }),
      ...(filtros?.inadimplente && { statusFinanceiro: 'INADIMPLENTE' }),
    };
    const clientes = await this.prisma.cliente.findMany({
      where,
      include: { plano: { select: { nome: true } } },
      orderBy: { nome: 'asc' },
    }) as any[];

    const header = 'Nome,CPF/CNPJ,E-mail,Celular,PPPoE,Status,ONU,Sinal (dBm),Plano,Status Financeiro';
    const rows = clientes.map((c: any) =>
      [
        `"${c.nome}"`, c.cpfCnpj, c.email ?? '', c.celular ?? '',
        c.usuarioPppoe, c.statusPppoe, c.statusOnu,
        c.sinalOnu ?? '', `"${c.plano?.nome ?? ''}"`, c.statusFinanceiro,
      ].join(','),
    );
    return [header, ...rows].join('\n');
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
