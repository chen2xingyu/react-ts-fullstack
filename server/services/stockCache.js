const { redis } = require('../config/redis')
const StockModel = require('../models/stockModel')

/**
 * 从 MySQL 加载股票元数据，缓存到 Redis Hash trading:stocks
 * Python 撮合引擎启动时读取该 Hash 获取股票列表与昨收/涨跌停
 */
async function refreshStockCache() {
  const stocks = await StockModel.findAll()
  const mapping = {}
  for (const s of stocks) {
    mapping[s.symbol] = JSON.stringify({
      symbol: s.symbol,
      name: s.name,
      exchange: s.exchange,
      prev_close: Number(s.prev_close),
      price_limit_pct: Number(s.price_limit_pct),
      lot_size: s.lot_size,
    })
  }
  if (Object.keys(mapping).length > 0) {
    await redis.hset('trading:stocks', mapping)
  }
  console.log(`✅ 已缓存 ${stocks.length} 只股票到 Redis (trading:stocks)`)
  return stocks
}

module.exports = { refreshStockCache }
