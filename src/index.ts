import { ExtendableEvent, withCache } from './cache'
import { withCors } from './cors'
import { IcpNotFoundError, MethodNotAllowedError, NotFoundError, TimeoutError, withErrorHandler } from './errors'
import * as icp from './icp'
import { withTimeout } from './timeout'

addEventListener('fetch', (event) => {
  event.respondWith(withCors(withErrorHandler(handleRequest))(event))
})

addEventListener('scheduled', (event) => {
  event.waitUntil(handleSchedule(event))
})

const handleRequest = async (event: FetchEvent) => {
  const { request } = event
  if (request.method !== 'GET') throw new MethodNotAllowedError()
  const { pathname } = new URL(request.url)
  if (pathname === '/favicon.ico') throw new NotFoundError()
  const matches = pathname.match(/^\/([a-zA-Z90-9-.]+)$/)
  if (!matches) throw new NotFoundError()
  const domain = matches[1]
  const result = await queryIcp(event, domain)
  return new Response(JSON.stringify(result), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' },
  })
}

const handleSchedule = async (event: ScheduledEvent) => {
  await getToken(event)
}

const getToken = withCache(
  withTimeout((_event: ExtendableEvent) => icp.getToken(), 10000),
  {
    cacheKeyPrefix: 'token',
    maxAge: 150,
    staleWhileRevalidate: 120,
  }
)

type _QueryIcpResult = { result: icp.QueryIcpResult } | { notFound: true }

const _queryIcp = withCache(
  async (event: ExtendableEvent, domain: string): Promise<_QueryIcpResult> => {
    const token = await getToken(event)
    try {
      const result = await icp.queryIcp(token, domain)
      return { result }
    } catch (error) {
      if (error instanceof IcpNotFoundError) return { notFound: true }
      throw error
    }
  },
  { cacheKeyPrefix: 'queryIcp', maxAge: 600, staleWhileRevalidate: 24 * 3600 }
)

const queryIcp = async (event: ExtendableEvent, domain: string) => {
  const resultOrError = await _queryIcp(event, domain)
  if ('notFound' in resultOrError) throw new IcpNotFoundError()
  return resultOrError.result
}
