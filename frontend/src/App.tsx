import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MapaPage from './pages/MapaPage';
import ClientesPage from './pages/ClientesPage';
import OltsPage from './pages/OltsPage';
import FinanceiroPage from './pages/FinanceiroPage';
import PlanosPage from './pages/PlanosPage';
import AlarmesPage from './pages/AlarmesPage';
import CtosPage from './pages/CtosPage';
import NotificacoesPage from './pages/NotificacoesPage';
import UsuariosPage from './pages/UsuariosPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="mapa" element={<MapaPage />} />
            <Route path="ctos" element={<CtosPage />} />
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="olts" element={<OltsPage />} />
            <Route path="planos" element={<PlanosPage />} />
            <Route path="financeiro" element={<FinanceiroPage />} />
            <Route path="alarmes" element={<AlarmesPage />} />
            <Route path="notificacoes" element={<NotificacoesPage />} />
            <Route path="usuarios" element={<UsuariosPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
