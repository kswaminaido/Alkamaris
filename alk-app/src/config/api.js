const fallbackBackendUrl = 'http://localhost:8000'

export const APP_ENV = import.meta.env.APP_ENV ?? 'Development'
export const BACKEND_URL = (import.meta.env.BACKEND_URL ?? fallbackBackendUrl).replace(/\/+$/, '')
export const API_BASE = `${BACKEND_URL}/api`
