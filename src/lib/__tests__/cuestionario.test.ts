import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CAMPOS_EDITABLES, CAMPOS_MI_PERFIL, errorPreferencias, respondidos, SECCIONES_PERFIL, type MiPerfil, type Preferencias } from "../cuestionario";
import { MAX_VALORES, PROVINCIAS, VALORES_IMPORTANTES } from "../preguntasClave";

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

describe("actualizar_mi_perfil (T16.2)", () => {
  const sql = readFileSync("supabase/migrations/20261020210000_t16_2_editar_mi_perfil.sql", "utf8");
  const lista = (patron: RegExp) => [...(sql.match(patron)?.[1] ?? "").matchAll(/'([^']+)'/g)].map((m) => m[1]);

  it("la migración usa los mismos campos, provincias y valores que la app", () => {
    expect(lista(/_clave <> ALL \(ARRAY\[([\s\S]*?)\]\)/)).toEqual([...CAMPOS_EDITABLES]);
    expect(lista(/_provincias text\[\] := ARRAY\[([\s\S]*?)\];/)).toEqual(PROVINCIAS);
    expect(lista(/_valores text\[\] := ARRAY\[([\s\S]*?)\];/)).toEqual(VALORES_IMPORTANTES);
    expect(sql).toContain(`NOT BETWEEN 1 AND ${MAX_VALORES}`);
  });

  it("solo se editan preferencias, nunca el plan ni datos del CRM", () => {
    for (const c of CAMPOS_EDITABLES) expect(CAMPOS_MI_PERFIL).toContain(c);
  });

  const valido: Preferencias = { zona: "Madrid", acepta_otras_zonas: true, edad_min_busca: 30, edad_max_busca: 40, valores_importantes: ["Familia", "Humor"], hobbies: "Leer" };

  it("acepta unas preferencias válidas", () => {
    expect(errorPreferencias(valido)).toBeNull();
  });

  it("rechaza lo mismo que la base de datos", () => {
    expect(errorPreferencias({ ...valido, zona: "Narnia" })).toMatch(/provincia/);
    expect(errorPreferencias({ ...valido, edad_min_busca: 45 })).toMatch(/mínima/);
    expect(errorPreferencias({ ...valido, edad_min_busca: 17 })).toMatch(/18 a 99/);
    expect(errorPreferencias({ ...valido, valores_importantes: [] })).toMatch(/valores/);
    expect(errorPreferencias({ ...valido, valores_importantes: ["Familia", "Familia"] })).toMatch(/valores/);
    expect(errorPreferencias({ ...valido, valores_importantes: ["Familia", "Humor", "Cultura", "Libertad"] })).toMatch(/valores/);
    expect(errorPreferencias({ ...valido, hobbies: "   " })).toMatch(/aficiones/);
  });
});
