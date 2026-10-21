import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Fragment, lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
const Perfil = lazy(() => import("./pages/Perfil"));
const PerfilDocumentos = lazy(() => import("./pages/PerfilDocumentos"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AccesoAdmin = lazy(() => import("./pages/AccesoAdmin"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminDashboardHome = lazy(() => import("./pages/admin/Dashboard"));
const PerfilesList = lazy(() => import("./pages/admin/PerfilesList"));
const PerfilDetalle = lazy(() => import("./pages/admin/PerfilDetalle"));
const Pagos = lazy(() => import("./pages/admin/Pagos"));
const Tareas = lazy(() => import("./pages/admin/Tareas"));
const Alertas = lazy(() => import("./pages/admin/Alertas"));
const Configuracion = lazy(() => import("./pages/admin/Configuracion"));
const Compatibilidades = lazy(() => import("./pages/admin/Compatibilidades"));
const MatchesAprobados = lazy(() => import("./pages/admin/MatchesAprobados"));
const Seguimiento = lazy(() => import("./pages/admin/Seguimiento"));
const NotasPrivadas = lazy(() => import("./pages/admin/NotasPrivadas"));
const DiscQuiz = lazy(() => import("./pages/DiscQuiz"));
const Legal = lazy(() => import("./pages/Legal"));
const QuienesSomos = lazy(() => import("./pages/QuienesSomos"));
const PagoResultado = lazy(() => import("./pages/PagoResultado"));
const AccesoCliente = lazy(() => import("./pages/AccesoCliente"));
const LoginCliente = lazy(() => import("./pages/cliente/LoginCliente"));
const ClienteLayout = lazy(() => import("./components/cliente/ClienteLayout"));
const InicioCliente = lazy(() => import("./pages/cliente/InicioCliente"));
const PerfilCliente = lazy(() => import("./pages/cliente/PerfilCliente"));
const CalendarioCliente = lazy(() => import("./pages/cliente/CalendarioCliente"));
const MatchesCliente = lazy(() => import("./pages/cliente/MatchesCliente"));
const PropuestasCliente = lazy(() => import("./pages/cliente/PropuestasCliente"));

const queryClient = new QueryClient();

// T10.2 · La portada se carga sola; cada página (y el CRM entero) baja al entrar en ella.
const Cargando = () => <main className="min-h-screen bg-background" aria-busy="true" />;

// Estas páginas leen sus filtros de la URL al montarse (enlaces del Dashboard, T8.2): con otra URL, se vuelven a montar.
const FiltrosDeUrl = ({ children }: { children: ReactNode }) => <Fragment key={useLocation().search}>{children}</Fragment>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<Cargando />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/perfil/documentos" element={<PerfilDocumentos />} />
            <Route path="/mi-area/acceso" element={<AccesoCliente />} />
            <Route path="/mi-area/login" element={<LoginCliente />} />
            <Route path="/mi-area" element={<ClienteLayout />}>
              <Route index element={<InicioCliente />} />
              <Route path="calendario" element={<CalendarioCliente />} />
              <Route path="matches" element={<MatchesCliente />} />
              <Route path="propuestas" element={<PropuestasCliente />} />
              <Route path="perfil" element={<PerfilCliente />} />
            </Route>
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/acceso" element={<AccesoAdmin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardHome />} />
              <Route path="perfiles" element={<FiltrosDeUrl><PerfilesList /></FiltrosDeUrl>} />
              <Route path="perfiles/:id" element={<PerfilDetalle />} />
              <Route path="compatibilidades" element={<Compatibilidades />} />
              <Route path="matches" element={<MatchesAprobados />} />
              <Route path="seguimiento" element={<Seguimiento />} />
              <Route path="notas" element={<NotasPrivadas />} />
              <Route path="tareas" element={<FiltrosDeUrl><Tareas /></FiltrosDeUrl>} />
              <Route path="alertas" element={<FiltrosDeUrl><Alertas /></FiltrosDeUrl>} />
              <Route path="pagos" element={<Pagos />} />
              <Route path="configuracion" element={<Configuracion />} />
            </Route>
            {/* T6.3: el informe se genera ahora dentro de cada match (ficha → Matches). */}
            <Route path="/compatibilidad" element={<Navigate to="/admin" replace />} />
            <Route path="/quiz" element={<DiscQuiz />} />
            <Route path="/quienes-somos" element={<QuienesSomos />} />
            <Route path="/terminos" element={<Legal />} />
            <Route path="/privacidad" element={<Legal />} />
            <Route path="/aviso-legal" element={<Legal />} />
            <Route path="/pago/ok" element={<PagoResultado />} />
            <Route path="/pago/cancelado" element={<PagoResultado />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
