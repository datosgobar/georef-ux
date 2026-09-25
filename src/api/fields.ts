// Metadatos de cada recurso para el RequestBuilder: nombre amigable,
// descripción, campos base vs. avanzados y texto de ayuda por campo.
// Pensado para que un usuario sin conocer la API entienda qué hace cada cosa.

import type { GeorefResource } from './types'

export type FieldControl = 'text' | 'number' | 'checkbox' | 'select'

export interface FieldDef {
  name: string
  label: string
  help: string
  placeholder?: string
  control?: FieldControl // por defecto 'text'
  options?: { value: string; label: string }[] // para control 'select'
}

export interface ResourceForm {
  label: string // nombre amigable en el selector
  description: string // qué devuelve el recurso
  base: FieldDef[] // se muestran siempre
  advanced: FieldDef[] // detrás de "Opciones avanzadas"
}

// --- Campos reutilizables ---------------------------------------------------

const nombre: FieldDef = {
  name: 'nombre',
  label: 'Nombre',
  placeholder: 'Ej. Córdoba',
  help: 'Texto a buscar. Por defecto la búsqueda es parcial e ignora mayúsculas y acentos.',
}
const provincia: FieldDef = {
  name: 'provincia',
  label: 'Provincia',
  placeholder: 'Nombre o ID (ej. 14)',
  help: 'Limita los resultados a una provincia. Acepta el nombre o el ID de 2 dígitos.',
}
const departamento: FieldDef = {
  name: 'departamento',
  label: 'Departamento',
  placeholder: 'Nombre o ID',
  help: 'Limita los resultados a un departamento, partido o comuna. Nombre o ID.',
}
const localidadCensal: FieldDef = {
  name: 'localidad_censal',
  label: 'Localidad censal',
  placeholder: 'Nombre o ID',
  help: 'Limita a una localidad censal (unidad definida por el INDEC). Nombre o ID.',
}
const gestion: FieldDef = {
  name: 'gestion',
  label: 'Gestión',
  control: 'select',
  options: [
    { value: '', label: '(todas)' },
    { value: 'Estatal', label: 'Estatal' },
    { value: 'Privado', label: 'Privado' },
    { value: 'Internacional', label: 'Internacional' },
  ],
  help: 'Tipo de gestión. "Internacional" aplica solo a instituciones universitarias.',
}
const max: FieldDef = {
  name: 'max',
  label: 'Máx. resultados',
  placeholder: '10',
  control: 'number',
  help: 'Cuántos resultados traer como máximo. Si lo dejás vacío, la API usa 10.',
}

// Avanzados comunes a los recursos de listado.
const id: FieldDef = {
  name: 'id',
  label: 'ID exacto',
  placeholder: 'Ej. 14 (uno o varios con coma)',
  help: 'Devuelve la entidad con ese ID. Podés pasar varios IDs separados por coma.',
}
const inicio: FieldDef = {
  name: 'inicio',
  label: 'Inicio (paginado)',
  placeholder: '0',
  control: 'number',
  help: 'Saltea los primeros N resultados. Combinado con "Máx." sirve para paginar.',
}
const exacto: FieldDef = {
  name: 'exacto',
  label: 'Coincidencia exacta del nombre',
  control: 'checkbox',
  help: 'Si lo activás, el nombre debe coincidir exactamente (sin búsqueda parcial).',
}
const orden: FieldDef = {
  name: 'orden',
  label: 'Ordenar por',
  control: 'select',
  options: [
    { value: '', label: '(por defecto)' },
    { value: 'id', label: 'ID' },
    { value: 'nombre', label: 'Nombre' },
  ],
  help: 'Campo por el cual ordenar los resultados.',
}
const campos: FieldDef = {
  name: 'campos',
  label: 'Campos a incluir',
  placeholder: 'Ej. id,nombre,centroide',
  help: 'Lista de campos separados por coma. Para subcampos usá punto (ej. provincia.id).',
}
const aplanar: FieldDef = {
  name: 'aplanar',
  label: 'Aplanar respuesta',
  control: 'checkbox',
  help: 'Devuelve los objetos anidados como campos planos (ej. provincia_nombre).',
}

