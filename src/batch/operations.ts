// Operaciones de carga en lote: qué se puede normalizar/georreferenciar a partir
// de un archivo. Cada operación define el endpoint, los campos de entrada
// mapeables (columna del archivo o valor fijo) y el catálogo de campos de salida
// (los que devuelve el modelo de pygeorefar) que el usuario puede elegir incluir.

import type { GeorefResource } from '../api/types'

export interface BatchField {
  name: string
  label: string
  required: boolean
  /** Permite mapear un valor fijo (además de una columna). Solo para opcionales. */
  allowFixed: boolean
  /** Se serializa como número (lat/lon). Acepta coma o punto decimal. */
  numeric?: boolean
  help: string
}

/** Campo de salida elegible: ruta en el modelo (ej. `provincia.nombre`) y etiqueta. */
export interface OutputField {
  path: string
  label: string
}

export interface BatchOperation {
  key: string
  label: string
  description: string
  /** Si está, el usuario elige la entidad; si no, el endpoint es fijo. */
  endpoints?: { value: GeorefResource; label: string }[]
  endpoint?: GeorefResource
  /** Campos de entrada (mapeo columna→consulta). */
  fields: BatchField[]
  /** Campos de salida disponibles (del modelo de pygeorefar). */
  availableFields: OutputField[]
  /** Campos de salida marcados por defecto. */
  defaultFields: string[]
}

/** Columna de salida `georef_<campo>` para una ruta del modelo. */
export function outputColumn(path: string): string {
  return 'georef_' + path.replace(/\./g, '_')
}

/** Columnas de salida (con georef_match adelante) para los campos elegidos. */
export function outputColumns(fields: string[]): string[] {
  return ['georef_match', ...fields.map(outputColumn)]
}

// --- Catálogos de campos de salida por modelo -------------------------------

const DIRECCIONES_FIELDS: OutputField[] = [
  { path: 'nomenclatura', label: 'Nomenclatura' },
  { path: 'ubicacion.lat', label: 'Latitud' },
  { path: 'ubicacion.lon', label: 'Longitud' },
  { path: 'calle.nombre', label: 'Calle' },
  { path: 'altura.valor', label: 'Altura' },
  { path: 'provincia.nombre', label: 'Provincia' },
  { path: 'provincia.id', label: 'Provincia (id)' },
  { path: 'departamento.nombre', label: 'Departamento' },
  { path: 'departamento.id', label: 'Departamento (id)' },
  { path: 'localidad_censal.nombre', label: 'Localidad censal' },
  { path: 'piso', label: 'Piso' },
]
const DIRECCIONES_DEFAULT = [
  'nomenclatura',
  'ubicacion.lat',
  'ubicacion.lon',
  'calle.nombre',
  'altura.valor',
  'provincia.nombre',
  'departamento.nombre',
  'localidad_censal.nombre',
]

const UBICACION_FIELDS: OutputField[] = [
  { path: 'provincia.nombre', label: 'Provincia' },
  { path: 'provincia.id', label: 'Provincia (id)' },
  { path: 'departamento.nombre', label: 'Departamento' },
  { path: 'departamento.id', label: 'Departamento (id)' },
  { path: 'gobierno_local.nombre', label: 'Gobierno local' },
  { path: 'gobierno_local.id', label: 'Gobierno local (id)' },
  { path: 'lat', label: 'Latitud' },
  { path: 'lon', label: 'Longitud' },
]
const UBICACION_DEFAULT = [
  'provincia.nombre',
  'departamento.nombre',
  'gobierno_local.nombre', // v2.1 devuelve gobierno_local, no municipio
]

const TERRITORIAL_FIELDS: OutputField[] = [
  { path: 'id', label: 'ID oficial' },
  { path: 'nombre', label: 'Nombre oficial' },
  { path: 'centroide.lat', label: 'Latitud (centroide)' },
  { path: 'centroide.lon', label: 'Longitud (centroide)' },
  { path: 'provincia.nombre', label: 'Provincia' },
  { path: 'departamento.nombre', label: 'Departamento' },
  { path: 'categoria', label: 'Categoría' },
]
const TERRITORIAL_DEFAULT = [
  'id',
  'nombre',
  'provincia.nombre',
  'departamento.nombre',
  'centroide.lat',
  'centroide.lon',
]

export const OPERATIONS: BatchOperation[] = [
  {
    key: 'direcciones',
    label: 'Normalizar direcciones',
    description:
      'Cada fila tiene una dirección escrita (calle y altura). Se normaliza y se georreferencia (lat/lon + unidades territoriales).',
    endpoint: 'direcciones',
    fields: [
      {
        name: 'direccion',
        label: 'Dirección',
        required: true,
        allowFixed: false,
        help: 'Columna con la calle y la altura (ej. "Av. Rivadavia 1234").',
      },
      {
        name: 'provincia',
        label: 'Provincia',
        required: false,
        allowFixed: true,
        help: 'Acota la búsqueda. Columna del archivo o un valor fijo (nombre o id).',
      },
      {
        name: 'departamento',
        label: 'Departamento',
        required: false,
        allowFixed: true,
        help: 'Opcional. Columna o valor fijo.',
      },
      {
        name: 'localidad_censal',
        label: 'Localidad censal',
        required: false,
        allowFixed: true,
        help: 'Opcional. Columna o valor fijo.',
      },
    ],
    availableFields: DIRECCIONES_FIELDS,
    defaultFields: DIRECCIONES_DEFAULT,
  },
  {
    key: 'ubicacion',
    label: 'Georreferencia inversa (coordenadas → unidades)',
    description:
      'Cada fila tiene latitud y longitud. Se devuelven las unidades territoriales que contienen ese punto.',
    endpoint: 'ubicacion',
    fields: [
      {
        name: 'lat',
        label: 'Latitud',
        required: true,
        allowFixed: false,
        numeric: true,
        help: 'Columna con la latitud en grados decimales (negativa en Argentina).',
      },
      {
        name: 'lon',
        label: 'Longitud',
        required: true,
        allowFixed: false,
        numeric: true,
        help: 'Columna con la longitud en grados decimales (negativa en Argentina).',
      },
    ],
    availableFields: UBICACION_FIELDS,
    defaultFields: UBICACION_DEFAULT,
  },
  {
    key: 'territorial',
    label: 'Normalizar nombres de unidades territoriales',
    description:
      'Cada fila tiene el nombre de una unidad (provincia, departamento, municipio o localidad). Se devuelve el id y el nombre oficial.',
    endpoints: [
      { value: 'provincias', label: 'Provincias' },
      { value: 'departamentos', label: 'Departamentos' },
      { value: 'municipios', label: 'Municipios' },
      { value: 'localidades', label: 'Localidades' },
    ],
    fields: [
      {
        name: 'nombre',
        label: 'Nombre',
        required: true,
        allowFixed: false,
        help: 'Columna con el nombre a normalizar (ej. "cordoba", "sant fe").',
      },
      {
        name: 'provincia',
        label: 'Provincia',
        required: false,
        allowFixed: true,
        help: 'Acota por provincia (no aplica a Provincias). Columna o valor fijo.',
      },
    ],
    availableFields: TERRITORIAL_FIELDS,
    defaultFields: TERRITORIAL_DEFAULT,
  },
]
