import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_SNMP_POLL, QUEUE_COBRANCA, QUEUE_NOTIFICACOES } from './jobs.constants';

@Injectable()
export class JobsScheduler implements OnModuleInit {
  private readonly logger = new Logger(JobsScheduler.name);

  constructor(
    @InjectQueue(QUEUE_SNMP_POLL) private readonly snmpQueue: Queue,
    @InjectQueue(QUEUE_COBRANCA) private readonly cobrancaQueue: Queue,
    @InjectQueue(QUEUE_NOTIFICACOES) private readonly notifQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.registrarSnmpPoll();
    await this.registrarCobrancaDiaria();
    await this.registrarNotificacoes();
  }

  private async registrarSnmpPoll() {
    const jobs = await this.snmpQueue.getRepeatableJobs();
    for (const j of jobs) await this.snmpQueue.removeRepeatableByKey(j.key);

    await this.snmpQueue.add(
      'poll',
      {},
      {
        repeat: { every: 5 * 60 * 1000 },
        removeOnComplete: 10,
        removeOnFail: 20,
      },
    );
    this.logger.log('SNMP poll agendado: a cada 5 minutos');
  }

  private async registrarCobrancaDiaria() {
    const jobs = await this.cobrancaQueue.getRepeatableJobs();
    for (const j of jobs) await this.cobrancaQueue.removeRepeatableByKey(j.key);

    await this.cobrancaQueue.add(
      'diaria',
      {},
      {
        repeat: { pattern: '0 8 * * *' },
        removeOnComplete: 5,
        removeOnFail: 10,
      },
    );
    this.logger.log('Régua de cobrança agendada: 08:00 diário');
  }

  private async registrarNotificacoes() {
    const jobs = await this.notifQueue.getRepeatableJobs();
    for (const j of jobs) await this.notifQueue.removeRepeatableByKey(j.key);

    await this.notifQueue.add(
      'processar-pendentes',
      {},
      {
        repeat: { every: 60 * 1000 }, // a cada 1 minuto
        removeOnComplete: 5,
        removeOnFail: 10,
      },
    );
    this.logger.log('Processamento de notificações agendado: a cada 1 minuto');
  }
}
