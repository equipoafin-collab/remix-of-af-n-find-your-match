import { useSignedUrl } from "@/hooks/admin/useSignedUrl";

interface FotoPerfilProps {
  path: string | null | undefined;
  nombre: string;
  className: string;
}

const iniciales = (nombre: string) =>
  nombre.trim().split(/\s+/).slice(0, 2).map((n) => n[0]).join("").toUpperCase();

/** Foto del bucket privado fotos-perfil con URL firmada; si no hay, iniciales. */
const FotoPerfil = ({ path, nombre, className }: FotoPerfilProps) => {
  const { data: url } = useSignedUrl("fotos-perfil", path);
  if (url) return <img src={url} alt={nombre} className={`${className} object-cover border border-border`} />;
  return (
    <div className={`${className} bg-gold/20 text-foreground flex items-center justify-center font-display font-semibold`}>
      {iniciales(nombre)}
    </div>
  );
};

export default FotoPerfil;
