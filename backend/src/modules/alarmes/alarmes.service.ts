import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TipoAlarme } from '@prisma/client';

@Injectable()
export class AlarmesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(resolvido?: boolean) {
    return this.prisma.alarme.findMany({
      where: resolvido !== undefined ? { resolvido } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolver(id: string) {
    return this.prisma.alarme.update({
      where: { id },
      data: { resolvido: true, resolvidoEm: new Date() },
    });
  }

  async criarAlarme(tipo: TipoAlarme, descricao: string, refs?: { ctoId?: string; oltId?: string }) {
    return this.prisma.alarme.create({
      data: { tipo, descricao, ...refs },
    });
  }

  countAtivos() {
    return this.prisma.alarme.count({ where: { resolvido: false } });
  }
}
