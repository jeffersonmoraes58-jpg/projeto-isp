import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SnmpModule } from '../modules/snmp/snmp.module';
import { ClientesModule } from '../modules/clientes/clientes.module';
import { FinanceiroModule } from '../modules/financeiro/financeiro.module';
import { AlarmesModule } from '../modules/alarmes/alarmes.module';
import { NotificacoesModule } from '../modules/notificacoes/notificacoes.module';
import { SnmpPollProcessor } from './processors/snmp-poll.processor';
import { CobrancaProcessor } from './processors/cobranca.processor';
import { NotificacoesProcessor } from './processors/notificacoes.processor';
import { JobsScheduler } from './jobs.scheduler';
import { JobsController } from './jobs.controller';
import { QUEUE_SNMP_POLL, QUEUE_COBRANCA, QUEUE_NOTIFICACOES } from './jobs.constants';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_SNMP_POLL },
      { name: QUEUE_COBRANCA },
      { name: QUEUE_NOTIFICACOES },
    ),
    SnmpModule,
    ClientesModule,
    FinanceiroModule,
    AlarmesModule,
    NotificacoesModule,
  ],
  controllers: [JobsController],
  providers: [SnmpPollProcessor, CobrancaProcessor, NotificacoesProcessor, JobsScheduler],
})
export class JobsModule {}
