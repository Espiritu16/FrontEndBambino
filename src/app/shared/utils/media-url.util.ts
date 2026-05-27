import { API_BASE_URL } from '../../core/http/api-endpoints';

export function resolveBackendAssetUrl(rawUrl: string | null | undefined, apiBaseUrl: string = API_BASE_URL): string {
  const source = (rawUrl ?? '').trim();
  if (!source) return '';

  if (
    source.startsWith('http://') ||
    source.startsWith('https://') ||
    source.startsWith('blob:') ||
    source.startsWith('data:')
  ) {
    return source;
  }

  const base = (apiBaseUrl ?? '').trim().replace(/\/+$/, '');
  if (!base) return source;

  if (source.startsWith('/')) {
    return `${base}${source}`;
  }

  return `${base}/${source}`;
}
