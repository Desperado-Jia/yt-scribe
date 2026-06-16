type Handler = (request: Request, ...args: string[]) => Promise<Response>

interface Route {
  method: string
  pattern: URLPattern
  handler: Handler
}

export function createRouter(): {
  add: (method: string, pathname: string, handler: Handler) => void
  handle: (request: Request) => Promise<Response | null>
} {
  const routes: Route[] = []

  return {
    add(method: string, pathname: string, handler: Handler) {
      routes.push({
        method: method.toUpperCase(),
        pattern: new URLPattern({ pathname }),
        handler,
      })
    },

    async handle(request: Request): Promise<Response | null> {
      for (const route of routes) {
        if (route.method !== request.method) continue
        const match = route.pattern.exec(request.url)
        if (match) {
          const params = match.pathname.groups
          return route.handler(request, ...Object.values(params) as string[])
        }
      }
      return null
    },
  }
}
