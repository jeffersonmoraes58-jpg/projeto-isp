import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePlanoDto } from './dto/create-plano.dto';
import { UpdatePlanoDto } from './dto/update-plano.dto';

@Injectable()
export class PlanosService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePlanoDto) {
    return this.prisma.plano.create({ data: dto });
  }

  findAll() {
    return this.prisma.plano.findMany({
      orderBy: { valor: 'asc' },
      include: { _count: { select: { clientes: true } } },
    });
  }

  async findOne(id: string) {
    const plano = await this.prisma.plano.findUnique({
      where: { id },
      include: { _count: { select: { clientes: true } } },
    });
    if (!plano) throw new NotFoundException('Plano não encontrado');
    return plano;
  }

  update(id: string, dto: UpdatePlanoDto) {
    return this.prisma.plano.update({ where: { id }, data: dto });
  }

  async toggleAtivo(id: string) {
    const plano = await this.findOne(id);
    return this.prisma.plano.update({ where: { id }, data: { ativo: !plano.ativo } });
  }
}
