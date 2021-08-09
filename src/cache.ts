export interface WithCacheOptions {
  cacheKeyPrefix: string
  maxAge: number
  staleWhileRevalidate?: number
}

export interface CachedValue<T> {
  value: T
  exp: number
}

type DePromise<T> = T extends Promise<infer U> ? U : T

export interface ExtendableEvent {
  waitUntil(promise: Promise<any>): void
}

// TODO: fix race conditions when "Durable Objects" is available
export function withCache<F extends (event: ExtendableEvent, ...args: any[]) => any>(
  this: any,
  f: F,
  { cacheKeyPrefix, maxAge, staleWhileRevalidate = 0 }: WithCacheOptions
) {
  const that = this
  type T = DePromise<ReturnType<F>>
  return async function (...[event, ...args]: Parameters<F>): Promise<T> {
    const cacheKey = JSON.stringify([cacheKeyPrefix, ...args])
    const cachedValue = await cache.get<CachedValue<T>>(cacheKey, 'json')
    if (cachedValue !== null && cachedValue.exp >= Math.floor(Date.now() / 1000)) return cachedValue.value

    const getValueAndUpdateCache = async () => {
      const value = await f.call(that, event, ...args)
      const exp = Math.floor(Date.now() / 1000) + maxAge
      event.waitUntil(
        cache
          .put(cacheKey, JSON.stringify({ value, exp } as CachedValue<T>), {
            expiration: exp + staleWhileRevalidate,
          })
          .catch(() => {})
      )
      return value
    }
    if (cachedValue) {
      event.waitUntil(getValueAndUpdateCache().catch(() => {}))
      return cachedValue.value
    }
    return getValueAndUpdateCache()
  }
}
