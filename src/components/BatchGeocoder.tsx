import { useEffect, useMemo, useState } from 'react'
import { useBatchGeocode } from '../hooks/useBatchGeocode'
import { downloadCsv, type FieldSource, type Mapping } from '../batch/geocode'
import { OPERATIONS, type BatchField } from '../batch/operations'
import type { GeorefResource } from '../api/types'

const PREVIEW_ROWS = 20

// Heurísticas para autoseleccionar columnas según el nombre del campo.
const GUESS: Record<string, RegExp> = {
  direccion: /direcc|domic|calle|address/i,
  lat: /(^|[_\s])lat/i,
  lon: /(^|[_\s])(lon|lng)/i,
  nombre: /nombre|^name/i,
  provincia: /prov/i,
  departamento: /depto|departamento|partido/i,
  localidad_censal: /localidad|^loc/i,
}

function guessColumn(fieldName: string, columns: string[]): string {
  const re = GUESS[fieldName]
  return re ? (columns.find((c) => re.test(c)) ?? '') : ''
}

/** Mapeo inicial: requeridos → columna adivinada (o la primera); opcionales → columna si coincide. */
function initMapping(fields: BatchField[], columns: string[]): Mapping {
  const mapping: Mapping = {}
  for (const f of fields) {
    const guess = guessColumn(f.name, columns)
    if (f.required) {
      mapping[f.name] = { mode: 'column', value: guess || columns[0] || '' }
    } else {
      mapping[f.name] = guess
        ? { mode: 'column', value: guess }
        : { mode: 'none', value: '' }
    }
  }
  return mapping
}

function MappingField({
  field,
  source,
  columns,
  onChange,
}: {
  field: BatchField
  source: FieldSource
  columns: string[]
  onChange: (s: FieldSource) => void
}) {
  const selectVal =
    source.mode === 'column'
      ? `col:${source.value}`
      : source.mode === 'fixed'
        ? '__fixed__'
        : '__none__'

  function onSelect(val: string) {
    if (val === '__none__') onChange({ mode: 'none', value: '' })
    else if (val === '__fixed__') onChange({ mode: 'fixed', value: source.value })
    else onChange({ mode: 'column', value: val.slice(4) })
  }

  return (
    <div className="form-group">
      <label className="field-label">
        {field.label}
        {field.required && <span className="req"> *</span>}
      </label>
      <select
        className="form-control"
        value={selectVal}
        onChange={(e) => onSelect(e.target.value)}
      >
        {!field.required && <option value="__none__">— ninguno —</option>}
        <optgroup label="Columna del archivo">
          {columns.map((c) => (
            <option key={c} value={`col:${c}`}>
              {c}
            </option>
          ))}
        </optgroup>
        {field.allowFixed && <option value="__fixed__">Valor fijo…</option>}
      </select>
      {source.mode === 'fixed' && (
        <input
          className="form-control mapping-fixed"
          placeholder="Valor aplicado a todas las filas"
          value={source.value}
          onChange={(e) => onChange({ mode: 'fixed', value: e.target.value })}
        />
      )}
      <p className="field-help">{field.help}</p>
    </div>
  )
}

