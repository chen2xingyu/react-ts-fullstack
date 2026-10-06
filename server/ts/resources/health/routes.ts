import { Router } from 'express'
import { asyncHandler } from '../../lib/errors.js'
import { getRequestId } from '../../lib/requestContext.js'

export const healthRouter = Router()

/** v2 健康检查：回显 requestId，确认 ALS 链路与中间件栈生效 */
healthRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    res.json({
      code: 0,
      message: 'ok',
      data: {
        service: 'react-ts-server-ts',
        version: '2.0.0-lab',
        requestId: getRequestId(),
        ts: new Date().toISOString(),
      },
    })
  }),
)
