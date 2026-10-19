import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';

/*
 * Mantiene la app en la última versión publicada.
 * Al abrir la app y cada vez que vuelve a primer plano revisa si hay una
 * actualización; si la hay, la descarga y ofrece aplicarla en ese momento.
 * (Si se elige "Después", se aplica sola la próxima vez que se abra la app.)
 */
export function useActualizaciones() {
  const revisando = useRef(false);
  const ultima = useRef(0);
  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;
    const revisar = async () => {
      if (revisando.current || Date.now() - ultima.current < 60_000) return;
      revisando.current = true;
      ultima.current = Date.now();
      try {
        const r = await Updates.checkForUpdateAsync();
        if (!r.isAvailable) return;
        const f = await Updates.fetchUpdateAsync();
        if (!f.isNew) return;
        Alert.alert('Nueva versión lista', 'Se descargó una actualización de la app. Tus datos no se tocan.', [
          { text: 'Después', style: 'cancel' },
          { text: 'Actualizar ahora', onPress: () => Updates.reloadAsync() },
        ]);
      } catch {
        /* sin internet: se reintenta luego */
      } finally {
        revisando.current = false;
      }
    };
    revisar();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && revisar());
    return () => sub.remove();
  }, []);
}
