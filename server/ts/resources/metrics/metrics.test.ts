// @vitest-environment node
import { describe, it, expect, afterAll } from 'vitest'
import '../../load-env.js'
import { createV2App } from '../../app.js'
import supertest from 'supertest'
import { closeNotificationQueue } from '../../jobs/notificationQueue.js'

const app = createV2App()
const request = supertest(app)

describe('性能指标接收与聚合', () => {
  it('POST /metrics 接收 sendBeacon 上报（text/plain）', async () => {
    const payload = JSON.stringify({
      vitals: [
        { name: 'LCP', value: 1200, rating: 'good', unit: 'ms' },
        { name: 'INP', value: 150, rating: 'good', unit: 'ms' },
        { name: 'CLS', value: 0.05, rating: 'good', unit: '' },
      ],
      url: '/test',
      ts: Date.now(),
    })
    await request
      .post('/metrics')
      .set('Content-Type', 'text/plain')
      .send(payload)
      .expect(201)
  })

  it('GET /metrics/summary 聚合出 P75', async () => {
    const res = await request.get('/metrics/summary').expect(200)
    expect(res.body.data.LCP).toBeDefined()
    expect(res.body.data.LCP.count).toBeGreaterThan(0)
    expect(res.body.data.LCP.p75).toBeDefined()
  })

  it('POST /metrics/reset 清空数据', async () => {
    await request.post('/metrics/reset').expect(200)
    const res = await request.get('/metrics/summary').expect(200)
    expect(Object.keys(res.body.data).length).toBe(0)
  })
})

describe('CSRF 攻防对照', () => {
  it('GET /security/csrf/balance 返回初始余额', async () => {
    const res = await request.get('/security/csrf/balance?user=test').expect(200)
    expect(res.body.data.user).toBe('test')
    expect(res.body.data.balance).toBeGreaterThanOrEqual(0)
  })

  it('POST /security/csrf/transfer 缺少 Token 被拦截', async () => {
    const res = await request
      .post('/security/csrf/transfer')
      .send({ user: 'test', amount: 100 })
      .expect(403)
    expect(res.body.message).toContain('缺少 X-CSRF-Token')
  })

  it('POST /security/csrf/transfer 带 Token 转账成功', async () => {
    const res = await request
      .post('/security/csrf/transfer')
      .set('X-CSRF-Token', 'demo-token-123')
      .send({ user: 'test', amount: 100 })
      .expect(200)
    expect(res.body.data.safe).toBe(true)
    expect(res.body.data.balance).toBeLessThan(1000)
  })

  it('POST /security/csrf/transfer/unsafe 无防护转账成功', async () => {
    const res = await request
      .post('/security/csrf/transfer/unsafe')
      .send({ user: 'test', amount: 50 })
      .expect(200)
    expect(res.body.data.safe).toBe(false)
  })
})

afterAll(async () => {
  await closeNotificationQueue()
})
