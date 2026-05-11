import { Controller, Post } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Roles } from '../auth/decorators/roles.decorator';
import { QUEUE_SNMP_POLL, QUEUE_COBRANCA, QUEUE_NOTIFICACOES } from './jobs.constants';

@Controller('jobs')
export class JobsController {
  constructor(
    @InjectQueue(QUEUE_SNMP_POLL) private readonly snmpQueue: Queue,
    @InjectQueue(QUEUE_COBRANCA) private readonly cobrancaQueue: Queue,
    @InjectQueue(QUEUE_NOTIFICACOES) private readonly notifQueue: Queue,
  ) {}

  @Roles('ADMIN')
  @Post('snmp-poll/trigger')
  triggerSnmp() {
    return this.snmpQueue.add('poll-manual', {}, { removeOnComplete: true });
  }

  @Roles('ADMIN')
  @Post('cobranca/trigger')
  triggerCobranca() {
    return this.cobrancaQueue.add('diaria-manual', {}, { removeOnComplete: true });
  }

  @Roles('ADMIN')
  @Post('notificacoes/trigger')
  triggerNotificacoes() {
    return this.notifQueue.add('processar-manual', {}, { removeOnComplete: true });
  }
}
