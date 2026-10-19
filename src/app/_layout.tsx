import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { DB_NAME, migrar } from '@/lib/db';
import { StoreProvider, useStore } from '@/lib/store';
import { Paleta, useEsquema } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

function Navegacion() {
  const { listo } = useStore();
  const esquema = useEsquema();
  const c = Paleta[esquema];
  useEffect(() => {
    if (listo) SplashScreen.hideAsync();
  }, [listo]);
  const base = esquema === 'dark' ? DarkTheme : DefaultTheme;
  const tema = { ...base, colors: { ...base.colors, background: c.bg, card: c.surface, text: c.ink, border: c.line, primary: c.accent } };
  return (
    <ThemeProvider value={tema}>
      <StatusBar style={esquema === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerTintColor: c.accent, headerStyle: { backgroundColor: c.surface }, headerTitleStyle: { color: c.ink } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="articulo/[id]" options={{ title: 'Artículo', headerBackTitle: 'Atrás' }} />
        <Stack.Screen name="viaje/[id]" options={{ title: 'Viaje', headerBackTitle: 'Atrás' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DB_NAME} onInit={migrar}>
      <StoreProvider>
        <Navegacion />
      </StoreProvider>
    </SQLiteProvider>
  );
}
