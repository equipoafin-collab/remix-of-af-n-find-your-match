import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { filtroBusqueda } from "@/lib/busqueda";
import { inicioNuevos } from "@/lib/dashboard";
import type { Cliente, EstadoCliente, PlanTipo } from "@/types/admin";

export const POR_PAGINA = 25;
export const TODOS = "all";
export const SIN_REVISAR = "sin revisar";
export const SOLO_CLIENTES = "clientes";
export const SOLO_LEADS = "leads";

/** Filtros que enlaza el Dashboard (T8.2), con las mismas condiciones que dashboard_resumen (T8.1). */
export const SITUACIONES: Record<string, string> = {
  nuevos: "Nuevos clientes (30 días)",
  sin_match: "Pendientes de matching",
  pocas_sesiones: "Pocas sesiones",
};

export interface FiltrosClientes {
  busqueda: string;
  genero: string;
  ciudad: string;
  estado: string;   // estado_cliente, SIN_REVISAR o TODOS
  plan: string;     // plan_tipo, SOLO_CLIENTES, SOLO_LEADS o TODOS
  situacion: string; // clave de SITUACIONES o TODOS
  hijos: string;
  tabaco: string;
  religion: string;
}

const COLUMNAS_IGUAL = ["genero", "ciudad", "hijos", "tabaco", "religion"] as const;

// Cuelga de ["perfiles"]: guardar una ficha o un pago refresca también el listado.
export function useClientes(filtros: FiltrosClientes, pagina: number, umbralPocasSesiones = 1) {
  return useQuery({
    queryKey: ["perfiles", "clientes", filtros, pagina, umbralPocasSesiones],
    queryFn: async () => {
      let q = supabase.from("v_clientes").select("*", { count: "exact" });
      for (const col of COLUMNAS_IGUAL) if (filtros[col] !== TODOS) q = q.eq(col, filtros[col]);

      if (filtros.estado === SIN_REVISAR) q = q.eq("revisado", false);
      else if (filtros.estado !== TODOS) q = q.eq("estado_cliente", filtros.estado as EstadoCliente);

      if (filtros.plan === SOLO_CLIENTES) q = q.not("plan", "is", null);
      else if (filtros.plan === SOLO_LEADS) q = q.is("plan", null);
      else if (filtros.plan !== TODOS) q = q.eq("plan", filtros.plan as PlanTipo);

      if (filtros.situacion !== TODOS) q = q.not("plan", "is", null);
      if (filtros.situacion === "nuevos") {
        const { fecha, instante } = inicioNuevos();
        q = q.or(`plan_inicio.gte.${fecha},and(plan_inicio.is.null,created_at.gte."${instante}")`);
      } else if (filtros.situacion === "sin_match") {
        q = q.eq("estado_cliente", "activo").eq("matches_abiertos", 0);
      } else if (filtros.situacion === "pocas_sesiones") {
        q = q.eq("estado_cliente", "activo").gt("sesiones_contratadas", 0).lte("sesiones_pendientes", umbralPocasSesiones);
      }

      const busqueda = filtroBusqueda(filtros.busqueda, ["nombre_completo", "email", "ciudad"]);
      if (busqueda) q = q.or(busqueda);

      const desde = pagina * POR_PAGINA;
      const { data, error, count } = await q.order("created_at", { ascending: false }).range(desde, desde + POR_PAGINA - 1);
      if (error) throw error;
      return { clientes: data as Cliente[], total: count ?? 0 };
    },
    placeholderData: keepPreviousData,
  });
}

// ponytail: PostgREST devuelve como máximo 1.000 filas; con más perfiles faltarían opciones.
// Si se llega ahí, sustituir por una función SQL con SELECT DISTINCT.
export function useOpcionesFiltro() {
  return useQuery({
    queryKey: ["perfiles", "opciones-filtro"],
    queryFn: async () => {
      const { data, error } = await supabase.from("perfiles").select("ciudad, religion");
      if (error) throw error;
      const distintos = (valores: (string | null)[]) =>
        [...new Set(valores.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, "es"));
      return { ciudades: distintos(data.map((p) => p.ciudad)), religiones: distintos(data.map((p) => p.religion)) };
    },
  });
}
