import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOsDto } from './dto/create-os.dto';

const include = {
  cliente: { select: { id: true, nome: true, cpfCnpj: true, celular: true } },
  tecnico: { select: { id: true, nome: true, email: true } },
};

@Injectable()
export class OrdensServicoService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filtros?: { status?: string; tipo?: string; tecnicoId?: string; page?: number; limit?: number }) {
    const page = filtros?.page ?? 1;
    const limit = filtros?.limit ?? 20;
    const where: any = {
      ...(filtros?.status && { status: filtros.status }),
      ...(filtros?.tipo && { tipo: filtros.tipo }),
      ...(filtros?.tecnicoId && { tecnicoId: filtros.tecnicoId }),
    };

    const [data, total] = await Promise.all([
      this.prisma.ordemServico.findMany({
        where, include,
        orderBy: [{ status: 'asc' }, { prioridade: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.ordemServico.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const os = await this.prisma.ordemServico.findUnique({ where: { id }, include });
    if (!os) throw new NotFoundException('Ordem de serviço não encontrada');
    return os;
  }

  create(dto: CreateOsDto) {
    return this.prisma.ordemServico.create({
      data: {
        ...dto,
        agendadoPara: dto.agendadoPara ? new Date(dto.agendadoPara) : undefined,
      },
      include,
    });
  }

  async update(id: string, dto: Partial<CreateOsDto> & { tecnicoId?: string; observacaoTecnico?: string }) {
    await this.findOne(id);
    return this.prisma.ordemServico.update({
      where: { id },
      data: {
        ...dto,
        agendadoPara: dto.agendadoPara ? new Date(dto.agendadoPara) : undefined,
      },
      include,
    });
  }

  async iniciar(id: string) {
    const os = await this.findOne(id);
    if (os.status !== 'ABERTA') throw new BadRequestException('Somente OS abertas podem ser iniciadas');
    return this.prisma.ordemServico.update({
      where: { id },
      data: { status: 'EM_ANDAMENTO', iniciadoEm: new Date() },
      include,
    });
  }

  async concluir(id: string, observacaoTecnico?: string) {
    const os = await this.findOne(id);
    if (os.status === 'CONCLUIDA') throw new BadRequestException('OS já concluída');
    if (os.status === 'CANCELADA') throw new BadRequestException('OS cancelada não pode ser concluída');
    return this.prisma.ordemServico.update({
      where: { id },
      data: { status: 'CONCLUIDA', concluidoEm: new Date(), observacaoTecnico },
      include,
    });
  }

  async cancelar(id: string) {
    const os = await this.findOne(id);
    if (os.status === 'CONCLUIDA') throw new BadRequestException('OS concluída não pode ser cancelada');
    return this.prisma.ordemServico.update({
      where: { id },
      data: { status: 'CANCELADA' },
      include,
    });
  }

  async getStats() {
    const [abertas, emAndamento, concluidasHoje, canceladas] = await Promise.all([
      this.prisma.ordemServico.count({ where: { status: 'ABERTA' } }),
      this.prisma.ordemServico.count({ where: { status: 'EM_ANDAMENTO' } }),
      this.prisma.ordemServico.count({
        where: {
          status: 'CONCLUIDA',
          concluidoEm: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      this.prisma.ordemServico.count({ where: { status: 'CANCELADA' } }),
    ]);
    return { abertas, emAndamento, concluidasHoje, canceladas };
  }
}
