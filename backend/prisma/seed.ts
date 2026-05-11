import 'dotenv/config';
import { PrismaClient, StatusPorta, StatusPppoe, StatusOnu, StatusFinanceiro, StatusFatura } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function diasAtras(n: number) {
  return new Date(Date.now() - n * 86_400_000);
}

function diasFrente(n: number) {
  return new Date(Date.now() + n * 86_400_000);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Iniciando seed...\n');

  // ── Limpar dados existentes (exceto users) ──────────────────────────────
  await prisma.notificacao.deleteMany();
  await prisma.alarme.deleteMany();
  await prisma.fatura.deleteMany();
  await prisma.ctoPorta.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.plano.deleteMany();
  await prisma.cto.deleteMany();
  await prisma.oltPonPort.deleteMany();
  await prisma.olt.deleteMany();
  console.log('✓ Dados anteriores removidos');

  // ── Admin ───────────────────────────────────────────────────────────────
  const adminExiste = await prisma.user.findUnique({ where: { email: 'admin@isp.local' } });
  if (!adminExiste) {
    await prisma.user.create({
      data: {
        nome: 'Administrador',
        email: 'admin@isp.local',
        senha: await bcrypt.hash('admin123', 10),
        role: 'ADMIN',
      },
    });
    console.log('✓ Admin criado: admin@isp.local / admin123');
  }

  // ── Planos ──────────────────────────────────────────────────────────────
  const planos = await Promise.all([
    prisma.plano.create({ data: { nome: 'Fibra 50M',  velocidadeUp: 25,  velocidadeDn: 50,  valor: 69.90 } }),
    prisma.plano.create({ data: { nome: 'Fibra 100M', velocidadeUp: 50,  velocidadeDn: 100, valor: 89.90 } }),
    prisma.plano.create({ data: { nome: 'Fibra 200M', velocidadeUp: 100, velocidadeDn: 200, valor: 109.90 } }),
    prisma.plano.create({ data: { nome: 'Fibra 500M', velocidadeUp: 250, velocidadeDn: 500, valor: 149.90 } }),
  ]);
  console.log(`✓ ${planos.length} planos criados`);

  // ── OLTs ────────────────────────────────────────────────────────────────
  const olt1 = await prisma.olt.create({
    data: {
      nome: 'OLT-CENTRAL-01',
      ip: '192.168.10.1',
      marca: 'HUAWEI',
      modelo: 'MA5800-X7',
      comunidadeSnmp: 'public',
      versaoSnmp: '2c',
      usuario: 'admin',
      senha: 'huawei@123',
    },
  });

  const olt2 = await prisma.olt.create({
    data: {
      nome: 'OLT-NORTE-02',
      ip: '192.168.10.2',
      marca: 'ZTE',
      modelo: 'C300M',
      comunidadeSnmp: 'public',
      versaoSnmp: '2c',
      usuario: 'zte',
      senha: 'zte@123',
    },
  });
  console.log(`✓ 2 OLTs criadas`);

  // ── CTOs ────────────────────────────────────────────────────────────────
  const ctosData = [
    { nome: 'CTO-JD-AMERICA-01', endereco: 'Rua das Flores, 150 — Jd. América',    lat: -23.5505, lng: -46.6333, cap: 16, olt: olt1 },
    { nome: 'CTO-JD-AMERICA-02', endereco: 'Av. Paulista, 900 — Jd. América',      lat: -23.5510, lng: -46.6340, cap: 16, olt: olt1 },
    { nome: 'CTO-CENTRO-01',     endereco: 'Rua 7 de Setembro, 200 — Centro',      lat: -23.5480, lng: -46.6280, cap: 32, olt: olt1 },
    { nome: 'CTO-CENTRO-02',     endereco: 'Praça da República, s/n — Centro',     lat: -23.5462, lng: -46.6388, cap: 16, olt: olt1 },
    { nome: 'CTO-NORTE-01',      endereco: 'Rua Voluntários da Pátria, 40 — Norte', lat: -23.5200, lng: -46.6250, cap: 16, olt: olt2 },
    { nome: 'CTO-NORTE-02',      endereco: 'Av. Cruzeiro do Sul, 1200 — Norte',    lat: -23.5150, lng: -46.6180, cap: 16, olt: olt2 },
    { nome: 'CTO-VILA-NOVA-01',  endereco: 'Rua das Acácias, 88 — Vila Nova',      lat: -23.5600, lng: -46.6450, cap: 8,  olt: olt2 },
  ];

  const ctos: Record<string, Awaited<ReturnType<typeof prisma.cto.create>>> = {};
  for (const c of ctosData) {
    const cto = await prisma.cto.create({
      data: {
        nome: c.nome,
        endereco: c.endereco,
        latitude: c.lat,
        longitude: c.lng,
        capacidade: c.cap,
        oltId: c.olt.id,
      },
    });
    // Criar portas
    await prisma.ctoPorta.createMany({
      data: Array.from({ length: c.cap }, (_, i) => ({ ctoId: cto.id, numero: i + 1 })),
    });
    ctos[c.nome] = cto;
  }
  console.log(`✓ ${ctosData.length} CTOs criadas com portas`);

  // ── Clientes ─────────────────────────────────────────────────────────────
  const clientesData = [
    // Jd. América 01 — 6 de 16 portas ocupadas
    { nome: 'João Carlos Silva',      cpf: '111.111.111-11', pppoe: 'joao.silva',      cto: 'CTO-JD-AMERICA-01', porta: 1,  plano: 1, status: 'ATIVO',     onu: 'ONLINE',  sinal: -18.5, finStatus: 'EM_DIA',     dia: 10 },
    { nome: 'Maria Aparecida Santos', cpf: '222.222.222-22', pppoe: 'maria.santos',    cto: 'CTO-JD-AMERICA-01', porta: 2,  plano: 1, status: 'ATIVO',     onu: 'ONLINE',  sinal: -20.1, finStatus: 'EM_DIA',     dia: 15 },
    { nome: 'Pedro Henrique Lima',    cpf: '333.333.333-33', pppoe: 'pedro.lima',      cto: 'CTO-JD-AMERICA-01', porta: 3,  plano: 2, status: 'BLOQUEADO', onu: 'OFFLINE', sinal: null,  finStatus: 'INADIMPLENTE', dia: 5  },
    { nome: 'Ana Paula Rodrigues',    cpf: '444.444.444-44', pppoe: 'ana.rodrigues',   cto: 'CTO-JD-AMERICA-01', porta: 4,  plano: 2, status: 'ATIVO',     onu: 'ONLINE',  sinal: -19.3, finStatus: 'EM_DIA',     dia: 20 },
    { nome: 'Carlos Eduardo Pereira', cpf: '555.555.555-55', pppoe: 'carlos.pereira',  cto: 'CTO-JD-AMERICA-01', porta: 5,  plano: 3, status: 'ATIVO',     onu: 'ONLINE',  sinal: -17.8, finStatus: 'EM_DIA',     dia: 10 },
    { nome: 'Fernanda Costa Alves',   cpf: '666.666.666-66', pppoe: 'fernanda.alves',  cto: 'CTO-JD-AMERICA-01', porta: 6,  plano: 1, status: 'ATIVO',     onu: 'OFFLINE', sinal: null,  finStatus: 'EM_DIA',     dia: 25 },
    // Jd. América 02 — 5 de 16
    { nome: 'Roberto Nascimento',     cpf: '777.777.777-77', pppoe: 'roberto.nasc',    cto: 'CTO-JD-AMERICA-02', porta: 1,  plano: 2, status: 'ATIVO',     onu: 'ONLINE',  sinal: -21.0, finStatus: 'EM_DIA',     dia: 10 },
    { nome: 'Juliana Mendes',         cpf: '888.888.888-88', pppoe: 'juliana.mendes',  cto: 'CTO-JD-AMERICA-02', porta: 2,  plano: 3, status: 'ATIVO',     onu: 'ONLINE',  sinal: -18.0, finStatus: 'EM_DIA',     dia: 5  },
    { nome: 'Lucas Ferreira',         cpf: '999.999.999-99', pppoe: 'lucas.ferreira',  cto: 'CTO-JD-AMERICA-02', porta: 3,  plano: 1, status: 'BLOQUEADO', onu: 'OFFLINE', sinal: null,  finStatus: 'INADIMPLENTE', dia: 15 },
    { nome: 'Camila Sousa',           cpf: '100.200.300-40', pppoe: 'camila.sousa',    cto: 'CTO-JD-AMERICA-02', porta: 4,  plano: 4, status: 'ATIVO',     onu: 'ONLINE',  sinal: -16.5, finStatus: 'EM_DIA',     dia: 1  },
    { nome: 'Marcelo Barbosa',        cpf: '200.300.400-50', pppoe: 'marcelo.barb',    cto: 'CTO-JD-AMERICA-02', porta: 5,  plano: 2, status: 'ATIVO',     onu: 'ONLINE',  sinal: -22.3, finStatus: 'EM_DIA',     dia: 20 },
    // Centro 01 — 8 de 32 (simular corte de cabo — maioria offline)
    { nome: 'Silvia Carvalho',        cpf: '300.400.500-60', pppoe: 'silvia.carv',     cto: 'CTO-CENTRO-01',     porta: 1,  plano: 2, status: 'ATIVO',     onu: 'OFFLINE', sinal: null,  finStatus: 'EM_DIA',     dia: 10 },
    { nome: 'Thiago Araujo',          cpf: '400.500.600-70', pppoe: 'thiago.araujo',   cto: 'CTO-CENTRO-01',     porta: 2,  plano: 3, status: 'ATIVO',     onu: 'OFFLINE', sinal: null,  finStatus: 'EM_DIA',     dia: 10 },
    { nome: 'Beatriz Oliveira',       cpf: '500.600.700-80', pppoe: 'beatriz.oliv',    cto: 'CTO-CENTRO-01',     porta: 3,  plano: 1, status: 'ATIVO',     onu: 'OFFLINE', sinal: null,  finStatus: 'EM_DIA',     dia: 15 },
    { nome: 'Diego Santana',          cpf: '600.700.800-90', pppoe: 'diego.santana',   cto: 'CTO-CENTRO-01',     porta: 4,  plano: 2, status: 'ATIVO',     onu: 'OFFLINE', sinal: null,  finStatus: 'EM_DIA',     dia: 5  },
    { nome: 'Leticia Moreira',        cpf: '700.800.900-01', pppoe: 'leticia.mor',     cto: 'CTO-CENTRO-01',     porta: 5,  plano: 4, status: 'ATIVO',     onu: 'OFFLINE', sinal: null,  finStatus: 'EM_DIA',     dia: 20 },
    { nome: 'Felipe Gomes',           cpf: '800.900.000-11', pppoe: 'felipe.gomes',    cto: 'CTO-CENTRO-01',     porta: 6,  plano: 3, status: 'ATIVO',     onu: 'ONLINE',  sinal: -19.7, finStatus: 'EM_DIA',     dia: 25 },
    { nome: 'Vanessa Cruz',           cpf: '900.000.111-22', pppoe: 'vanessa.cruz',    cto: 'CTO-CENTRO-01',     porta: 7,  plano: 1, status: 'ATIVO',     onu: 'OFFLINE', sinal: null,  finStatus: 'EM_DIA',     dia: 10 },
    { nome: 'Rodrigo Pinto',          cpf: '111.222.333-44', pppoe: 'rodrigo.pinto',   cto: 'CTO-CENTRO-01',     porta: 8,  plano: 2, status: 'ATIVO',     onu: 'OFFLINE', sinal: null,  finStatus: 'EM_DIA',     dia: 15 },
    // Norte 01
    { nome: 'Patrícia Lopes',         cpf: '222.333.444-55', pppoe: 'patricia.lopes',  cto: 'CTO-NORTE-01',      porta: 1,  plano: 1, status: 'ATIVO',     onu: 'ONLINE',  sinal: -20.5, finStatus: 'EM_DIA',     dia: 10 },
    { nome: 'Anderson Lima',          cpf: '333.444.555-66', pppoe: 'anderson.lima',   cto: 'CTO-NORTE-01',      porta: 2,  plano: 2, status: 'ATIVO',     onu: 'ONLINE',  sinal: -18.9, finStatus: 'EM_DIA',     dia: 5  },
    { nome: 'Mônica Teixeira',        cpf: '444.555.666-77', pppoe: 'monica.teix',     cto: 'CTO-NORTE-01',      porta: 3,  plano: 1, status: 'BLOQUEADO', onu: 'OFFLINE', sinal: null,  finStatus: 'INADIMPLENTE', dia: 20 },
    { nome: 'Gustavo Ramos',          cpf: '555.666.777-88', pppoe: 'gustavo.ramos',   cto: 'CTO-NORTE-01',      porta: 4,  plano: 3, status: 'ATIVO',     onu: 'ONLINE',  sinal: -17.2, finStatus: 'EM_DIA',     dia: 15 },
    // Norte 02
    { nome: 'Aline Freitas',          cpf: '666.777.888-99', pppoe: 'aline.freitas',   cto: 'CTO-NORTE-02',      porta: 1,  plano: 2, status: 'ATIVO',     onu: 'ONLINE',  sinal: -19.1, finStatus: 'EM_DIA',     dia: 10 },
    { nome: 'Bruno Cardoso',          cpf: '777.888.999-00', pppoe: 'bruno.cardoso',   cto: 'CTO-NORTE-02',      porta: 2,  plano: 4, status: 'ATIVO',     onu: 'ONLINE',  sinal: -15.8, finStatus: 'EM_DIA',     dia: 25 },
    // Vila Nova
    { nome: 'Daniela Melo',           cpf: '888.999.000-11', pppoe: 'daniela.melo',    cto: 'CTO-VILA-NOVA-01',  porta: 1,  plano: 1, status: 'ATIVO',     onu: 'ONLINE',  sinal: -21.5, finStatus: 'EM_DIA',     dia: 10 },
    { nome: 'Fábio Ribeiro',          cpf: '999.000.111-22', pppoe: 'fabio.ribeiro',   cto: 'CTO-VILA-NOVA-01',  porta: 2,  plano: 2, status: 'ATIVO',     onu: 'ONLINE',  sinal: -20.0, finStatus: 'EM_DIA',     dia: 15 },
  ];

  const clientes: any[] = [];
  for (const d of clientesData) {
    const cto = ctos[d.cto];
    const porta = await prisma.ctoPorta.findUnique({ where: { ctoId_numero: { ctoId: cto.id, numero: d.porta } } });

    const cliente = await prisma.cliente.create({
      data: {
        nome: d.nome,
        cpfCnpj: d.cpf,
        email: `${d.pppoe.replace('.', '')}@email.com`,
        celular: `119${String(Math.floor(Math.random() * 90000000) + 10000000)}`,
        usuarioPppoe: d.pppoe,
        senhaPppoe: 'senha@123',
        statusPppoe: d.status as StatusPppoe,
        statusOnu: d.onu as StatusOnu,
        sinalOnu: d.sinal,
        statusFinanceiro: d.finStatus as StatusFinanceiro,
        diaVencimento: d.dia,
        planoId: planos[d.plano - 1].id,
        serialOnu: `HWTC${String(Math.floor(Math.random() * 9000000) + 1000000)}`,
        modeloOnu: pick(['EG8141A5', 'HG8546M', 'AN5506-04-F', 'ZTE-F660']),
        dataAtivacao: diasAtras(Math.floor(Math.random() * 365) + 30),
      },
    });

    // Vincular porta
    await prisma.ctoPorta.update({
      where: { id: porta!.id },
      data: {
        clienteId: cliente.id,
        status: StatusPorta.OCUPADA,
        sinalDbm: d.sinal,
      },
    });

    clientes.push({ ...cliente, _planoValor: planos[d.plano - 1].valor });
  }
  console.log(`✓ ${clientes.length} clientes criados e vinculados às CTOs`);

  // ── Faturas ──────────────────────────────────────────────────────────────
  let totalFaturas = 0;
  for (const c of clientes) {
    const valor = Number(c._planoValor);

    // Fatura do mês passado — PAGA
    await prisma.fatura.create({
      data: {
        clienteId: c.id,
        valor,
        vencimento: diasAtras(20),
        status: StatusFatura.PAGA,
        dataPagamento: diasAtras(18),
        valorPago: valor,
      },
    });

    // Fatura atual
    if (c.statusFinanceiro === 'INADIMPLENTE') {
      // Vencida há 5 dias
      await prisma.fatura.create({
        data: {
          clienteId: c.id,
          valor,
          vencimento: diasAtras(5),
          status: StatusFatura.VENCIDA,
        },
      });
    } else {
      // Vence em 10 dias
      await prisma.fatura.create({
        data: {
          clienteId: c.id,
          valor,
          vencimento: diasFrente(10),
          status: StatusFatura.PENDENTE,
        },
      });
    }
    totalFaturas += 2;
  }
  console.log(`✓ ${totalFaturas} faturas criadas`);

  // ── Notificações ─────────────────────────────────────────────────────────
  const inadimplentes = clientes.filter((c) => c.statusFinanceiro === 'INADIMPLENTE');
  for (const c of inadimplentes) {
    await prisma.notificacao.create({
      data: {
        clienteId: c.id,
        tipo: 'AVISO_VENCIMENTO',
        canal: 'WHATSAPP',
        mensagem: `Olá ${c.nome.split(' ')[0]}, sua fatura está vencida. Regularize para reativar seu serviço.`,
        enviado: true,
        enviadoEm: diasAtras(3),
      },
    });
    await prisma.notificacao.create({
      data: {
        clienteId: c.id,
        tipo: 'BLOQUEIO',
        canal: 'WHATSAPP',
        mensagem: `${c.nome.split(' ')[0]}, seu serviço foi suspenso por inadimplência. Pague sua fatura para reativar.`,
        enviado: false,
      },
    });
  }

  // Aviso de vencimento para clientes normais (3 próximos a vencer)
  const emDia = clientes.filter((c) => c.statusFinanceiro === 'EM_DIA').slice(0, 3);
  for (const c of emDia) {
    await prisma.notificacao.create({
      data: {
        clienteId: c.id,
        tipo: 'AVISO_VENCIMENTO',
        canal: 'WHATSAPP',
        mensagem: `Olá ${c.nome.split(' ')[0]}, sua fatura de R$ ${Number(c._planoValor).toFixed(2)} vence em 10 dias.`,
        enviado: true,
        enviadoEm: diasAtras(1),
      },
    });
  }
  console.log(`✓ Notificações criadas`);

  // ── Alarmes ───────────────────────────────────────────────────────────────
  // CTO-CENTRO-01 tem 6/8 clientes offline = 75% → corte de cabo
  await prisma.alarme.create({
    data: {
      tipo: 'CORTE_CABO',
      descricao: '6/8 ONUs offline na CTO CTO-CENTRO-01 (75%) — possível corte de cabo',
      ctoId: ctos['CTO-CENTRO-01'].id,
      oltId: olt1.id,
      resolvido: false,
    },
  });

  await prisma.alarme.create({
    data: {
      tipo: 'SINAL_CRITICO',
      descricao: 'Sinal crítico detectado na CTO-JD-AMERICA-02 — ONU marcelo.barb: -22.3 dBm',
      ctoId: ctos['CTO-JD-AMERICA-02'].id,
      resolvido: false,
    },
  });

  await prisma.alarme.create({
    data: {
      tipo: 'ALTA_INADIMPLENCIA',
      descricao: '3 clientes inadimplentes bloqueados no dia de hoje',
      resolvido: true,
      resolvidoEm: diasAtras(1),
    },
  });
  console.log(`✓ 3 alarmes criados (1 corte de cabo ativo, 1 sinal crítico, 1 resolvido)`);

  // ── Resumo ────────────────────────────────────────────────────────────────
  console.log('\n─── Resumo ───────────────────────────────────────');
  console.log(`  OLTs:       2`);
  console.log(`  CTOs:       ${ctosData.length} (com portas geradas)`);
  console.log(`  Planos:     ${planos.length}`);
  console.log(`  Clientes:   ${clientes.length} (${inadimplentes.length} inadimplentes)`);
  console.log(`  Faturas:    ${totalFaturas}`);
  console.log(`  Alarmes:    3 (2 ativos)`);
  console.log(`  Login:      admin@isp.local / admin123`);
  console.log('──────────────────────────────────────────────────\n');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
