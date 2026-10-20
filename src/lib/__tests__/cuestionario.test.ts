import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CAMPOS_MI_PERFIL, respondidos, SECCIONES_PERFIL, type MiPerfil } from "../cuestionario";

describe("mi_perfil", () => {
  it("la migración devuelve exactamente las columnas de CAMPOS_MI_PERFIL", () => {
    const sql = readFileSync("supabase/migrations/20261020200000_t16_1_mi_perfil.sql", "utf8");
    const lista = sql.match(/ANY \(ARRAY\[([\s\S]*?)\]\)/)?.[1] ?? "";
    const columnas = [...lista.matchAll(/'([a-z_0-9]+)'/g)].map((m) => m[1]);
    expect([...columnas].sort()).toEqual([...CAMPOS_MI_PERFIL].sort());
  });

  it("nunca devuelve campos del CRM ni datos de salud", () => {
    for (const interno of ["id", "estado_cliente", "revisado", "user_id", "video_presentacion_path", "ultimo_seguimiento_at", "disc_result_id"]) {
      expect(CAMPOS_MI_PERFIL).not.toContain(interno);
    }
  });
});

describe("respondidos", () => {
  const perfil = {
    nombre_completo: "Lucía Martín", email: "l@x.es", telefono: "", edad: 32, acepta_otras_zonas: false,
    estatura: null, edad_min_busca: 30, edad_max_busca: 40, valores_importantes: [], deseo_familia: 4,
  } as unknown as MiPerfil;
  const campos = SECCIONES_PERFIL.flatMap((s) => s.campos);
  const valores = Object.fromEntries(respondidos(campos, perfil).map((c) => [c.etiqueta, c.v]));

  it("enseña lo contestado con su formato", () => {
    expect(valores["Edad"]).toBe("32 años");
    expect(valores["¿Aceptas personas de otras provincias?"]).toBe("No");
    expect(valores["Rango de edad que buscas"]).toBe("De 30 a 40 años");
    expect(valores["Deseo de formar familia"]).toBe(4);
  });

  it("oculta lo que no contestó (vacío, nulo o lista vacía)", () => {
    expect(valores).not.toHaveProperty("Teléfono");
    expect(valores).not.toHaveProperty("Estatura");
    expect(valores).not.toHaveProperty("¿Qué valores son más importantes para ti?");
  });
});
