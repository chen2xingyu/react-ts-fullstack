const StockModel = require('../models/stockModel')
const QuoteModel = require('../models/quoteModel')
const KlineModel = require('../models/klineModel')

/**
 * 行情相关：股票列表 / 实时快照 / K线历史
 */
const quoteController = {
  // 股票列表
  async getStocks(req, res, next) {
    try {
      const stocks = await StockModel.findAll()
      res.json({ code: 0, message: 'success', data: stocks })
    } catch (error) {
      next(error)
    }
  },

  // 单只股票实时行情快照
  async getQuote(req, res, next) {
    try {
      const quote = await QuoteModel.findBySymbol(req.params.symbol)
      if (!quote) {
        return res.status(404).json({ code: 404, message: '行情不存在' })
      }
      res.json({ code: 0, message: 'success', data: quote })
    } catch (error) {
      next(error)
    }
  },

  // K线历史（默认 1m，最多 2000 根）
  async getKlines(req, res, next) {
    try {
      const { symbol } = req.params
      const period = req.query.period || '1m'
      const limit = Math.min(Number(req.query.limit) || 500, 2000)
      const klines = await KlineModel.findBySymbol(symbol, period, limit)
      res.json({ code: 0, message: 'success', data: klines })
    } catch (error) {
      next(error)
    }
  },
}

module.exports = quoteController
