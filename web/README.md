# Packing-y-Conteo · sitio web

Versión web de la app (la misma de claude.ai) conectada a Supabase.

- `index.html`: la app completa. Se genera con `python3 web-fuente/construir.py` desde `web-fuente/app.html` (la misma app de claude.ai) y `web-fuente/shim.js` (conexión a Supabase). No editar a mano.
- Datos: tabla `docs` de Supabase. Archivos: bucket `archivos`. IA: función `ia`.
- Entrada: PIN del negocio (contraseña del usuario `negocio@packing-y-conteo.app` en Supabase › Authentication).

Publicación: Vercel, con **Root Directory = `web`** y sin comando de build.
