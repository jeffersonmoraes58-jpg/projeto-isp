import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from './channels/email.service';
import { WhatsappService } from './channels/whatsapp.service';
import { TipoNotificacao, CanalNotificacao } from '@prisma/client';

const ASSUNTOS: Record<TipoNotificacao, string> = {
  AVISO_VENCIMENTO: 'Aviso de vencimento de fatura',
  BOLETO_GERADO: 'Boleto gerado',
  PAGAMENTO_CONFIRMADO: 'Pagamento confirmado',
  BLOQUEIO: 'Serviço bloqueado por inadimplência',
  CORTE_CABO: 'Instabilidade na sua conexão',
};

@Injectable()
export class NotificacoesService {
  private readonly logger = new Logger(NotificacoesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly whatsapp: WhatsappService,
  ) {}

  async processarPendentes(): Promise<{ processadas: number; enviadas: number; falhas: number }> {
    const pendentes = await this.prisma.notificacao.findMany({
      where: { enviado: false },
      include: { cliente: { select: { email: true, celular: true, telefone: true } } },
      take: 50,
      orderBy: { createdAt: 'asc' },
    });

    let enviadas = 0;
    let falhas = 0;

    for (const n of pendentes) {
      const ok = await this.despachar(n);
      await this.prisma.notificacao.update({
        where: { id: n.id },
        data: { enviado: ok, enviadoEm: ok ? new Date() : null },
      });
      ok ? enviadas++ : falhas++;
    }

    if (pendentes.length > 0) {
      this.logger.log(`Notificações processadas: ${enviadas} enviadas, ${falhas} falhas`);
    }

    return { processadas: pendentes.length, enviadas, falhas };
  }

  private async despachar(n: {
    canal: CanalNotificacao;
    tipo: TipoNotificacao;
    mensagem: string;
    cliente: { email: string | null; celular: string | null; telefone: string | null };
  }): Promise<boolean> {
    switch (n.canal) {
      case 'EMAIL': {
        const dest = n.cliente.email;
        if (!dest) { this.logger.warn('Cliente sem e-mail'); return false; }
        return this.email.enviar(dest, ASSUNTOS[n.tipo], n.mensagem);
      }
      case 'WHATSAPP': {
        const numero = n.cliente.celular ?? n.cliente.telefone;
        if (!numero) { this.logger.warn('Cliente sem celular'); return false; }
        return this.whatsapp.enviar(numero, n.mensagem);
      }
      case 'SMS': {
        this.logger.warn('Canal SMS ainda não implementado');
        return false;
      }
    }
  }

  listar(params: { clienteId?: string; enviado?: boolean; tipo?: TipoNotificacao }) {
    return this.prisma.notificacao.findMany({
      where: {
        ...(params.clienteId && { clienteId: params.clienteId }),
        ...(params.enviado !== undefined && { enviado: params.enviado }),
        ...(params.tipo && { tipo: params.tipo }),
      },
      include: { cliente: { select: { nome: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async reenviar(id: string) {
    await this.prisma.notificacao.update({
      where: { id },
      data: { enviado: false, enviadoEm: null },
    });
    return { queued: true };
  }

  async criarEEnviar(
    clienteId: string,
    tipo: TipoNotificacao,
    canal: CanalNotificacao,
    mensagem: string,
  ) {
    return this.prisma.notificacao.create({
      data: { clienteId, tipo, canal, mensagem },
    });
  }
}
