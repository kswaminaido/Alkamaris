import { API_BASE, APP_ENV } from '../config/api'

export const COUNTRY_API_URL = `${API_BASE}/countries/options`
const IS_LOCAL_ENV = String(APP_ENV).toLowerCase() === 'local'

const LOCAL_FALLBACK_COUNTRIES = [
  'India',
  'Singapore',
  'United Arab Emirates',
  'Jordan',
  'Netherlands',
  'Vietnam',
  'Hong Kong',
]

export const FALLBACK_COUNTRIES = IS_LOCAL_ENV ? LOCAL_FALLBACK_COUNTRIES : []

export async function fetchCountryOptions() {
  try {
    const response = await fetch(COUNTRY_API_URL)
    const payload = await response.json()

    const options = payload?.data?.options

    if (!response.ok || !Array.isArray(options)) {
      return FALLBACK_COUNTRIES
    }

    return options.length > 0 ? options : FALLBACK_COUNTRIES
  } catch {
    return FALLBACK_COUNTRIES
  }
}

export function mergeCountryOptions(countryOptions, ...additionalOptions) {
  return [...new Set([
    ...additionalOptions.filter((option) => typeof option === 'string' && option.trim() !== ''),
    ...(Array.isArray(countryOptions) ? countryOptions : []),
  ])]
}
