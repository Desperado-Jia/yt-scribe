import { describe, it, expect, vi } from 'vitest'

vi.mock('cloudflare:sockets', () => ({
  connect: vi.fn(),
}))

import { createProxyTunnel } from '../../../src/backend/infra/proxy'

describe('createProxyTunnel', () => {
  const config = {
    host: 'proxy.webshare.io',
    port: 443,
    username: 'user123',
    password: 'pass456',
  }

  it('returns an object conforming to ProxyTunnel interface', () => {
    const tunnel = createProxyTunnel(config)
    expect(tunnel).toHaveProperty('fetch')
    expect(typeof tunnel.fetch).toBe('function')
  })

  it('throws when host is missing', () => {
    expect(() => createProxyTunnel({ ...config, host: '' })).toThrow('Proxy host is required')
  })

  it('throws when port is 0', () => {
    expect(() => createProxyTunnel({ ...config, port: 0 })).toThrow('Proxy port is required')
  })
})
