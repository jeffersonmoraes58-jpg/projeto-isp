import { Controller, Post, Body, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { FinanceiroService } from './financeiro.service';

@Controller('financeiro')
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @Get('faturas/exportar')
  async exportar(@Query('status') status: string | undefined, @Res() res: Response) {
    const csv = await this.financeiroService.exportarCsv(status);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="faturas.csv"');
    res.send('﻿' + csv);
  }

  @Get('faturas')
  listarFaturas(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.financeiroService.listarFaturas({
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
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
