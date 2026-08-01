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
