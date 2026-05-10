import { Injectable } from '@angular/core';
import { HttpResponse } from '@angular/common/http';

import { CacheTag } from './cache-tags';

interface CacheEntry {
  expiresAt: number;
  response: HttpResponse<unknown>;
  tags: CacheTag[];
}

@Injectable({ providedIn: 'root' })
export class CacheService {
  private readonly store = new Map<string, CacheEntry>();

  get(key: string): CacheEntry | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return entry;
  }

  set(key: string, response: HttpResponse<unknown>, ttlMs: number, tags: CacheTag[]): void {
    this.store.set(key, {
      expiresAt: Date.now() + ttlMs,
      response,
      tags
    });
  }

  invalidateByTags(tags: CacheTag[]): void {
    if (tags.length === 0) {
      return;
    }

    for (const [key, entry] of this.store.entries()) {
      if (entry.tags.some((tag) => tags.includes(tag))) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }
}
