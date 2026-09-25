import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Coord, GeorefEntity, GeorefResource } from '../api/types'
import { fetchBoundaries, supportsBoundaries } from '../api/boundaries'

// Punto de resultado con los colores de Datos Abiertos: navy y violeta.
const PUNTO: L.CircleMarkerOptions = {
  radius: 7,
  color: '#232d4f',
  weight: 2,
  fillColor: '#b369ed',
  fillOpacity: 1,
}

/**
 * Encuadre sin la Antártida: el centroide de Tierra del Fuego cae ahí y, si se
 * incluye, el continente queda diminuto. Solo se recorta cuando hay algo más al norte.
 */
function sinAntartida(b: L.LatLngBounds): L.LatLngBounds {
  const LIMITE = -56
  if (b.getSouth() >= LIMITE || b.getNorth() < LIMITE) return b
  return L.latLngBounds([LIMITE, b.getWest()], [b.getNorth(), b.getEast()])
}

// Centro aproximado de Argentina (vista inicial).
const ARGENTINA_CENTER: L.LatLngExpression = [-38.4, -63.6]

function coordOf(e: GeorefEntity): Coord | null {
  // `ubicacion` (georref inversa) trae lat/lon en el nivel superior;
  // direcciones bajo `ubicacion`; el resto bajo `centroide`.
  const c =
    e.ubicacion ??
    e.centroide ??
    (typeof e.lat === 'number' && typeof e.lon === 'number'
      ? { lat: e.lat, lon: e.lon }
      : undefined)
  if (c && typeof c.lat === 'number' && typeof c.lon === 'number') return c
  return null
}

function esc(value: unknown): string {
  return String(value).replace(
    /[&<>"]/g,
    (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] ?? ch,
  )
}

/** Popup con el detalle de la entidad: título + unidades territoriales y datos. */
function popupHtml(e: GeorefEntity): string {
  const title =
    (e.nombre as string) ||
    (e.nomenclatura as string) ||
    e.gobierno_local?.nombre ||
    e.municipio?.nombre ||
    e.departamento?.nombre ||
    e.provincia?.nombre ||
    (e.id ? `ID ${e.id}` : 'Resultado')

  const rows: [string, string][] = []
  const add = (label: string, val?: string | null) => {
    if (val && val !== title) rows.push([label, val])
  }

  add('Provincia', e.provincia?.nombre)
  add('Departamento', e.departamento?.nombre)
  add('Municipio', e.municipio?.nombre)
  add('Gobierno local', e.gobierno_local?.nombre)
  add('Localidad censal', e.localidad_censal?.nombre)
  add('Calle', e.calle?.nombre)
  add('Categoría', typeof e.categoria === 'string' ? e.categoria : undefined)
  if (e.id) add('ID', String(e.id))
  const c = coordOf(e)
  if (c) add('Coordenadas', `${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}`)

  const body = rows
    .map(
      ([k, v]) =>
        `<div class="gx-popup__row"><span>${esc(k)}</span><b>${esc(v)}</b></div>`,
    )
    .join('')
  return `<div class="gx-popup"><div class="gx-popup__title">${esc(title)}</div>${body}</div>`
}

interface Props {
  entities: GeorefEntity[]
  resource: GeorefResource | null
  showBoundaries: boolean
}

export function MapView({ entities, resource, showBoundaries }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layerRef = useRef<L.LayerGroup | null>(null)
  const boundaryRef = useRef<L.GeoJSON | null>(null)

  // Inicialización del mapa (una vez).
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    // Zoom fraccionario: el país entra ajustado en el encuadre en vez de saltar de a un nivel.
    const map = L.map(containerRef.current, { zoomSnap: 0.25 }).setView(ARGENTINA_CENTER, 4)

    // Basemap IGN Argenmap (capa base oficial de Argentina).
    L.tileLayer(
      'https://wms.ign.gob.ar/geoserver/gwc/service/tms/1.0.0/capabaseargenmap@EPSG:3857@png/{z}/{x}/{-y}.png',
      {
        attribution:
          'Instituto Geográfico Nacional (IGN) · capa Argenmap',
        maxZoom: 18,
        tms: true,
      },
    ).addTo(map)

    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    // Reencuadrar el mapa cuando el contenedor cambia de tamaño (el panel se
    // estira al alto de la columna y puede crecer al abrir opciones avanzadas).
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  // Actualización de marcadores cuando cambian los resultados.
  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return

    layer.clearLayers()
    const points: L.LatLngExpression[] = []

    for (const e of entities) {
      const c = coordOf(e)
      if (!c) continue
      const latlng: L.LatLngExpression = [c.lat, c.lon]
      points.push(latlng)
      L.circleMarker(latlng, PUNTO)
        .bindPopup(popupHtml(e), { maxWidth: 280 })
        .addTo(layer)
    }

    if (points.length > 0) {
      map.fitBounds(sinAntartida(L.latLngBounds(points)), {
        padding: [30, 30],
        maxZoom: 13,
      })
    }
  }, [entities])

  // Límites (polígonos) del IGN para los recursos soportados.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (boundaryRef.current) {
      boundaryRef.current.remove()
      boundaryRef.current = null
    }
    if (!showBoundaries || !resource || !supportsBoundaries(resource)) return

    const ids = entities
      .map((e) => e.id)
      .filter((id): id is string => typeof id === 'string' && id !== '')
      .slice(0, 200)
    if (ids.length === 0) return

    let cancelled = false
    fetchBoundaries(resource, ids)
      .then((fc) => {
        if (cancelled || !fc || !mapRef.current) return
        const layer = L.geoJSON(fc, {
          style: {
            color: '#393793',
            weight: 2,
            fillColor: '#b369ed',
            fillOpacity: 0.12,
          },
        }).addTo(map)
        boundaryRef.current = layer
        try {
          map.fitBounds(sinAntartida(layer.getBounds()), { padding: [30, 30] })
        } catch {
          /* sin bounds válidos */
        }
      })
      .catch(() => {
        /* si el IGN falla, el mapa sigue mostrando los centroides */
      })

    return () => {
      cancelled = true
    }
  }, [entities, resource, showBoundaries])

  return <div ref={containerRef} className="map-view" />
}
