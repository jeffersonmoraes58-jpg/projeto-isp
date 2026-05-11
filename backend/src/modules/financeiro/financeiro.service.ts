import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ClientesService } from '../clientes/clientes.service';
import axios from 'axios';

@Injectable()
export class FinanceiroService {
  private readonly logger = new Logger(FinanceiroService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clientesService: ClientesService,
  ) {}

  // ─── Gerar Fatura com Pix Dinâmico ───────────────────────────────────────

  async gerarFatura(clienteId: string, valor: number, vencimento: Date) {
    const cliente = await this.clientesService.findOne(clienteId);

    const fatura = await this.prisma.fatura.create({
      data: { clienteId, valor, vencimento },
    });

    // Integração EFI Bank (Gerencianet) — Pix dinâmico
    try {
      const pix = await this.criarPixEfi(fatura.id, valor, vencimento, cliente.nome, cliente.cpfCnpj);
      return this.prisma.fatura.update({
        where: { id: fatura.id },
        data: { pixQrCode: pix.qrCode, pixTxId: pix.txid },
      });
    } catch (err) {
      this.logger.error(`Erro ao gerar Pix para fatura ${fatura.id}: ${err.message}`);
      return fatura;
    }
  }

  // ─── Webhook de baixa automática ─────────────────────────────────────────

  async processarWebhookPix(payload: { pix: { txid: string; valor: string; horario: string }[] }) {
    const resultados: string[] = [];

    for (const pix of payload.pix) {
      const fatura = await this.prisma.fatura.findUnique({ where: { pixTxId: pix.txid } });
      if (!fatura) continue;

      await this.prisma.fatura.update({
        where: { id: fatura.id },
        data: {
          status: 'PAGA',
          dataPagamento: new Date(pix.horario),
          valorPago: parseFloat(pix.valor),
        },
      });

      // Desbloquear cliente se estava inadimplente
      const cliente = await this.prisma.cliente.findUnique({ where: { id: fatura.clienteId } });
      if (cliente?.statusFinanceiro === 'INADIMPLENTE') {
        await this.clientesService.desbloquearPppoe(fatura.clienteId);
      }

      resultados.push(fatura.id);
    }

    return { faturasBaixadas: resultados };
  }

  // ─── Régua de Cobrança ───────────────────────────────────────────────────

  async executarReguaCobranca() {
    const hoje = new Date();
    const em5dias = new Date(hoje.getTime() + 5 * 86_400_000);

    // Aviso 5 dias antes
    const vencendoEm5 = await this.prisma.fatura.findMany({
      where: {
        status: 'PENDENTE',
        vencimento: {
          gte: hoje,
          lte: em5dias,
        },
      },
      include: { cliente: true },
    });

    for (const f of vencendoEm5) {
      await this.prisma.notificacao.create({
        data: {
          clienteId: f.clienteId,
          tipo: 'AVISO_VENCIMENTO',
          canal: 'WHATSAPP',
          mensagem: `Olá ${f.cliente.nome}, sua fatura de R$ ${f.valor} vence em ${f.vencimento.toLocaleDateString('pt-BR')}. Pague via Pix!`,
        },
      });
    }

    // Bloquear vencidos há +1 dia
    const vencidos = await this.prisma.fatura.findMany({
      where: {
        status: 'PENDENTE',
        vencimento: { lt: hoje },
      },
      include: { cliente: true },
    });

    const bloqueados: string[] = [];
    for (const f of vencidos) {
      if (f.cliente.statusPppoe !== 'BLOQUEADO') {
        await this.clientesService.bloquearPppoe(f.clienteId);
        await this.prisma.fatura.update({ where: { id: f.id }, data: { status: 'VENCIDA' } });
        bloqueados.push(f.clienteId);
      }
    }

    return {
      avisos: vencendoEm5.length,
      bloqueados: bloqueados.length,
    };
  }

  // ─── Listar Faturas ──────────────────────────────────────────────────────

  async listarFaturas(status?: string) {
    return this.prisma.fatura.findMany({
      where: status ? { status: status as any } : undefined,
      include: { cliente: { select: { nome: true, cpfCnpj: true } } },
      orderBy: { vencimento: 'desc' },
    });
  }

  // ─── Integração EFI Bank ─────────────────────────────────────────────────

  private async criarPixEfi(
    faturaId: string,
    valor: number,
    vencimento: Date,
    nomeDevedor: string,
    cpfDevedor: string,
  ): Promise<{ txid: string; qrCode: string }> {
    const token = await this.getEfiToken();
    const txid = faturaId.replace(/-/g, '').substring(0, 35);

    const baseUrl = process.env.EFI_SANDBOX === 'true'
      ? 'https://pix-h.api.efipay.com.br'
      : 'https://pix.api.efipay.com.br';

    const response = await axios.put(
      `${baseUrl}/v2/cobv/${txid}`,
      {
        calendario: { dataDeVencimento: vencimento.toISOString().split('T')[0], validadeAposVencimento: 30 },
        devedor: { cpf: cpfDevedor.replace(/\D/g, ''), nome: nomeDevedor },
        valor: { original: valor.toFixed(2) },
        chave: process.env.EFI_PIX_KEY ?? 'sua-chave-pix@email.com',
        infoAdicionais: [{ nome: 'Fatura', valor: faturaId }],
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
    );

    const qrResponse = await axios.get(`${baseUrl}/v2/cobv/${txid}/qrcode`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return { txid, qrCode: qrResponse.data.imagemQrcode };
  }

  private async getEfiToken(): Promise<string> {
    const credentials = Buffer.from(
      `${process.env.EFI_CLIENT_ID}:${process.env.EFI_CLIENT_SECRET}`,
    ).toString('base64');

    const baseUrl = process.env.EFI_SANDBOX === 'true'
      ? 'https://pix-h.api.efipay.com.br'
      : 'https://pix.api.efipay.com.br';

    const { data } = await axios.post(
      `${baseUrl}/oauth/token`,
      { grant_type: 'client_credentials' },
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      },
    );
    return data.access_token;
  }
}
