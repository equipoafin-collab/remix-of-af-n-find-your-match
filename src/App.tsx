import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Perfil from "./pages/Perfil";
import PerfilDocumentos from "./pages/PerfilDocumentos";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboardHome from "./pages/admin/Dashboard";
import PerfilesList from "./pages/admin/PerfilesList";
import PerfilDetalle from "./pages/admin/PerfilDetalle";
import Pagos from "./pages/admin/Pagos";
import Tareas from "./pages/admin/Tareas";
import Placeholder from "./pages/admin/Placeholder";
import CompatibilityDashboard from "./pages/CompatibilityDashboard";
import DiscQuiz from "./pages/DiscQuiz";
import NotFound from "./pages/NotFound";
import Legal from "./pages/Legal";
import QuienesSomos from "./pages/QuienesSomos";

const queryClient = new QueryClient();

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
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardHome />} />
            <Route path="perfiles" element={<PerfilesList />} />
            <Route path="perfiles/:id" element={<PerfilDetalle />} />
            <Route path="compatibilidades" element={<Placeholder title="Compatibilidades" description="Visión global de los matches sugeridos por el algoritmo. Para generar matches de un perfil concreto, abre su ficha y pulsa 'Buscar Pareja Compatible'." />} />
            <Route path="matches" element={<Placeholder title="Matches Aprobados" description="Aquí aparecerán los matches que apruebes desde la ficha de cada perfil, con su estado y trazabilidad." />} />
            <Route path="seguimiento" element={<Placeholder title="Seguimiento" description="Cronología de cada match aprobado: primer contacto, reunión agendada, en conversación, relación iniciada." />} />
            <Route path="notas" element={<Placeholder title="Notas Privadas" description="Las notas internas se gestionan dentro de cada ficha de perfil. Esta sección agregará una vista consolidada." />} />
            <Route path="tareas" element={<Tareas />} />
            <Route path="pagos" element={<Pagos />} />
            <Route path="configuracion" element={<Placeholder title="Configuración" description="Ajustes del CRM, pesos del algoritmo y gestión de administradoras." />} />
          </Route>
          <Route path="/compatibilidad" element={<CompatibilityDashboard />} />
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
