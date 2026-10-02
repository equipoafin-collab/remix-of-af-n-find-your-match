import { describe, expect, it } from "vitest";
import { rutaVideoPresentacion, validarVideo } from "@/lib/video";

const MB = 1024 * 1024;

describe("validarVideo", () => {
  it("acepta mp4 y mov con su extensión", () => {
    expect(validarVideo({ type: "video/mp4", size: 10 * MB })).toEqual({ ext: "mp4" });
    expect(validarVideo({ type: "video/quicktime", size: 10 * MB })).toEqual({ ext: "mov" });
  });

  it("rechaza otros formatos", () => {
    expect(validarVideo({ type: "video/webm", size: MB })).toHaveProperty("error");
  });

  it("acepta justo 500 MB y rechaza más", () => {
    expect(validarVideo({ type: "video/mp4", size: 500 * MB })).toEqual({ ext: "mp4" });
    expect(validarVideo({ type: "video/mp4", size: 500 * MB + 1 })).toHaveProperty("error");
  });
});

describe("rutaVideoPresentacion", () => {
  it("cuelga de la carpeta del perfil", () => {
    expect(rutaVideoPresentacion("abc", "mov")).toBe("abc/presentacion.mov");
  });
});
