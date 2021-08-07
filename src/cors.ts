import { Middleware } from './middleware'

export const withCors: Middleware = (f) => async (event) => {
  const { request } = event
  const origin = request.headers.get('origin')
  let response: Response
  if (request.method === 'OPTIONS') {
    response = new Response(null, {
      headers: { 'cache-control': 'max-age=60' },
    })
  } else {
    response = await f(event)
  }
  if (origin) {
    response.headers.set('access-control-allow-origin', origin)
  }
  response.headers.set('vary', 'origin')
  return response
}
