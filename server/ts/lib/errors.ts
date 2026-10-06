import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { logger } from './logger.js'

/**
 * 统一业务错误类
 *
 * 🎯 面试考点：用"带状态码的错误类 + 错误处理中间件"替代到处
 * res.status(404).json(...)，service 层只需要 throw，controller 不关心响应格式。
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const errors = {
  badRequest: (msg = '参数错误', details?: unknown) => new AppError(400, msg, details),
  unauthorized: (msg = '未登录或登录已过期') => new AppError(401, msg),
  forbidden: (msg = '没有权限') => new AppError(403, msg),
  notFound: (msg = '资源不存在') => new AppError(404, msg),
  tooMany: (msg = '请求过于频繁，请稍后再试') => new AppError(429, msg),
}

/** 包裹 async 路由处理器：异常自动 next 到错误中间件（Express 4 不会自动 catch Promise） */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req as T, res, next).catch(next)
  }
}

/** v2 统一错误处理：Zod → 422，AppError → 对应状态码，其余 → 500 */
export function v2ErrorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(422).json({
      code: 422,
      message: '参数校验失败',
      data: null,
      // 🎯 flatten 后按字段给出错误信息，前端可以直接把错误挂到表单项上
      details: err.flatten(),
    })
    return
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) logger.error({ err }, err.message)
    res.status(err.statusCode).json({ code: err.statusCode, message: err.message, data: null })
    return
  }

  logger.error({ err }, '未处理异常')
  res.status(500).json({
    code: 500,
    message: (err as Error)?.message || '服务器内部错误',
    data: null,
  })
}
