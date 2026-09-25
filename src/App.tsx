import { Suspense, lazy, useState } from 'react'
import { RequestBuilder } from './components/RequestBuilder'
import { ResultsPanel } from './components/ResultsPanel'
import { MapView } from './components/MapView'
import { useGeorefQuery } from './hooks/useGeorefQuery'
import { supportsBoundaries } from './api/boundaries'
import georefMark from './assets/georef-mark.png'
import sicytLogo from './assets/secretaria-innovacion-blanco.png'
import './styles.css'

type View = 'explorer' | 'batch'

// Carga diferida: papaparse/xlsx no deben pesar en el bundle inicial del
// explorador, que es la vista por defecto.
const BatchGeocoder = lazy(() =>
  import('./components/BatchGeocoder').then((m) => ({
    default: m.BatchGeocoder,
  })),
)

/** Marca oficial de Georef: el pin con tres puntos (sin el wordmark). */
function Logo() {
  return <img className="brand-logo" src={georefMark} alt="Georef" />
}

export default function App() {
  const query = useGeorefQuery()
  const [view, setView] = useState<View>('explorer')
  const [showBoundaries, setShowBoundaries] = useState(false)
  const canDrawBoundaries = supportsBoundaries(query.resource)

  return (
    <div className="app">
      <header className="app-header">
        <div className="container header-inner">
          <div className="header-left">
            <div className="header-brand">
              <Logo />
              <h1>georef-ux</h1>
            </div>
            <p className="app-subtitle">
              Explorá y normalizá datos geográficos del Estado argentino con la{' '}
              <a
                href="https://www.argentina.gob.ar/georef"
                target="_blank"
                rel="noreferrer"
              >
                API Georef v2
              </a>
              , sin escribir código.
            </p>
          </div>
          <div className="header-meta">
            <div>
              <strong>Dirección de Datos Abiertos</strong>
              <span className="meta-sub">
                Secretaría de Innovación, Ciencia y Tecnología
              </span>
            </div>
            <a
              className="pill-link"
              href="https://www.argentina.gob.ar/georef"
              target="_blank"
              rel="noreferrer"
            >
              Referencia de la API
            </a>
          </div>
        </div>
      </header>

      <nav className="view-nav">
        <div className="container">
          <div className="view-switch">
            <button
              type="button"
              className={view === 'explorer' ? 'is-active' : ''}
              onClick={() => setView('explorer')}
            >
              Explorador
            </button>
            <button
              type="button"
              className={view === 'batch' ? 'is-active' : ''}
              onClick={() => setView('batch')}
            >
              Carga en lote
            </button>
          </div>
        </div>
      </nav>

      {view === 'explorer' ? (
        <main className="container app-main">
          <section className="panel panel-builder">
            <div className="panel-head">
              <span className="dot">1</span>
              <div>
                <h2 className="panel-title">Armá tu consulta</h2>
                <p className="panel-sub">Elegí un tema y completá los campos</p>
              </div>
            </div>
            <RequestBuilder loading={query.loading} onSubmit={query.run} />
          </section>

          <section className="panel panel-map">
            <div className="panel-head">
              <span className="dot">2</span>
              <div>
                <h2 className="panel-title">Mapa</h2>
                <p className="panel-sub">
                  Los resultados con coordenadas aparecen acá
                </p>
              </div>
            </div>
            <label className="map-toggle">
              <input
                type="checkbox"
                checked={showBoundaries}
                disabled={!canDrawBoundaries}
                onChange={(e) => setShowBoundaries(e.target.checked)}
              />
              <span>
                Mostrar límites (polígonos)
                {query.resource && !canDrawBoundaries && (
                  <span className="map-toggle__note">
                    {' '}
                    — no disponibles para este recurso; se muestran los puntos
                  </span>
                )}
              </span>
            </label>
            <MapView
              entities={query.entities}
              resource={query.resource}
              showBoundaries={showBoundaries}
            />
          </section>

          <section className="panel panel-results">
            <div className="panel-head">
              <span className="dot">3</span>
              <div>
                <h2 className="panel-title">Resultados</h2>
                <p className="panel-sub">Lo que devolvió la API</p>
              </div>
            </div>
            <ResultsPanel
              loading={query.loading}
              error={query.error}
              response={query.response}
              entities={query.entities}
            />
          </section>
        </main>
      ) : (
        <main className="container app-main-single">
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2 className="panel-title">Carga en lote (CSV o Excel)</h2>
                <p className="panel-sub">
                  Normalizá o georreferenciá una base entera: direcciones,
                  coordenadas o nombres de unidades
                </p>
              </div>
            </div>
            <Suspense fallback={<p className="results-status">Cargando…</p>}>
              <BatchGeocoder />
            </Suspense>
          </section>
        </main>
      )}

      <footer className="app-footer">
        <div className="container footer-inner">
          <span className="footer-credit">
            <span className="glyph-mini" aria-hidden="true">
              <span
                className="gm"
                style={{ background: 'var(--lilac-100)' }}
              ></span>
              <span
                className="gm"
                style={{ background: 'var(--violet-300)' }}
              ></span>
              <span
                className="gm"
                style={{ background: 'var(--violet-500)' }}
              ></span>
            </span>
            <span>
              Datos:{' '}
              <a
                href="https://datos.gob.ar/dataset/jgm-servicio-normalizacion-direcciones-unidades-territoriales-argentina"
                target="_blank"
                rel="noreferrer"
              >
                Servicio de normalización de direcciones y unidades
                territoriales de la República Argentina
              </a>
              , publicado en datos.gob.ar (Datos Argentina).
              <br />
              Contacto:{' '}
              <a href="mailto:datosargentina@sicyt.gob.ar">
                datosargentina@sicyt.gob.ar
              </a>
              <br />
              Hecho con datos abiertos · CC BY 4.0
            </span>
          </span>
          <img
            className="footer-logo"
            src={sicytLogo}
            alt="Secretaría de Innovación, Ciencia y Tecnología — Jefatura de Gabinete de Ministros"
          />
        </div>
      </footer>
    </div>
  )
}
