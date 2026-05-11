import { Injectable, Logger } from '@nestjs/common';
import * as snmp from 'net-snmp';

// HUAWEI MA5800 / ZTE C300 OIDs
const OID = {
  // Huawei: sinal de recepção da ONU (RxOpticalPower) em 0.01 dBm
  HUAWEI_ONU_RX_POWER: '1.3.6.1.4.1.2011.6.128.1.1.2.51.1.4',
  // ZTE: ONU Rx power
  ZTE_ONU_RX_POWER: '1.3.6.1.4.1.3902.1012.3.28.1.1.4',
  // ONU operational state (Huawei)
  HUAWEI_ONU_OPER_STATE: '1.3.6.1.4.1.2011.6.128.1.1.2.43.1.15',
  // sysDescr
  SYS_DESCR: '1.3.6.1.2.1.1.1.0',
};

export interface OnuSignalResult {
  onu: string;
  oid: string;
  rxPowerDbm: number | null;
  operState: string | null;
  raw: number | null;
}

export interface SnmpTarget {
  ip: string;
  community: string;
  version?: '1' | '2c';
  timeout?: number;
  retries?: number;
}

@Injectable()
export class SnmpService {
  private readonly logger = new Logger(SnmpService.name);

  private createSession(target: SnmpTarget) {
    const version =
      target.version === '1'
        ? snmp.Version1
        : snmp.Version2c;

    return snmp.createSession(target.ip, target.community, {
      version,
      timeout: target.timeout ?? 5000,
      retries: target.retries ?? 1,
    });
  }

  async getSysDescr(target: SnmpTarget): Promise<string> {
    return new Promise((resolve, reject) => {
      const session = this.createSession(target);
      session.get([OID.SYS_DESCR], (error, varbinds) => {
        session.close();
        if (error) return reject(error);
        resolve(snmp.varbindType(varbinds[0]) === snmp.ObjectType.OctetString
          ? varbinds[0].value.toString()
          : 'unknown');
      });
    });
  }

  // Busca o sinal (RxPower) de todas as ONUs via GetBulk (walk na sub-árvore)
  async getAllOnuSignals(
    target: SnmpTarget,
    marca: 'HUAWEI' | 'ZTE' | string,
  ): Promise<OnuSignalResult[]> {
    const baseOid =
      marca === 'ZTE' ? OID.ZTE_ONU_RX_POWER : OID.HUAWEI_ONU_RX_POWER;

    const results: OnuSignalResult[] = [];
    const session = this.createSession(target);

    return new Promise((resolve, reject) => {
      session.subtree(
        baseOid,
        20,
        (varbinds) => {
          for (const vb of varbinds) {
            if (snmp.isVarbindError(vb)) {
              this.logger.warn(`SNMP varbind error: ${snmp.varbindError(vb)}`);
              continue;
            }
            const raw = parseInt(vb.value.toString(), 10);
            // Huawei retorna em unidades de 0.01 dBm; ZTE em 0.001 dBm
            const divisor = marca === 'ZTE' ? 1000 : 100;
            const rxPowerDbm = isNaN(raw) ? null : raw / divisor;

            results.push({
              onu: vb.oid,
              oid: vb.oid,
              rxPowerDbm,
              operState: null,
              raw,
            });
          }
        },
        (error) => {
          session.close();
          if (error) {
            this.logger.error(`SNMP walk error on ${target.ip}: ${error.message}`);
            return reject(error);
          }
          resolve(results);
        },
      );
    });
  }

  // Busca sinal de uma ONU específica via índice SNMP
  async getOnuSignalByIndex(
    target: SnmpTarget,
    marca: 'HUAWEI' | 'ZTE' | string,
    onuIndex: string,
  ): Promise<OnuSignalResult> {
    const baseOid =
      marca === 'ZTE' ? OID.ZTE_ONU_RX_POWER : OID.HUAWEI_ONU_RX_POWER;
    const fullOid = `${baseOid}.${onuIndex}`;

    return new Promise((resolve, reject) => {
      const session = this.createSession(target);
      session.get([fullOid], (error, varbinds) => {
        session.close();
        if (error) return reject(error);

        const vb = varbinds[0];
        if (snmp.isVarbindError(vb)) {
          return reject(new Error(snmp.varbindError(vb).toString()));
        }

        const raw = parseInt(vb.value.toString(), 10);
        const divisor = marca === 'ZTE' ? 1000 : 100;
        resolve({
          onu: onuIndex,
          oid: fullOid,
          rxPowerDbm: isNaN(raw) ? null : raw / divisor,
          operState: null,
          raw,
        });
      });
    });
  }

  // Verifica ONUs offline via operState (Huawei)
  async getOfflineOnus(target: SnmpTarget): Promise<string[]> {
    const session = this.createSession(target);
    const offline: string[] = [];

    return new Promise((resolve, reject) => {
      session.subtree(
        OID.HUAWEI_ONU_OPER_STATE,
        20,
        (varbinds) => {
          for (const vb of varbinds) {
            if (snmp.isVarbindError(vb)) continue;
            // 1 = online, 2 = offline (Huawei)
            if (parseInt(vb.value.toString(), 10) !== 1) {
              const idx = vb.oid.replace(`${OID.HUAWEI_ONU_OPER_STATE}.`, '');
              offline.push(idx);
            }
          }
        },
        (error) => {
          session.close();
          if (error) return reject(error);
          resolve(offline);
        },
      );
    });
  }
}
