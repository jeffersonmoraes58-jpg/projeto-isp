import { Module } from '@nestjs/common';
import { NotificacoesService } from './notificacoes.service';
import { NotificacoesController } from './notificacoes.controller';
import { EmailService } from './channels/email.service';
import { WhatsappService } from './channels/whatsapp.service';

@Module({
  controllers: [NotificacoesController],
  providers: [NotificacoesService, EmailService, WhatsappService],
  exports: [NotificacoesService],
})
export class NotificacoesModule {}
