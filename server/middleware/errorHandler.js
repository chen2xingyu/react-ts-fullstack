const errorHandler = (err, _req, res, _next) => {
  console.error('[错误]', err.message)
  console.error(err.stack)

  res.status(err.status || 500).json({
    code: err.status || 500,
    message: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  })
}

const notFoundHandler = (req, res) => {
  res.status(404).json({
    code: 404,
    message: `路由不存在: ${req.method} ${req.originalUrl}`,
  })
}

module.exports = {
  errorHandler,
  notFoundHandler,
}
