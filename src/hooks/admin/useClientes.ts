import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { filtroBusqueda } from "@/lib/busqueda";
import type { Cliente, EstadoCliente, PlanTipo } from "@/types/admin";

export const POR_PAGINA = 25;
export const TODOS = "all";
export const SIN_REVISAR = "sin revisar";
export const SOLO_CLIENTES = "clientes";
export const SOLO_LEADS = "leads";

export interface FiltrosClientes {
  busqueda: string;
  genero: string;
  ciudad: string;
  estado: string;   // estado_cliente, SIN_REVISAR o TODOS
  plan: string;     // plan_tipo, SOLO_CLIENTES, SOLO_LEADS o TODOS
  hijos: string;
  tabaco: string;
  religion: string;
}

const COLUMNAS_IGUAL = ["genero", "ciudad", "hijos", "tabaco", "religion"] as const;

// Cuelga de ["perfiles"]: guardar una ficha o un pago refresca también el listado.
export function useClientes(filtros: FiltrosClientes, pagina: number) {
  return useQuery({
    queryKey: ["perfiles", "clientes", filtros, pagina],
    queryFn: async () => {
      let q = supabase.from("v_clientes").select("*", { count: "exact" });
      for (const col of COLUMNAS_IGUAL) if (filtros[col] !== TODOS) q = q.eq(col, filtros[col]);

      if (filtros.estado === SIN_REVISAR) q = q.eq("revisado", false);
      else if (filtros.estado !== TODOS) q = q.eq("estado_cliente", filtros.estado as EstadoCliente);

      if (filtros.plan === SOLO_CLIENTES) q = q.not("plan", "is", null);
      else if (filtros.plan === SOLO_LEADS) q = q.is("plan", null);
      else if (filtros.plan !== TODOS) q = q.eq("plan", filtros.plan as PlanTipo);

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
