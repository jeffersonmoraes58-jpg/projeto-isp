import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  private isConfigured() {
    return !!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY && process.env.EVOLUTION_INSTANCE);
  }

  async enviar(numero: string, mensagem: string): Promise<boolean> {
    if (!this.isConfigured()) {
      this.logger.warn('Evolution API não configurada — WhatsApp não enviado');
      return false;
    }

    // Normaliza número: remove caracteres não numéricos e garante DDI 55
    const numeroLimpo = numero.replace(/\D/g, '');
    const numeroFinal = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;

    try {
      await axios.post(
        `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`,
        { number: numeroFinal, text: mensagem },
        {
          headers: {
            apikey: process.env.EVOLUTION_API_KEY,
            'Content-Type': 'application/json',
          },
        },
      );
      return true;
    } catch (err) {
      this.logger.error(`Erro ao enviar WhatsApp para ${numeroFinal}: ${err.message}`);
      return false;
    }
  }
}
