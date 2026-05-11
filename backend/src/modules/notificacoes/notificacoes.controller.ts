import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { NotificacoesService } from './notificacoes.service';
import { TipoNotificacao } from '@prisma/client';

@Controller('notificacoes')
export class NotificacoesController {
  constructor(private readonly notificacoesService: NotificacoesService) {}

  @Get()
  listar(
    @Query('clienteId') clienteId?: string,
    @Query('enviado') enviado?: string,
    @Query('tipo') tipo?: TipoNotificacao,
  ) {
    return this.notificacoesService.listar({
      clienteId,
      enviado: enviado !== undefined ? enviado === 'true' : undefined,
      tipo,
    });
  }

  @Post(':id/reenviar')
  reenviar(@Param('id') id: string) {
    return this.notificacoesService.reenviar(id);
  }

  @Post('processar')
  processarPendentes() {
    return this.notificacoesService.processarPendentes();
  }
}
