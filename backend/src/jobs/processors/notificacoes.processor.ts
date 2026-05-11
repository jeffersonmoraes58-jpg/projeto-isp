import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificacoesService } from '../../modules/notificacoes/notificacoes.service';
import { QUEUE_NOTIFICACOES } from '../jobs.constants';

@Processor(QUEUE_NOTIFICACOES)
export class NotificacoesProcessor extends WorkerHost {
  constructor(private readonly notificacoes: NotificacoesService) {
    super();
  }

  async process(_job: Job): Promise<void> {
    await this.notificacoes.processarPendentes();
  }
}
