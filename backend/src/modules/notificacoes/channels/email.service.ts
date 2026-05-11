import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter() {
    if (this.transporter) return this.transporter;
    if (!process.env.SMTP_HOST) return null;

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    return this.transporter;
  }

  async enviar(destinatario: string, assunto: string, mensagem: string): Promise<boolean> {
    const transport = this.getTransporter();
    if (!transport) {
      this.logger.warn('SMTP não configurado — e-mail não enviado');
      return false;
    }

    try {
      await transport.sendMail({
        from: process.env.SMTP_FROM ?? 'ISP Manager <noreply@isp.local>',
        to: destinatario,
        subject: assunto,
        text: mensagem,
        html: `<p>${mensagem.replace(/\n/g, '<br>')}</p>`,
      });
      return true;
    } catch (err) {
      this.logger.error(`Erro ao enviar e-mail para ${destinatario}: ${err.message}`);
      return false;
    }
  }
}