// Bloque avanzado estándar para los recursos de listado.
const LIST_ADVANCED: FieldDef[] = [id, inicio, exacto, orden, campos, aplanar]

// Recursos cuya base completa publica Georef para descarga (todo el país).
// gobiernos-locales y los censales no tienen dump (404); direcciones/ubicacion
// son operaciones, no entidades descargables.
export const DOWNLOADABLE: GeorefResource[] = [
  'provincias',
  'departamentos',
  'municipios',
  'localidades',
  'localidades-censales',
  'asentamientos',
  'calles',
]

// Georef publica estos formatos (no publica SHP).
export const DOWNLOAD_FORMATS = ['csv', 'json', 'geojson', 'ndjson'] as const

export const DUMP_BASE_URL = 'https://apis.datos.gob.ar/georef/api'

// Campo específico de radios censales.
const fraccionCensal: FieldDef = {
  name: 'fraccion_censal',
  label: 'Fracción censal',
  placeholder: 'ID de fracción',
  help: 'Limita los resultados a una fracción censal, por su ID.',
}

// Los recursos censales se identifican por territorio/ID (no tienen nombre).
const CENSUS_ADVANCED: FieldDef[] = [departamento, id, inicio, campos, aplanar]

// --- Formularios por recurso ------------------------------------------------

export const FIELDS_BY_RESOURCE: Record<GeorefResource, ResourceForm> = {
  provincias: {
    label: 'Provincias',
    description: 'Las 24 provincias del país (incluye CABA).',
    base: [nombre, max],
    advanced: LIST_ADVANCED,
  },
  departamentos: {
    label: 'Departamentos',
    description: 'Departamentos, partidos (Buenos Aires) y comunas (CABA).',
    base: [nombre, provincia, max],
    advanced: LIST_ADVANCED,
  },
  municipios: {
    label: 'Municipios',
    description: 'Municipios del país.',
    base: [nombre, provincia, max],
    advanced: [departamento, ...LIST_ADVANCED],
  },
  'gobiernos-locales': {
    label: 'Gobiernos locales',
    description: 'Municipios, comunas y comisiones de fomento.',
    base: [nombre, provincia, max],
    advanced: [departamento, ...LIST_ADVANCED],
  },
  localidades: {
    label: 'Localidades',
    description: 'Localidades: entidades de población con nombre.',
    base: [nombre, provincia, max],
    advanced: [departamento, localidadCensal, ...LIST_ADVANCED],
  },
  'localidades-censales': {
    label: 'Localidades censales',
    description: 'Localidades censales definidas por el INDEC.',
    base: [nombre, provincia, max],
    advanced: [departamento, ...LIST_ADVANCED],
  },
  'fracciones-censales': {
    label: 'Fracciones censales',
    description: 'Fracciones censales del INDEC (agrupan radios censales).',
    base: [provincia, max],
    advanced: CENSUS_ADVANCED,
  },
  'radios-censales': {
    label: 'Radios censales',
    description: 'Radios censales del INDEC: la unidad estadística más pequeña.',
    base: [provincia, max],
    advanced: [departamento, fraccionCensal, id, inicio, campos, aplanar],
  },
  asentamientos: {
    label: 'Asentamientos',
    description: 'Asentamientos y parajes (base BAHRA).',
    base: [nombre, provincia, max],
    advanced: [departamento, localidadCensal, ...LIST_ADVANCED],
  },
  aglomerados: {
    label: 'Aglomerados',
    description: 'Aglomerados urbanos (manchas urbanas que agrupan localidades).',
    base: [nombre, max],
    advanced: LIST_ADVANCED,
  },
  'establecimientos-educativos': {
    label: 'Establecimientos educativos',
    description:
      'Escuelas y establecimientos educativos del país (datos del Ministerio de Educación).',
    base: [nombre, provincia, max],
    advanced: [departamento, gestion, ...LIST_ADVANCED],
  },
  'instituciones-universitarias': {
    label: 'Instituciones universitarias',
    description: 'Sedes de universidades e institutos universitarios.',
    base: [nombre, provincia, max],
    advanced: [departamento, gestion, ...LIST_ADVANCED],
  },
  calles: {
    label: 'Calles',
    description: 'Vías de circulación: calles, avenidas y rutas.',
    base: [
      { ...nombre, label: 'Nombre de calle', placeholder: 'Ej. San Martín' },
      provincia,
      max,
    ],
    advanced: [departamento, localidadCensal, ...LIST_ADVANCED],
  },
  direcciones: {
    label: 'Direcciones (normalizar)',
    description:
      'Normaliza una dirección escrita y, cuando puede, la georreferencia (devuelve lat/lon).',
    base: [
      {
        name: 'direccion',
        label: 'Dirección',
        placeholder: 'Ej. Av. Rivadavia 1234',
        help: 'Calle y altura a normalizar. La altura (el número) es obligatoria.',
      },
      provincia,
    ],
    advanced: [
      departamento,
      localidadCensal,
      {
        name: 'localidad',
        label: 'Localidad',
        placeholder: 'Nombre o ID',
        help: 'Limita la búsqueda a una localidad. Nombre o ID.',
      },
      {
        ...max,
        help: 'Máximo de direcciones candidatas. Este recurso admite hasta 10.',
      },
      campos,
      aplanar,
    ],
  },
  ubicacion: {
    label: 'Ubicación (georref. inversa)',
    description:
      'A partir de una coordenada, devuelve las unidades territoriales que la contienen (provincia, departamento, etc.).',
    base: [
      {
        name: 'lat',
        label: 'Latitud',
        placeholder: '-34.6',
        control: 'number',
        help: 'Latitud en grados decimales (WGS84). En Argentina es negativa.',
      },
      {
        name: 'lon',
        label: 'Longitud',
        placeholder: '-58.4',
        control: 'number',
        help: 'Longitud en grados decimales (WGS84). En Argentina es negativa.',
      },
    ],
    advanced: [campos, aplanar],
  },
}

