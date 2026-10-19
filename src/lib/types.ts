// Modelo de datos. Los nombres de campos son los mismos que usa la app web,
// así un respaldo exportado de la web se importa sin transformar.

export type Moneda = 'USD' | 'RMB';

export interface Proveedor {
  id: string;
  nombre: string;
  moneda?: Moneda;
  tallaChina?: boolean;
  fMay?: number | null; // factor mayoreo
  fMen?: number | null; // factor menudeo
}

export interface ParteComposicion {
  parte: string;
  fibras: { f: string; p: number | null }[];
}

export interface Articulo {
  id: string;
  estilo: string;
  nombre: string; // tipo de prenda
  categoria?: string; // descripción
  proveedorId?: string;
  factura?: string;
  costo?: number | null; // USD
  costoOrigen?: number | null; // RMB
  moneda?: Moneda;
  tc?: number | null;
  pMay?: number | null;
  pMen?: number | null;
  colores: string[];
  tallas: string[];
  fotos: string[]; // rutas locales (file://) o URLs
  stock?: Record<string, number>; // clave "Color|Talla"
  cantidad?: number;
  pesoLb?: number | null;
  composicion?: ParteComposicion[];
  origen?: string;
  viajeId?: string | null;
  creado: number;
  ejemplo?: boolean;
}

export interface Linea {
  color: string;
  talla: string;
  cant: number;
}

export interface Movimiento {
  id: string;
  artId: string;
  estilo: string;
  proveedorId?: string;
  tipo: 'entrada' | 'venta' | 'ajuste';
  lineas: Linea[];
  total: number;
  motivo?: string;
  factura?: string;
  at: number;
}

export interface Gasto {
  id: string;
  cat: string;
  desc?: string;
  monto: number | null;
  moneda: Moneda;
  tc?: number | null;
}

export interface Viaje {
  id: string;
  nombre: string;
  desde?: string;
  hasta?: string;
  tc?: number | null;
  gastos: Gasto[];
  reparto?: 'valor' | 'pieza';
  creado: number;
}

export interface Config {
  tema?: 'auto' | 'light' | 'dark';
  tcDef?: number | null;
  multMay?: number[] | null;
  multMen?: number[] | null;
  defMay?: number | null;
  defMen?: number | null;
  envioKg?: number | null;
  segPct?: number | null;
  advPct?: number | null;
  espKg?: number | null;
  fodPct?: number | null;
  ivaPct?: number | null;
  ivaCosto?: boolean;
  otrosKg?: number | null;
  ord_arts?: string;
  ord_bod?: string;
  origenDef?: string;
  tallasDef?: string[];
  coloresDef?: string[];
  tallasExtra?: string[];
  coloresRec?: string[];
  pVista?: 'compacta' | 'detalle';
  [k: string]: unknown;
}

export type Coleccion = 'articulos' | 'proveedores' | 'movimientos' | 'viajes';
