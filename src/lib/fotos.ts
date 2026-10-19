import { Directory, File, Paths } from 'expo-file-system';

import { uid } from './calc';

/*
 * Las fotos se guardan en la carpeta de la app y en la base se anota solo su nombre
 * ("local:abc.jpg"), no la ruta completa: iOS cambia la ruta de la carpeta de la app
 * en cada actualización, y una ruta completa guardada dejaría de funcionar.
 */
const PREFIJO = 'local:';

export function carpetaFotos() {
  const dir = new Directory(Paths.document, 'fotos');
  if (!dir.exists) dir.create();
  return dir;
}

/** Convierte lo guardado en la base en una dirección que la pantalla puede mostrar. */
export function fotoUri(ref?: string) {
  if (!ref) return '';
  if (ref.startsWith(PREFIJO)) return new File(carpetaFotos(), ref.slice(PREFIJO.length)).uri;
  // Fotos guardadas con versiones anteriores (ruta completa): se rescata el nombre.
  if (ref.startsWith('file://') && ref.includes('/fotos/')) return new File(carpetaFotos(), ref.split('/fotos/').pop()!).uri;
  return ref;
}

/** Copia una foto elegida a la carpeta de la app para que no se pierda al limpiar la caché. */
export async function guardarFotoLocal(uri: string) {
  const nombre = `${uid()}.jpg`;
  await new File(uri).copy(new File(carpetaFotos(), nombre));
  return PREFIJO + nombre;
}

/** Escribe una foto que llega como bytes (respaldo) y devuelve su referencia. */
export function escribirFoto(nombre: string, bytes: Uint8Array) {
  const f = new File(carpetaFotos(), nombre);
  if (f.exists) f.delete();
  f.create();
  f.write(bytes);
  return PREFIJO + nombre;
}

/** Borra de la carpeta las fotos que ya ningún artículo usa. */
export function limpiarFotos(enUso: Set<string>) {
  let n = 0;
  for (const it of carpetaFotos().list()) {
    if (it instanceof File && !enUso.has(PREFIJO + it.name)) {
      try {
        it.delete();
        n++;
      } catch {
        /* se reintenta en la próxima limpieza */
      }
    }
  }
  return n;
}
