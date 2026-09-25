// Iconos de las solapas de categoría. SVG en vez de glyphs Unicode (◎ ⌖ ▦ ◫ ⊕):
// esos dependían de la fuente de fallback del sistema para cada caracter, lo que
// los dejaba descentrados verticalmente de forma inconsistente según el navegador.
import type { JSX } from 'react'
import type { ResourceCategory } from '../api/fields'

const PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const ICONS: Record<ResourceCategory['key'], JSX.Element> = {
  territorio: (
    <svg {...PROPS}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  direcciones: (
    <svg {...PROPS}>
      <circle cx="12" cy="12" r="3" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  ),
  censo: (
    <svg {...PROPS}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  educacion: (
    <svg {...PROPS}>
      <path d="M12 5C9.5 3.5 6.5 3 4 3v15c2.5 0 5.5.5 8 2 2.5-1.5 5.5-2 8-2V3c-2.5 0-5.5.5-8 2Z" />
      <line x1="12" y1="5" x2="12" y2="20" />
    </svg>
  ),
  inversa: (
    <svg {...PROPS}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="7" x2="12" y2="17" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  ),
}

export function CategoryIcon({ categoryKey }: { categoryKey: string }) {
  return ICONS[categoryKey] ?? null
}
