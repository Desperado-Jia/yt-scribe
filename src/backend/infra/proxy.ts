import { connect } from 'cloudflare:sockets'

export interface WebshareConfig {
  host: string
  port: number
  username: string
  password: string
}

export interface ProxyTunnel {
  fetch(url: string, options?: RequestInit): Promise<Response>
}

function validateConfig(config: WebshareConfig): void {
  if (!config.host) throw new Error('Proxy host is required')
  if (!config.port) throw new Error('Proxy port is required')
}

export function createProxyTunnel(config: WebshareConfig): ProxyTunnel {
  validateConfig(config)

  return {
    async fetch(targetUrl: string, options?: RequestInit): Promise<Response> {
      const url = new URL(targetUrl)
      const isHttps = url.protocol === 'https:'
      const port = isHttps ? 443 : 80

      const socket = connect({ hostname: config.host, port: config.port })

      const auth = btoa(`${config.username}:${config.password}`)
      const connectReq = [
        `CONNECT ${url.hostname}:${port} HTTP/1.1`,
        `Host: ${url.hostname}:${port}`,
        `Proxy-Authorization: Basic ${auth}`,
        '',
        '',
      ].join('\r\n')

      const writer = socket.writable.getWriter()
      const encoder = new TextEncoder()
      await writer.write(encoder.encode(connectReq))

      const reader = socket.readable.getReader()
      const decoder = new TextDecoder()
      let responseLine = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        responseLine += decoder.decode(value, { stream: true })
        if (responseLine.includes('\r\n\r\n')) break
      }

      const statusMatch = responseLine.match(/^HTTP\/1\.[01] (\d{3})/)
      if (!statusMatch || statusMatch[1] !== '200') {
        writer.releaseLock()
        reader.releaseLock()
        socket.close()
        throw new Error(`Proxy CONNECT failed: ${responseLine.split('\r\n')[0]}`)
      }

      // Upgrade to TLS
      const tlsSocket = socket.startTls()

      // Build and send HTTP request through TLS tunnel
      const requestLine = `${options?.method || 'GET'} ${url.pathname}${url.search} HTTP/1.1`
      const headers: string[] = [
        requestLine,
        `Host: ${url.hostname}`,
        'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept: */*',
        'Accept-Language: en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
        'Connection: close',
      ]
      if (options?.headers) {
        const h = options.headers as Record<string, string>
        for (const [k, v] of Object.entries(h)) {
          if (!['host', 'connection'].includes(k.toLowerCase())) {
            headers.push(`${k}: ${v}`)
          }
        }
      }
      headers.push('', '')

      const tlsWriter = tlsSocket.writable.getWriter()
      await tlsWriter.write(encoder.encode(headers.join('\r\n')))
      if (options?.body) {
        await tlsWriter.write(
          typeof options.body === 'string' ? encoder.encode(options.body) : new Uint8Array(await (options.body as ArrayBuffer))
        )
      }
      tlsWriter.releaseLock()

      // Read response
      const tlsReader = tlsSocket.readable.getReader()
      const chunks: Uint8Array[] = []
      while (true) {
        const { value, done } = await tlsReader.read()
        if (done) break
        chunks.push(value)
      }
      tlsReader.releaseLock()
      tlsSocket.close()
      writer.releaseLock()
      reader.releaseLock()

      const fullResponse = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0))
      let offset = 0
      for (const chunk of chunks) {
        fullResponse.set(chunk, offset)
        offset += chunk.length
      }

      return new Response(fullResponse)
    },
  }
}
