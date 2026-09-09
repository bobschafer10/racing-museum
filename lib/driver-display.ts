const INITIAL_FIRST_NAMES = new Set([
  'ae', 'aj', 'ba', 'bg', 'bj', 'bt', 'cc', 'ci', 'cj', 'cl',
  'db', 'dd', 'dj', 'dl', 'eh', 'ej', 'em', 'fw', 'gg', 'gi', 'gw',
  'ha', 'hb', 'jb', 'jc', 'jd', 'jj', 'jl', 'jp', 'jr', 'jt', 'jv',
  'kc', 'kj', 'lb', 'ld', 'le', 'lf', 'lh', 'lj', 'lk', 'lm', 'lw',
  'mg', 'mj', 'oz', 'pj', 'rc', 'rd', 'rj', 'rm', 'rr', 'rw', 'th',
  'tj', 'tk', 'tm', 'tw', 'vj', 'wc', 'wh',
])

/**
 * Formats a driver slug for display when a canonical driver_name is not
 * available. Initial-style first names use museum punctuation (J.J., M.J.,
 * A.J., F.W., etc.) while ordinary two-letter names such as Al or Ed remain
 * normal names.
 */
export function formatDriverSlugName(value?: string | null) {
  if (!value || ['unknown', 'unknown-driver'].includes(value)) return 'Unknown'

  const parts = String(value)
    .replace(/_/g, '-')
    .split('-')
    .filter(Boolean)

  return parts
    .map((part, index) => {
      const lower = part.toLowerCase()

      if (index === 0 && INITIAL_FIRST_NAMES.has(lower)) {
        return lower.toUpperCase().split('').join('.') + '.'
      }

      // Preserve the common McX capitalization when the display name must be
      // reconstructed from a slug (for example mj-mcbride).
      if (/^mc[a-z]/.test(lower)) {
        return `Mc${lower.charAt(2).toUpperCase()}${lower.slice(3)}`
      }

      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join(' ')
}
