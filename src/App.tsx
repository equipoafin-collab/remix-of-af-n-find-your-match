import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Fragment, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Perfil from "./pages/Perfil";
import PerfilDocumentos from "./pages/PerfilDocumentos";
import AdminLogin from "./pages/AdminLogin";
import AccesoAdmin from "./pages/AccesoAdmin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboardHome from "./pages/admin/Dashboard";
import PerfilesList from "./pages/admin/PerfilesList";
import PerfilDetalle from "./pages/admin/PerfilDetalle";
import Pagos from "./pages/admin/Pagos";
import Tareas from "./pages/admin/Tareas";
import Alertas from "./pages/admin/Alertas";
import Configuracion from "./pages/admin/Configuracion";
import Compatibilidades from "./pages/admin/Compatibilidades";
import MatchesAprobados from "./pages/admin/MatchesAprobados";
import Seguimiento from "./pages/admin/Seguimiento";
import NotasPrivadas from "./pages/admin/NotasPrivadas";
import DiscQuiz from "./pages/DiscQuiz";
import NotFound from "./pages/NotFound";
import Legal from "./pages/Legal";
import QuienesSomos from "./pages/QuienesSomos";

const queryClient = new QueryClient();

// Estas páginas leen sus filtros de la URL al montarse (enlaces del Dashboard, T8.2): con otra URL, se vuelven a montar.
const FiltrosDeUrl = ({ children }: { children: ReactNode }) => <Fragment key={useLocation().search}>{children}</Fragment>;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/perfil/documentos" element={<PerfilDocumentos />} />
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
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
