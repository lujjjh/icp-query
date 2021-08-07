export type RequestHandler = (event: FetchEvent) => Response | Promise<Response>

export type Middleware = (f: RequestHandler) => RequestHandler
