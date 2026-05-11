import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3000/api' });

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('isp-auth');
  if (raw) {
    const { state } = JSON.parse(raw);
    if (state?.token) config.headers.Authorization = `Bearer ${state.token}`;
  }
  return config;
});

export const authApi = {
  login: (email: string, senha: string) =>
    api.post('/auth/login', { email, senha }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  listarUsuarios: () => api.get('/auth/usuarios').then((r) => r.data),
  criarUsuario: (body: { nome: string; email: string; senha: string; role?: string }) =>
    api.post('/auth/usuarios', body).then((r) => r.data),
  toggleUsuario: (id: string) => api.put(`/auth/usuarios/${id}/toggle`).then((r) => r.data),
};

export const dashboardApi = {
  getSummary: () => api.get('/dashboard').then((r) => r.data),
};

export const ctosApi = {
  getAll: () => api.get('/ctos').then((r) => r.data),
  getMapSummary: () => api.get('/ctos/mapa').then((r) => r.data),
  getOne: (id: string) => api.get(`/ctos/${id}`).then((r) => r.data),
  getDiagnostico: (id: string) => api.get(`/ctos/${id}/diagnostico`).then((r) => r.data),
  create: (body: object) => api.post('/ctos', body).then((r) => r.data),
  update: (id: string, body: object) => api.put(`/ctos/${id}`, body).then((r) => r.data),
};

export const clientesApi = {
  getAll: (params?: { status?: string; inadimplente?: boolean }) =>
    api.get('/clientes', { params }).then((r) => r.data),
  getOne: (id: string) => api.get(`/clientes/${id}`).then((r) => r.data),
  bloquear: (id: string) => api.put(`/clientes/${id}/bloquear`).then((r) => r.data),
  desbloquear: (id: string) => api.put(`/clientes/${id}/desbloquear`).then((r) => r.data),
};

export const oltsApi = {
  getAll: () => api.get('/olts').then((r) => r.data),
  testar: (id: string) => api.get(`/olts/${id}/testar`).then((r) => r.data),
};

export const financeiroApi = {
  getFaturas: (status?: string) =>
    api.get('/financeiro/faturas', { params: status ? { status } : undefined }).then((r) => r.data),
  gerarFatura: (body: { clienteId: string; valor: number; vencimento: string }) =>
    api.post('/financeiro/faturas', body).then((r) => r.data),
  executarReguaCobranca: () =>
    api.post('/financeiro/regua-cobranca').then((r) => r.data),
};

export const planosApi = {
  getAll: () => api.get('/planos').then((r) => r.data),
  getOne: (id: string) => api.get(`/planos/${id}`).then((r) => r.data),
  create: (body: { nome: string; velocidadeUp: number; velocidadeDn: number; valor: number }) =>
    api.post('/planos', body).then((r) => r.data),
  update: (id: string, body: Partial<{ nome: string; velocidadeUp: number; velocidadeDn: number; valor: number; ativo: boolean }>) =>
    api.put(`/planos/${id}`, body).then((r) => r.data),
  toggle: (id: string) => api.put(`/planos/${id}/toggle`).then((r) => r.data),
};

export const alarmesApi = {
  getAll: (resolvido?: boolean) =>
    api.get('/alarmes', { params: resolvido !== undefined ? { resolvido } : undefined }).then((r) => r.data),
  resolver: (id: string) => api.put(`/alarmes/${id}/resolver`).then((r) => r.data),
};

export const notificacoesApi = {
  getAll: (params?: { clienteId?: string; enviado?: boolean; tipo?: string }) =>
    api.get('/notificacoes', { params }).then((r) => r.data),
  reenviar: (id: string) => api.post(`/notificacoes/${id}/reenviar`).then((r) => r.data),
  processar: () => api.post('/notificacoes/processar').then((r) => r.data),
};

export default api;
