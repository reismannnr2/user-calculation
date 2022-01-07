import { EvalResult } from './evaluate';
import { CalcEnv } from '../types/misc';

class InsertableCache<K extends object, T> {
  private raw: WeakMap<K, T> = new WeakMap();
  getOrInsert(key: K, gen: () => T): T {
    const cached = this.raw.get(key);
    if (cached) {
      return cached;
    }
    const v = gen();
    this.raw.set(key, v);
    return v;
  }
}

export class VarCache {
  private raw: InsertableCache<CalcEnv, InsertableCache<object, EvalResult>> = new InsertableCache();
  getOrInsert(env: CalcEnv, key: object, gen: () => EvalResult): EvalResult {
    const envCache = this.raw.getOrInsert(env, () => new InsertableCache());
    return envCache.getOrInsert(key, gen);
  }
}
