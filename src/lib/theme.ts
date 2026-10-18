import { useColorScheme } from 'react-native';

import { useStore } from './store';

// Misma paleta que la app web.
export const Paleta = {
  light: {
    bg: '#EDF1EF',
    surface: '#F8FAF9',
    card: '#FFFFFF',
    ink: '#15201D',
    muted: '#5C6A65',
    line: '#D3DBD8',
    accent: '#0E7C66',
    accentInk: '#FFFFFF',
    accentSoft: '#D7ECE6',
    gold: '#9A6512',
    goldSoft: '#F5E7CF',
    danger: '#B42318',
    dangerSoft: '#FBE4E1',
  },
  dark: {
    bg: '#0E1412',
    surface: '#151D1A',
    card: '#1B2521',
    ink: '#E5EEEA',
    muted: '#93A39D',
    line: '#2A3732',
    accent: '#43C3A2',
    accentInk: '#05231C',
    accentSoft: '#16372F',
    gold: '#E3AE55',
    goldSoft: '#3A2D16',
    danger: '#F27B70',
    dangerSoft: '#3D1A17',
  },
};

export type Colores = typeof Paleta.light;

export function useEsquema(): 'light' | 'dark' {
  const sistema = useColorScheme();
  const { cfg } = useStore();
  if (cfg.tema === 'light' || cfg.tema === 'dark') return cfg.tema;
  return sistema === 'dark' ? 'dark' : 'light';
}

export function useColores(): Colores {
  return Paleta[useEsquema()];
}
