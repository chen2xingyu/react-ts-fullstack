/**
 * 🎯 面试考点：单个请求覆盖全局 timeout
 * 实例默认 timeout=10s（见 request.ts），但选股拉行情可能较慢，这里在第三个参数
 * AxiosRequestConfig 里传 timeout: 60000 —— axios 会用请求级 config 覆盖实例默认值。
 * RunResult 把 stdout/stderr/exitCode/timedOut 一次性返回，前端按 exitCode!==0 或
 * timedOut 展示错误，而不是只靠 HTTP 状态码。易错点：超时触发时 axios 抛的是
 * ECONNABORTED / timeout 类错误，需在拦截器里和 401、5xx 分开处理。
 */
import { http } from './request'

export interface RunResult {
  stdout: string
  stderr: string
  exitCode: number
  timedOut: boolean
}

/** 运行 Python 代码：放宽到 60s（选股拉行情可能较慢） */
export function runPython(code: string) {
  return http.post<RunResult>('/python/run', { code }, { timeout: 60000 })
}
