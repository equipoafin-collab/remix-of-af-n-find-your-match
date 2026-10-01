import type { PerfilForMatching } from "@/lib/profileMatching";

/** Perfil base válido; cada test sobrescribe solo lo que le interesa. */
export const crearPerfil = (overrides: Partial<PerfilForMatching> = {}): PerfilForMatching => ({
  id: "base",
  nombre_completo: "Persona Base",
  email: null,
  edad: 33,
  ciudad: "Madrid",
  genero: "Mujer",
  busca_genero: "Hombre",
  edad_min_busca: 28,
  edad_max_busca: 40,
  tipo_relacion: "Relación estable",
  hijos: "Quiero tener",
  tabaco: "No",
  alcohol: "Socialmente",
  desea_casarse: "Sí",
  religion: "Catolicismo",
  religion_pareja: null,
  importa_religion: false,
  ideologia: "Centro",
  deseo_familia: 4,
  ambicion_profesional: 3,
  nivel_social: 3,
  estilo_vida_activo: 3,
  necesidad_independencia: 3,
  fin_de_semana: "Planes tranquilos",
  conflicto: [],
  sentirse_querido: [],
  disc_perfil: "S",
  importa_vestir: false,
  estilo_vestir: null,
  estilo_vestir_pareja: null,
  importa_politica: false,
  politica_pareja: null,
  tiene_tatuajes: false,
  tatuajes_pareja: "Me da igual",
  ...overrides,
});

/** Pareja compatible: ella busca hombre 28-40, él busca mujer 28-40, ambos en Madrid. */
export const ana = crearPerfil({ id: "ana", nombre_completo: "Ana López", genero: "Mujer", busca_genero: "Hombre", edad: 32 });
export const luis = crearPerfil({ id: "luis", nombre_completo: "Luis García", genero: "Hombre", busca_genero: "Mujer", edad: 35, disc_perfil: "D" });
