import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';
import { SnmpService } from '../../modules/snmp/snmp.service';
import { ClientesService } from '../../modules/clientes/clientes.service';
import { AlarmesService } from '../../modules/alarmes/alarmes.service';
import { QUEUE_SNMP_POLL } from '../jobs.constants';

@Processor(QUEUE_SNMP_POLL)
export class SnmpPollProcessor extends WorkerHost {
  private readonly logger = new Logger(SnmpPollProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly snmp: SnmpService,
    private readonly clientes: ClientesService,
    private readonly alarmes: AlarmesService,
  ) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const olts = await this.prisma.olt.findMany({ where: { ativo: true } });
    this.logger.log(`SNMP poll iniciado — ${olts.length} OLT(s)`);

    for (const olt of olts) {
      try {
        const target = {
          ip: olt.ip,
          community: olt.comunidadeSnmp,
          version: olt.versaoSnmp as '1' | '2c',
        };

        const sinais = await this.snmp.getAllOnuSignals(target, olt.marca);
        const offlineIdxs = await this.snmp.getOfflineOnus(target);
        const offlineSet = new Set(offlineIdxs);

        const updates = sinais.map((s) => {
          // Extrai serial/índice do OID (último segmento)
          const parts = s.oid.split('.');
          const idx = parts[parts.length - 1];
          return {
            serialOnu: idx,
            sinalDbm: s.rxPowerDbm,
            online: !offlineSet.has(idx),
          };
        });

        await this.clientes.syncOnuStatus(updates);

        // Verifica corte de cabo por CTO
        const ctos = await this.prisma.cto.findMany({
          where: { oltId: olt.id },
          include: {
            portas: {
              where: { status: 'OCUPADA' },
              include: { cliente: { select: { statusOnu: true } } },
            },
          },
        });

        for (const cto of ctos) {
          const total = cto.portas.length;
          if (total < 2) continue;

          const offline = cto.portas.filter((p) => p.cliente?.statusOnu === 'OFFLINE').length;
          const pct = (offline / total) * 100;

          if (pct >= 50) {
            const jaExiste = await this.prisma.alarme.findFirst({
              where: { tipo: 'CORTE_CABO', ctoId: cto.id, resolvido: false },
            });
            if (!jaExiste) {
              await this.alarmes.criarAlarme(
                'CORTE_CABO',
                `${offline}/${total} ONUs offline na CTO ${cto.nome} (${pct.toFixed(0)}%) — possível corte de cabo`,
                { ctoId: cto.id, oltId: olt.id },
              );
              this.logger.warn(`Alarme CORTE_CABO criado: CTO ${cto.nome}`);
            }
          }
        }

        this.logger.log(`OLT ${olt.nome}: ${sinais.length} ONUs processadas`);
      } catch (err) {
        this.logger.error(`Erro ao fazer SNMP poll na OLT ${olt.nome} (${olt.ip}): ${err.message}`);
      }
    }
  }
}
