import type { Middleware } from './middleware'

export abstract class HttpError extends Error {
  public readonly status: number = 500
  public abstract readonly code: string
  public readonly cachable: boolean = false

  constructor(message?: string) {
    super(message)
  }

  toJSON() {
    const { code, message } = this
    return { code, message }
  }

  toResponse() {
    const { status } = this
    return new Response(JSON.stringify(this), {
      status,
      headers: {
        'cache-control': 'no-cache',
        'content-type': 'application/json; charset=utf-8',
      },
    })
  }
}

export class NotFoundError extends HttpError {
  status = 404
  code = 'NotFoundError'

  constructor() {
    super('Not found.')
  }
}

export class MethodNotAllowedError extends HttpError {
  status = 405
  code = 'MethodNotAllowedError'

  constructor() {
    super('Method not allowed.')
  }
}

export class InternalServerError extends HttpError {
  code = 'InternalServerError'

  constructor(message?: string, stack?: string) {
    super(message)
    this.stack = stack
  }
}

export class TimeoutError extends HttpError {
  status = 504
  code = 'TimeoutError'

  constructor() {
    super('Operation timed out.')
  }
}

export class IcpNotFoundError extends HttpError {
  status = 404
  code = 'IcpNotFoundError'
  cachable = true

  constructor() {
    super('No licenses found.')
  }
}

export const withErrorHandler: Middleware = (f) => async (event) => {
  try {
    return await f(event)
  } catch (error) {
    if (typeof error === 'object' && 'code' in error) return HttpError.prototype.toResponse.call(error)
    console.log(typeof error)
    return new InternalServerError(error.message, error.stack).toResponse()
  }
}
