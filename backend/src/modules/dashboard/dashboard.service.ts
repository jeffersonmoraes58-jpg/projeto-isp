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

  async getFaturamentoMensal(): Promise<{ mes: string; label: string; total: number }[]> {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1);

    const faturas = await this.prisma.fatura.findMany({
      where: { status: 'PAGA', dataPagamento: { gte: inicio } },
      select: { dataPagamento: true, valorPago: true, valor: true },
    });

    const meses: Record<string, number> = {};
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      meses[key] = 0;
    }

    for (const f of faturas) {
      if (!f.dataPagamento) continue;
      const d = new Date(f.dataPagamento);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in meses) meses[key] += Number(f.valorPago ?? f.valor);
    }

    return Object.entries(meses).map(([mes, total]) => ({
      mes,
      label: mesesNomes[parseInt(mes.split('-')[1], 10) - 1],
      total: Math.round(total * 100) / 100,
    }));
  }
}
