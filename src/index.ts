import { withCors } from './cors'
import { HttpError, MethodNotAllowedError, NotFoundError, withErrorHandler } from './errors'
import * as icp from './icp'

addEventListener('fetch', (event) => {
  event.respondWith(withCors(withErrorHandler(handleRequest))(event))
})

const handleRequest = async (event: FetchEvent) => {
  const { request } = event
  if (request.method !== 'GET') throw new MethodNotAllowedError()
  const { pathname } = new URL(request.url)
  const matches = pathname.match(/^\/([a-zA-Z90-9-.]+)$/)
  if (!matches) throw new NotFoundError()
  const domain = matches[1]
  const result = await queryIcp(event, domain)
  return new Response(JSON.stringify(result), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' },
  })
}

const getToken = async (event: FetchEvent) => {
  // TODO: fix race conditions when "Durable Objects" is available
  const freshKey = 'token'
  const staleKey = 'stale:token'
  let [token, staleToken] = await Promise.all([cache.get(freshKey), cache.get(staleKey)])
  if (token !== null) return token
  const $token = icp.getToken()
  token = staleToken ?? (await $token)
  event.waitUntil(
    $token.then((token) =>
      Promise.all([
        cache.put(freshKey, token, { expirationTtl: 120 }),
        cache.put(staleKey, token, { expirationTtl: 240 }),
      ])
    )
  )
  return token
}

type _QueryIcpResult = { result: icp.QueryIcpResult } | { error: Error }

const _queryIcp = async (event: FetchEvent, domain: string): Promise<_QueryIcpResult> => {
  // TODO: fix race conditions when "Durable Objects" is available
  const freshKey = `queryIcp:${domain}`
  const staleKey = `stale:queryIcp:${domain}`
  const $token = getToken(event)
  event.waitUntil($token)
  let [result, staleResult] = await Promise.all([
    cache.get<_QueryIcpResult>(freshKey, 'json'),
    cache.get<_QueryIcpResult>(staleKey, 'json'),
  ])
  if (result !== null) return result
  const token = await $token
  const $result = icp.queryIcp(token, domain).then(
    (result) => ({ result }),
    (error) => {
      if (error instanceof HttpError && error.cachable) return { error }
      throw error
    }
  )
  result = staleResult ?? (await $result)
  event.waitUntil(
    $result.then((result) =>
      Promise.all([
        cache.put(freshKey, JSON.stringify(result), { expirationTtl: 'error' in result ? 600 : 3600 }),
        cache.put(staleKey, JSON.stringify(result), { expirationTtl: 24 * 3600 }),
      ])
    )
  )
  return result
}

const queryIcp = async (event: FetchEvent, domain: string) => {
  const resultOrError = await _queryIcp(event, domain)
  if ('error' in resultOrError) throw resultOrError.error
  return resultOrError.result
}
