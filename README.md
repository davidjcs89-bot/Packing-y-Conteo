# Packing-y-Conteo

App de iPhone para el catálogo, bodega y costos de importación de artículos comprados en China.
Hecha con Expo (React Native). Funciona **sin internet**: todo se guarda en una base SQLite dentro del teléfono.

## Estado

**Fase 1 — base de la app** (esta versión)
- Base local SQLite (artículos, proveedores, movimientos, viajes, configuración), lista para sincronizar en la Fase 4.
- Pestañas: Artículos, Bodega, Proveedores, Ajustes. Tema claro/oscuro.
- Editor de artículo: fotos (cámara/fototeca, guardadas en el teléfono), estilo, tipo, descripción, proveedor, factura, colores, tallas,
  existencia por color × talla con atajos 1/2/4/0, costo ¥ → USD, costo de importación a Ecuador (CIF, ad valorem, específico, FODINFA, IVA),
  gastos de viaje y precios de mayoreo/menudeo con múltiplos.

**Siguientes fases**
2. Resto de funciones de la web (composición, viajes, ajustes de múltiplos, catálogo).
3. Importar el respaldo de la app web (datos + fotos).
4. Sincronización con la nube (Supabase) y pantalla de conflictos.
5. Compilar e instalar por TestFlight.
6. IA (facturas, etiquetas), PDF, Excel y escáner en vivo.

## Probar en el iPhone

### Opción rápida: Expo Go (sin cuenta de Apple)
Requiere una computadora con Node.js: `npm install` y luego `npx expo start`, y escanear el QR con la app **Expo Go**.

### Instalar la app real (TestFlight)
1. En **expo.dev** → Account settings → **Access tokens** → crear token.
2. En GitHub, este repositorio → **Settings → Secrets and variables → Actions → New repository secret**:
   nombre `EXPO_TOKEN`, valor el token.
3. La primera vez hay que vincular el proyecto con Expo y Apple (`eas init` y `eas credentials`); se hace una sola vez con guía.
4. GitHub → pestaña **Actions** → **iOS a TestFlight** → **Run workflow**.

## Desarrollo
```bash
npm install
npx expo start      # servidor de desarrollo
npx tsc --noEmit    # verificación de tipos
```

## Actualización automática

- **Cambios de pantallas o cálculos** (código de la app): al subir a `main`, GitHub Actions
  lanza `.eas/workflows/publicar.yml`, que envía una actualización por internet (EAS Update).
  La app la descarga al abrir o al volver a primer plano y ofrece "Actualizar ahora".
- **Cambios nativos** (permisos, librerías nativas, ícono): la huella nativa cambia, así que el
  flujo compila una versión nueva y la envía a TestFlight. Con "Actualizaciones automáticas"
  activadas en la app TestFlight, el iPhone la instala solo.
- La publicación automática está en pausa hasta que exista `.eas/activo`, que se crea después de
  la primera compilación manual (`eas build --platform ios --profile production --auto-submit`).
