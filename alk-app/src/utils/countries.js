export const COUNTRY_API_URL = 'http://localhost:8000/api/countries/options'

export const FALLBACK_COUNTRIES = [
  'India',
  'Singapore',
  'United Arab Emirates',
  'Jordan',
  'Netherlands',
  'Vietnam',
]

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
