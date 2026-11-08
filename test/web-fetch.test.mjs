import test from 'node:test'
import assert from 'node:assert/strict'
import { assertPublicUrl } from '../index.js'

test('web fetch rejects IPv6 loopback and mapped loopback', async () => {
  await assert.rejects(() => assertPublicUrl('http://[::1]/'), /内网/)
  await assert.rejects(() => assertPublicUrl('http://[::ffff:127.0.0.1]/'), /内网/)
  await assert.rejects(() => assertPublicUrl('http://127.0.0.1/'), /内网/)
  await assert.rejects(() => assertPublicUrl('http://[fe90::1]/'), /内网/)
  await assert.rejects(() => assertPublicUrl('http://[febf::1]/'), /内网/)
})
