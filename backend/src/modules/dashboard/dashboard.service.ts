import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const hoje = new Date();
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const fimDia = new Date(inicioDia.getTime() + 86_400_000);

    const [
      totalClientes,
      clientesOnline,
      clientesOffline,
      inadimplentes,
      faturamentoDia,
      olts,
      alarmes,
    ] = await Promise.all([
      this.prisma.cliente.count({ where: { statusPppoe: 'ATIVO' } }),
      this.prisma.cliente.count({ where: { statusOnu: 'ONLINE' } }),
      this.prisma.cliente.count({ where: { statusOnu: 'OFFLINE', statusPppoe: 'ATIVO' } }),
      this.prisma.cliente.count({ where: { statusFinanceiro: 'INADIMPLENTE' } }),
      this.prisma.fatura.aggregate({
        _sum: { valorPago: true },
        where: {
          status: 'PAGA',
          dataPagamento: { gte: inicioDia, lt: fimDia },
        },
      }),
      this.prisma.olt.findMany({
        select: { id: true, nome: true, ip: true, ativo: true },
      }),
      this.prisma.alarme.findMany({
        where: { resolvido: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      clientes: {
        total: totalClientes,
        online: clientesOnline,
        offline: clientesOffline,
        inadimplentes,
      },
      financeiro: {
        faturamentoDia: faturamentoDia._sum.valorPago ?? 0,
      },
      olts,
      alarmes,
    };
  }
}