// Categorías que se muestran como solapas en la parte superior del explorador.
// El nombre de cada solapa está pensado para un usuario no técnico.
export interface ResourceCategory {
  key: string
  label: string
  description: string
  resources: GeorefResource[]
}

export const CATEGORIES: ResourceCategory[] = [
  {
    key: 'territorio',
    label: 'Territorio',
    description:
      'Unidades territoriales del país: provincias, departamentos, municipios, gobiernos locales, localidades y asentamientos.',
    resources: [
      'provincias',
      'departamentos',
      'municipios',
      'gobiernos-locales',
      'localidades',
      'asentamientos',
      'aglomerados',
    ],
  },
  {
    key: 'direcciones',
    label: 'Calles y direcciones',
    description:
      'Buscá vías de circulación o escribí una dirección con altura para normalizarla y ubicarla.',
    resources: ['calles', 'direcciones'],
  },
  {
    key: 'censo',
    label: 'Datos censales',
    description:
      'Unidades estadísticas del INDEC: localidades, fracciones y radios censales.',
    resources: [
      'localidades-censales',
      'fracciones-censales',
      'radios-censales',
    ],
  },
  {
    key: 'educacion',
    label: 'Educación',
    description:
      'Establecimientos educativos y sedes universitarias del país, con su gestión (estatal/privada).',
    resources: ['establecimientos-educativos', 'instituciones-universitarias'],
  },
  {
    key: 'inversa',
    label: 'Georref. inversa',
    description:
      'A partir de una coordenada (lat/lon) obtené las unidades territoriales que la contienen.',
    resources: ['ubicacion'],
  },
]
