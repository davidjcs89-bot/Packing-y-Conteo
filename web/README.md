# Packing-y-Conteo · sitio web

Versión web de la app (la misma de claude.ai) conectada a Supabase.

- `index.html`: la app completa. Se genera desde la versión de claude.ai; no editar a mano.
- Datos: tabla `docs` de Supabase. Archivos: bucket `archivos`. IA: función `ia`.
- Entrada: PIN del negocio (contraseña del usuario `negocio@packing-y-conteo.app` en Supabase › Authentication).

Publicación: Vercel, con **Root Directory = `web`** y sin comando de build.
