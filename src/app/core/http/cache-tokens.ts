import { HttpContextToken } from '@angular/common/http';

import { CacheTag } from './cache-tags';

export const SKIP_HTTP_CACHE = new HttpContextToken<boolean>(() => false);
export const CACHE_TTL_MS = new HttpContextToken<number | null>(() => null);
export const CACHE_TAGS = new HttpContextToken<CacheTag[]>(() => []);
