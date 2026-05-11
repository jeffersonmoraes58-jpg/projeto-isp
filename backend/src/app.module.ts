import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from './database/database.module';
import { OltsModule } from './modules/olts/olts.module';
import { CtosModule } from './modules/ctos/ctos.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { SnmpModule } from './modules/snmp/snmp.module';
import { FinanceiroModule } from './modules/financeiro/financeiro.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { PlanosModule } from './modules/planos/planos.module';
import { AlarmesModule } from './modules/alarmes/alarmes.module';
import { AuthModule } from './auth/auth.module';
import { JobsModule } from './jobs/jobs.module';
import { NotificacoesModule } from './modules/notificacoes/notificacoes.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRoot({
      connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
    }),
    DatabaseModule,
    AuthModule,
    SnmpModule,
    OltsModule,
    CtosModule,
    ClientesModule,
    FinanceiroModule,
    DashboardModule,
    PlanosModule,
    AlarmesModule,
    NotificacoesModule,
    JobsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
