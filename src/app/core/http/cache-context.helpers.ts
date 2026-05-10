import { HttpContext } from '@angular/common/http';

import { CacheTag } from './cache-tags';
import { CACHE_TAGS, CACHE_TTL_MS, SKIP_HTTP_CACHE } from './cache-tokens';

export interface CacheRequestOptions {
  tags?: CacheTag[];
  ttlMs?: number;
}

export function withCacheOptions(options: CacheRequestOptions = {}): HttpContext {
  const tags = options.tags ?? [];
  const ttlMs = options.ttlMs ?? null;

  return new HttpContext().set(CACHE_TAGS, tags).set(CACHE_TTL_MS, ttlMs);
}

export function withoutCache(): HttpContext {
  return new HttpContext().set(SKIP_HTTP_CACHE, true);
}
