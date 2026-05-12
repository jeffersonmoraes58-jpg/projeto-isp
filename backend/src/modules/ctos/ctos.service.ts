import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCtoDto } from './dto/create-cto.dto';

@Injectable()
export class CtosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCtoDto) {
    const cto = await this.prisma.cto.create({ data: dto });
    // Gera portas automaticamente conforme capacidade
    const portas = Array.from({ length: dto.capacidade }, (_, i) => ({
      ctoId: cto.id,
      numero: i + 1,
    }));
    await this.prisma.ctoPorta.createMany({ data: portas });
    return this.findOne(cto.id);
  }

  findAll() {
    return this.prisma.cto.findMany({
      include: {
        portas: { include: { cliente: { select: { id: true, nome: true, statusOnu: true } } } },
        olt: { select: { nome: true, ip: true } },
        ponPort: true,
      },
    });
  }

  async findOne(id: string) {
    const cto = await this.prisma.cto.findUnique({
      where: { id },
      include: {
        portas: {
          orderBy: { numero: 'asc' },
          include: {
            cliente: { select: { id: true, nome: true, statusOnu: true, sinalOnu: true } },
            contrato: { select: { id: true, usuarioPppoe: true, apelido: true, statusOnu: true, sinalOnu: true, cliente: { select: { nome: true } } } },
          },
        },
        olt: true,
        ponPort: true,
      },
    });
    if (!cto) throw new NotFoundException('CTO não encontrada');
    return cto;
  }

  // Diagnóstico IA: detecta corte de cabo
  async diagnosticarCorteCabo(id: string) {
    const cto = await this.findOne(id);
    const portasOcupadas = cto.portas.filter((p) => p.status === 'OCUPADA');
    const portasOffline = portasOcupadas.filter(
      (p) => p.cliente?.statusOnu === 'OFFLINE',
    );

    const total = portasOcupadas.length;
    const offline = portasOffline.length;
    const percentOffline = total > 0 ? (offline / total) * 100 : 0;
    const corteCabo = percentOffline >= 50;

    return {
      ctoId: id,
      ctoNome: cto.nome,
      totalClientes: total,
      clientesOffline: offline,
      percentOffline: percentOffline.toFixed(1),
      alerta: corteCabo ? 'CORTE_CABO' : null,
      mensagem: corteCabo
        ? `Atenção: ${offline}/${total} clientes offline — possível corte de cabo!`
        : 'Operação normal',
    };
  }

  update(id: string, dto: Partial<CreateCtoDto>) {
    return this.prisma.cto.update({ where: { id }, data: dto as any });
  }

  async associar(portaId: string, clienteId?: string, contratoId?: string) {
    const porta = await this.prisma.ctoPorta.findUnique({ where: { id: portaId } });
    if (!porta) throw new NotFoundException('Porta não encontrada');

    if (clienteId) {
      await this.prisma.ctoPorta.updateMany({ where: { clienteId }, data: { clienteId: null, status: 'LIVRE' } });
    }
    if (contratoId) {
      await this.prisma.ctoPorta.updateMany({ where: { contratoId }, data: { contratoId: null, status: 'LIVRE' } });
    }

    return this.prisma.ctoPorta.update({
      where: { id: portaId },
      data: { clienteId: clienteId ?? null, contratoId: contratoId ?? null, status: 'OCUPADA' },
      include: {
        cliente: { select: { id: true, nome: true, statusOnu: true, sinalOnu: true } },
        contrato: { select: { id: true, usuarioPppoe: true, apelido: true, statusOnu: true, sinalOnu: true, cliente: { select: { nome: true } } } },
      },
    });
  }

  async liberarPorta(portaId: string) {
    const porta = await this.prisma.ctoPorta.findUnique({ where: { id: portaId } });
    if (!porta) throw new NotFoundException('Porta não encontrada');

    return this.prisma.ctoPorta.update({
      where: { id: portaId },
      data: { clienteId: null, contratoId: null, status: 'LIVRE' },
    });
  }

  // Atualiza sinal de uma porta específica
  atualizarSinalPorta(portaId: string, sinalDbm: number) {
    return this.prisma.ctoPorta.update({
      where: { id: portaId },
      data: { sinalDbm },
    });
  }

  // Summary para o mapa (lat/lng + ocupação + alertas)
  async getMapSummary() {
    const ctos = await this.prisma.cto.findMany({
      include: {
        portas: { select: { status: true, sinalDbm: true } },
      },
    });

    return ctos.map((cto) => {
      const total = cto.portas.length;
      const ocupadas = cto.portas.filter((p) => p.status === 'OCUPADA').length;
      const livres = cto.portas.filter((p) => p.status === 'LIVRE').length;
      const sinais = cto.portas
        .map((p) => (p.sinalDbm ? Number(p.sinalDbm) : null))
        .filter((s): s is number => s !== null);
      const sinalMedio = sinais.length
        ? sinais.reduce((a, b) => a + b, 0) / sinais.length
        : null;

      return {
        id: cto.id,
        nome: cto.nome,
        lat: Number(cto.latitude),
        lng: Number(cto.longitude),
        capacidade: total,
        ocupadas,
        livres,
        ocupacaoPct: total > 0 ? Math.round((ocupadas / total) * 100) : 0,
        sinalMedioDbm: sinalMedio ? sinalMedio.toFixed(2) : null,
      };
    });
  }
}
