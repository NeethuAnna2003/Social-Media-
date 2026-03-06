const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

const explicitApiBase = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || '');
const explicitWsBase = trimTrailingSlash(import.meta.env.VITE_WS_BASE_URL || '');

const browserOrigin =
  typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';

const derivedWsFromApi = explicitApiBase
  ? explicitApiBase.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
  : '';

export const API_BASE_ORIGIN = explicitApiBase || browserOrigin;
export const API_URL = explicitApiBase ? `${explicitApiBase}/api` : '/api';
export const WS_BASE = explicitWsBase || derivedWsFromApi || browserOrigin.replace(/^http/, 'ws');
