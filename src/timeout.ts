import { TimeoutError } from './errors'

export function withTimeout<F extends (...args: any[]) => any>(this: any, f: F, timeout: number) {
  const that = this
  return function (...args: Parameters<F>) {
    return Promise.race([
      f.call(that, ...args) as ReturnType<F>,
      new Promise<never>((_resolve, reject) => {
        setTimeout(() => {
          reject(new TimeoutError())
        }, timeout)
      }),
    ])
  }
}
