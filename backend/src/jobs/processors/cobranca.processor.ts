import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { FinanceiroService } from '../../modules/financeiro/financeiro.service';
import { QUEUE_COBRANCA } from '../jobs.constants';

@Processor(QUEUE_COBRANCA)
export class CobrancaProcessor extends WorkerHost {
  private readonly logger = new Logger(CobrancaProcessor.name);

  constructor(private readonly financeiro: FinanceiroService) {
    super();
  }

  async process(_job: Job): Promise<void> {
    this.logger.log('Régua de cobrança iniciada');
    const resultado = await this.financeiro.executarReguaCobranca();
    this.logger.log(
      `Régua concluída — avisos: ${resultado.avisos}, bloqueados: ${resultado.bloqueados}`,
    );
  }
}
