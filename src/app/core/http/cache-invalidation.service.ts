import { Injectable } from '@angular/core';

import { CacheService } from './cache.service';
import { CacheTag } from './cache-tags';

@Injectable({ providedIn: 'root' })
export class CacheInvalidationService {
  constructor(private readonly cacheService: CacheService) {}

  invalidate(tags: CacheTag[]): void {
    this.cacheService.invalidateByTags(tags);
  }

  clearAll(): void {
    this.cacheService.clear();
  }
}
