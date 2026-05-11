export interface DashboardSummary {
  clientes: { total: number; online: number; offline: number; inadimplentes: number };
  financeiro: { faturamentoDia: number };
  olts: { id: string; nome: string; ip: string; ativo: boolean }[];
  alarmes: { id: string; tipo: string; descricao: string; createdAt: string }[];
}

export interface CtoMapItem {
  id: string;
  nome: string;
  lat: number;
  lng: number;
  capacidade: number;
  ocupadas: number;
  livres: number;
  ocupacaoPct: number;
  sinalMedioDbm: string | null;
}

export interface CtoPorta {
  id: string;
  numero: number;
  status: 'LIVRE' | 'OCUPADA' | 'RESERVADA' | 'DEFEITO';
  sinalDbm: number | null;
  cliente: { id: string; nome: string; statusOnu: string; sinalOnu: number | null } | null;
}

export interface CtoDetail {
  id: string;
  nome: string;
  endereco: string;
  capacidade: number;
  portas: CtoPorta[];
  olt: { nome: string; ip: string };
}

export interface Cliente {
  id: string;
  nome: string;
  cpfCnpj: string;
  email: string;
  celular: string;
  usuarioPppoe: string;
  statusPppoe: 'ATIVO' | 'BLOQUEADO' | 'CANCELADO';
  statusOnu: 'ONLINE' | 'OFFLINE' | 'PROVISIONANDO';
  statusFinanceiro: 'EM_DIA' | 'INADIMPLENTE' | 'SUSPENSO' | 'CANCELADO';
  sinalOnu: number | null;
  plano: { nome: string; velocidadeDn: number; velocidadeUp: number; valor: number } | null;
}

export interface Fatura {
  id: string;
  clienteId: string;
  cliente: { nome: string; cpfCnpj: string };
  valor: number;
  vencimento: string;
  status: 'PENDENTE' | 'PAGA' | 'VENCIDA' | 'CANCELADA';
  pixQrCode: string | null;
  pixTxId: string | null;
  dataPagamento: string | null;
  valorPago: number | null;
  createdAt: string;
}

export interface Olt {
  id: string;
  nome: string;
  ip: string;
  marca: string;
  modelo: string;
  ativo: boolean;
}

export interface Plano {
  id: string;
  nome: string;
  velocidadeUp: number;
  velocidadeDn: number;
  valor: number;
  ativo: boolean;
  createdAt: string;
  _count: { clientes: number };
}

export interface Alarme {
  id: string;
  tipo: 'CORTE_CABO' | 'OLT_OFFLINE' | 'SINAL_CRITICO' | 'ALTA_INADIMPLENCIA';
  descricao: string;
  ctoId: string | null;
  oltId: string | null;
  resolvido: boolean;
  resolvidoEm: string | null;
  createdAt: string;
}

export interface Notificacao {
  id: string;
  clienteId: string;
  cliente: { nome: string };
  tipo: 'AVISO_VENCIMENTO' | 'BOLETO_GERADO' | 'PAGAMENTO_CONFIRMADO' | 'BLOQUEIO' | 'CORTE_CABO';
  canal: 'EMAIL' | 'SMS' | 'WHATSAPP';
  mensagem: string;
  enviado: boolean;
  enviadoEm: string | null;
  createdAt: string;
}

export interface Cto {
  id: string;
  nome: string;
  endereco: string | null;
  latitude: number;
  longitude: number;
  capacidade: number;
  observacao: string | null;
  olt: { nome: string; ip: string };
  _count?: { portas: number };
}
