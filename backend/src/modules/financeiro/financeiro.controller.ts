import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { FinanceiroService } from './financeiro.service';

@Controller('financeiro')
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @Get('faturas')
  listarFaturas(@Query('status') status?: string) {
    return this.financeiroService.listarFaturas(status);
  }

  @Post('faturas')
  gerarFatura(@Body() body: { clienteId: string; valor: number; vencimento: string }) {
    return this.financeiroService.gerarFatura(
      body.clienteId,
      body.valor,
      new Date(body.vencimento),
    );
  }

  @Post('webhook/pix')
  webhookPix(@Body() payload: { pix: { txid: string; valor: string; horario: string }[] }) {
    return this.financeiroService.processarWebhookPix(payload);
  }

  @Post('regua-cobranca')
  executarReguaCobranca() {
    return this.financeiroService.executarReguaCobranca();
  }
}