export function BatchGeocoder() {
  const batch = useBatchGeocode()
  const [operationKey, setOperationKey] = useState(OPERATIONS[0].key)
  const [endpoint, setEndpoint] = useState<GeorefResource>('direcciones')
  const [mapping, setMapping] = useState<Mapping>({})
  const [fields, setFields] = useState<string[]>(OPERATIONS[0].defaultFields)

  const operation = OPERATIONS.find((o) => o.key === operationKey)!
  const columns = batch.data?.fields ?? []
  const effectiveEndpoint = operation.endpoint ?? endpoint

  // Al cambiar de operación o de CSV, fijar el endpoint y rehacer el mapeo.
  useEffect(() => {
    if (operation.endpoints) setEndpoint(operation.endpoints[0].value)
    setMapping(initMapping(operation.fields, columns))
    setFields(operation.defaultFields)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operationKey, columns.join('|')])

  function setSource(name: string, source: FieldSource) {
    setMapping((m) => ({ ...m, [name]: source }))
  }

  function toggleField(path: string) {
    setFields((fs) =>
      fs.includes(path) ? fs.filter((p) => p !== path) : [...fs, path],
    )
  }

  const requiredMissing = operation.fields.some(
    (f) =>
      f.required &&
      !(mapping[f.name]?.mode === 'column' && mapping[f.name]?.value),
  )

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) batch.loadFile(file)
  }

  function handleRun(e: React.FormEvent) {
    e.preventDefault()
    if (requiredMissing) return
    batch.run({ operation, endpoint: effectiveEndpoint, mapping, fields })
  }

  const resultColumns = useMemo(() => {
    const rows = batch.result?.rows
    if (!rows || rows.length === 0) return []
    return Object.keys(rows[0])
  }, [batch.result])

  const running = batch.status === 'running'
  const pct =
    batch.progress && batch.progress.total > 0
      ? Math.round((batch.progress.done / batch.progress.total) * 100)
      : 0

  return (
    <div className="batch">
      <p className="text-muted">
        Subí un archivo CSV o Excel (.xls/.xlsx), elegí qué querés hacer y mapeá
        cada dato a una columna. La app procesa las filas en lotes contra la API y
        te devuelve un CSV con columnas <code>georef_*</code>.
      </p>

      <div className="form-group">
        <label className="field-label" htmlFor="op">
          1 · ¿Qué querés hacer?
        </label>
        <select
          id="op"
          className="form-control"
          value={operationKey}
          onChange={(e) => setOperationKey(e.target.value)}
        >
          {OPERATIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <p className="field-help">{operation.description}</p>
      </div>

      {operation.endpoints && (
        <div className="form-group">
          <label className="field-label" htmlFor="entidad">
            Tipo de unidad
          </label>
          <select
            id="entidad"
            className="form-control"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value as GeorefResource)}
          >
            {operation.endpoints.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="form-group">
        <label className="field-label" htmlFor="csv">
          2 · Archivo CSV o Excel
        </label>
        <input
          id="csv"
          type="file"
          accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="form-control"
          onChange={handleFile}
        />
      </div>

      {batch.status === 'parsing' && <p>Leyendo archivo…</p>}

      {batch.error && (
        <div className="alert-danger" role="alert">
          {batch.error}
        </div>
      )}

      {batch.data && (
        <form onSubmit={handleRun} className="batch-config">
          <p className="text-muted">
            {batch.data.rows.length} fila(s) · {columns.length} columna(s)
          </p>

          <div className="mapping-title">3 · Mapeo de columnas</div>
          {operation.fields.map((f) => (
            <MappingField
              key={f.name}
              field={f}
              source={mapping[f.name] ?? { mode: 'none', value: '' }}
              columns={columns}
              onChange={(s) => setSource(f.name, s)}
            />
          ))}

          <div className="mapping-title">4 · Campos a incluir en el resultado</div>
          <p className="field-help">
            Columnas <code>georef_*</code> que se agregan al archivo (de los que
            devuelve la API).
          </p>
          <div className="output-fields">
            {operation.availableFields.map((of) => (
              <label key={of.path} className="output-field">
                <input
                  type="checkbox"
                  checked={fields.includes(of.path)}
                  onChange={() => toggleField(of.path)}
                />
                <span>{of.label}</span>
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={running || requiredMissing}
          >
            {running ? 'Procesando…' : 'Procesar'}
          </button>
          {requiredMissing && (
            <p className="field-help">
              Asigná una columna a los campos marcados con *.
            </p>
          )}
        </form>
      )}

      {running && batch.pyStatus && batch.pyStatus !== 'ready' && (
        <p className="text-muted batch-pystatus">
          {batch.pyStatus === 'loading-runtime'
            ? 'Inicializando el motor Python (Pyodide)… la primera vez puede tardar unos segundos.'
            : 'Instalando pygeorefar y sus dependencias…'}
        </p>
      )}

      {running && batch.progress && (
        <div className="batch-progress">
          <div className="progress">
            <div
              className="progress-bar"
              role="progressbar"
              style={{ width: `${pct}%` }}
            >
              {pct}%
            </div>
          </div>
          <small>
            {batch.progress.done} / {batch.progress.total} filas procesadas
          </small>
        </div>
      )}

      {batch.status === 'done' && batch.result && (
        <div className="batch-result">
          <div className="batch-result__meta">
            <span>
              {batch.result.matched} de {batch.result.sent} con coincidencia
              {batch.result.sent < batch.result.rows.length &&
                ` · ${batch.result.rows.length - batch.result.sent} fila(s) sin datos requeridos`}
            </span>
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={() =>
                downloadCsv(batch.result!.rows, geocodedName(batch.fileName))
              }
            >
              Descargar CSV
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {resultColumns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batch.result.rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                  <tr key={i}>
                    {resultColumns.map((c) => (
                      <td key={c}>{row[c]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {batch.result.rows.length > PREVIEW_ROWS && (
            <small className="text-muted">
              Mostrando {PREVIEW_ROWS} de {batch.result.rows.length} filas.
              Descargá el CSV para ver todo.
            </small>
          )}
        </div>
      )}
    </div>
  )
}

function geocodedName(fileName: string | null): string {
  if (!fileName) return 'georef.csv'
  return fileName.replace(/\.(csv|xls|xlsx)$/i, '') + '_georef.csv'
}
