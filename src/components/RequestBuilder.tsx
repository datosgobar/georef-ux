import { useEffect, useMemo, useState } from 'react'
import { buildUrl } from '../api/georef'
import {
  CATEGORIES,
  DOWNLOADABLE,
  DOWNLOAD_FORMATS,
  DUMP_BASE_URL,
  FIELDS_BY_RESOURCE,
} from '../api/fields'
import type { FieldDef } from '../api/fields'
import { fetchCampos } from '../api/campos'
import { buildSnippets } from '../api/snippets'
import { CategoryIcon } from './CategoryIcon'
import type { GeorefResource, QueryParams } from '../api/types'

interface Props {
  loading: boolean
  onSubmit: (resource: GeorefResource, params: QueryParams) => void
}

/** Renderiza un campo según su `control`, con su texto de ayuda debajo. */
function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: string
  onChange: (value: string) => void
}) {
  const control = field.control ?? 'text'

  if (control === 'checkbox') {
    return (
      <div className="check-row">
        <input
          id={field.name}
          type="checkbox"
          checked={value === 'true'}
          onChange={(e) => onChange(e.target.checked ? 'true' : '')}
        />
        <div className="check-text">
          <label className="check-label" htmlFor={field.name}>
            {field.label}
          </label>
          <p className="field-help">{field.help}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="form-group">
      <label className="field-label" htmlFor={field.name}>
        {field.label}
      </label>
      {control === 'select' ? (
        <select
          id={field.name}
          className="form-control"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={field.name}
          className="form-control"
          type={control}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      <p className="field-help">{field.help}</p>
    </div>
  )
}

/** Selección de campos como checkboxes: descubre los disponibles por recurso. */
function CamposField({
  resource,
  value,
  onChange,
}: {
  resource: GeorefResource
  value: string
  onChange: (value: string) => void
}) {
  const [fields, setFields] = useState<string[] | null>(null)

  useEffect(() => {
    let cancelled = false
    setFields(null)
    fetchCampos(resource)
      .then((f) => !cancelled && setFields(f))
      .catch(() => !cancelled && setFields([]))
    return () => {
      cancelled = true
    }
  }, [resource])

  const selected = new Set(value ? value.split(',').filter(Boolean) : [])
  function toggle(f: string) {
    const next = new Set(selected)
    if (next.has(f)) next.delete(f)
    else next.add(f)
    onChange([...next].join(','))
  }

  if (fields === null) {
    return (
      <div className="form-group">
        <label className="field-label">Campos a incluir</label>
        <p className="field-help">Cargando campos disponibles…</p>
      </div>
    )
  }

  // Recursos sin lista (direcciones/ubicación): texto libre como respaldo.
  if (fields.length === 0) {
    return (
      <div className="form-group">
        <label className="field-label" htmlFor="campos">
          Campos a incluir
        </label>
        <input
          id="campos"
          className="form-control"
          placeholder="Ej. id,nombre"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <p className="field-help">Lista de campos separados por coma.</p>
      </div>
    )
  }

  return (
    <div className="form-group">
      <label className="field-label">Campos a incluir</label>
      <p className="field-help">
        Marcá los campos que querés en la respuesta. Si no marcás ninguno,
        vienen los predeterminados.
      </p>
      <div className="campos-grid">
        {fields.map((f) => (
          <label key={f} className="campos-check">
            <input
              type="checkbox"
              checked={selected.has(f)}
              onChange={() => toggle(f)}
            />
            <span>{f}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

/** Botones de descarga de la base completa del recurso (si Georef la publica). */
function DownloadSection({ resource }: { resource: GeorefResource }) {
  if (!DOWNLOADABLE.includes(resource)) return null
  return (
    <div className="downloads">
      <div className="downloads__title">Descargar base completa</div>
      <p className="field-help">
        Archivo oficial de <strong>{FIELDS_BY_RESOURCE[resource].label}</strong>{' '}
        (todo el país), publicado en datos.gob.ar. Georef no publica SHP.
      </p>
      <div className="downloads__btns">
        {DOWNLOAD_FORMATS.map((fmt) => (
          <a
            key={fmt}
            className="btn btn-ghost btn-sm"
            href={`${DUMP_BASE_URL}/${resource}.${fmt}`}
            target="_blank"
            rel="noreferrer"
          >
            {fmt.toUpperCase()}
          </a>
        ))}
      </div>
    </div>
  )
}

/** Bloque colapsable con el código equivalente en varios lenguajes. */
function CodeSnippets({
  resource,
  params,
}: {
  resource: GeorefResource
  params: QueryParams
}) {
  const snippets = useMemo(
    () => buildSnippets(resource, params),
    [resource, params],
  )
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [copied, setCopied] = useState(false)

  const current = snippets[active]

  function selectTab(i: number) {
    setActive(i)
    setCopied(false)
  }

  function copy() {
    navigator.clipboard?.writeText(current.code)
    setCopied(true)
  }

  return (
    <div className="snippets">
      <button
        type="button"
        className="advanced-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="chev">{open ? '▾' : '▸'}</span> Código para reutilizar
        esta consulta
      </button>

      {open && (
        <>
          <div className="snippets-tabs" role="tablist">
            {snippets.map((s, i) => (
              <button
                key={s.label}
                type="button"
                role="tab"
                aria-selected={i === active}
                className={`snippet-tab${i === active ? ' is-active' : ''}`}
                onClick={() => selectTab(i)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <pre className="snippet-code">{current.code}</pre>
          <button type="button" className="btn btn-ghost btn-sm" onClick={copy}>
            {copied ? '¡Copiado!' : 'Copiar código'}
          </button>
        </>
      )}
    </div>
  )
}

export function RequestBuilder({ loading, onSubmit }: Props) {
  const [resource, setResource] = useState<GeorefResource>('provincias')
  const [values, setValues] = useState<QueryParams>({})
  const [showAdvanced, setShowAdvanced] = useState(false)

  const form = FIELDS_BY_RESOURCE[resource]
  const url = useMemo(() => buildUrl(resource, values), [resource, values])

  const activeCategory =
    CATEGORIES.find((c) => c.resources.includes(resource)) ?? CATEGORIES[0]

  function changeResource(next: GeorefResource) {
    setResource(next)
    setValues({}) // los params dependen del recurso
    setShowAdvanced(false)
  }

  function setField(name: string, value: string) {
    setValues((v) => ({ ...v, [name]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(resource, values)
  }

  function renderField(f: FieldDef) {
    if (f.name === 'campos') {
      return (
        <CamposField
          key="campos"
          resource={resource}
          value={values.campos ?? ''}
          onChange={(v) => setField('campos', v)}
        />
      )
    }
    return (
      <Field
        key={f.name}
        field={f}
        value={values[f.name] ?? ''}
        onChange={(v) => setField(f.name, v)}
      />
    )
  }

  return (
    <form className="request-builder" onSubmit={handleSubmit}>
      <div className="category-tabs" role="tablist">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            role="tab"
            aria-selected={cat.key === activeCategory.key}
            className={`category-tab${
              cat.key === activeCategory.key ? ' is-active' : ''
            }`}
            onClick={() => changeResource(cat.resources[0])}
          >
            <span className="tab-ico" aria-hidden="true">
              <CategoryIcon categoryKey={cat.key} />
            </span>
            {cat.label}
          </button>
        ))}
      </div>

      <div className="builder-intro">
        <span className="builder-intro__title">{activeCategory.label}</span>
        <p className="builder-intro__desc">{activeCategory.description}</p>
      </div>

      {activeCategory.resources.length > 1 && (
        <div className="form-group">
          <label className="field-label" htmlFor="resource">
            ¿Qué querés consultar?
          </label>
          <select
            id="resource"
            className="form-control"
            value={resource}
            onChange={(e) => changeResource(e.target.value as GeorefResource)}
          >
            {activeCategory.resources.map((r) => (
              <option key={r} value={r}>
                {FIELDS_BY_RESOURCE[r].label}
              </option>
            ))}
          </select>
          <p className="field-help">{form.description}</p>
        </div>
      )}

      {form.base.map(renderField)}

      {form.advanced.length > 0 && (
        <div className="advanced">
          <button
            type="button"
            className="advanced-toggle"
            onClick={() => setShowAdvanced((s) => !s)}
            aria-expanded={showAdvanced}
          >
            <span className="chev">{showAdvanced ? '▾' : '▸'}</span> Opciones
            avanzadas
          </button>
          {showAdvanced && (
            <div className="advanced-body">{form.advanced.map(renderField)}</div>
          )}
        </div>
      )}

      <div className="url-block">
        <div className="url-label">URL que se va a consultar</div>
        <div className="url-row">
          <code title={url}>{url}</code>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => navigator.clipboard?.writeText(url)}
          >
            Copiar
          </button>
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={loading}
      >
        {loading ? 'Consultando…' : 'Consultar'}
      </button>

      <DownloadSection resource={resource} />
      <CodeSnippets resource={resource} params={values} />
    </form>
  )
}
