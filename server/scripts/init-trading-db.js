const pool = require('../config/db')
const config = require('../config')

/**
 * 交易系统数据库初始化脚本
 * 创建 8 张表 + 股票种子数据 + 用户初始资金账户
 */

const DDL = [
  `CREATE TABLE IF NOT EXISTS stocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(16) NOT NULL COMMENT '股票代码',
    name VARCHAR(32) NOT NULL COMMENT '股票名称',
    exchange VARCHAR(8) NOT NULL COMMENT 'SSE/SZSE',
    prev_close DECIMAL(12,4) NOT NULL COMMENT '昨收价',
    price_limit_pct DECIMAL(5,4) NOT NULL DEFAULT 0.1000 COMMENT '涨跌停比例',
    lot_size INT NOT NULL DEFAULT 100 COMMENT '一手股数',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '1上市 0停牌',
    listed_date DATE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_symbol (symbol)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='股票信息'`,

  `CREATE TABLE IF NOT EXISTS accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    cash_total DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '总现金',
    cash_available DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '可用现金',
    cash_frozen DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '冻结现金',
    fee_rate DECIMAL(8,6) NOT NULL DEFAULT 0.000300 COMMENT '手续费率',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资金账户'`,

  `CREATE TABLE IF NOT EXISTS orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    account_id INT NOT NULL,
    symbol VARCHAR(16) NOT NULL,
    side TINYINT NOT NULL COMMENT '1买 2卖',
    order_type TINYINT NOT NULL DEFAULT 1 COMMENT '1限价 2市价',
    price DECIMAL(12,4) DEFAULT NULL,
    quantity INT NOT NULL COMMENT '委托量(股)',
    filled_quantity INT NOT NULL DEFAULT 0,
    avg_fill_price DECIMAL(12,4) NOT NULL DEFAULT 0,
    frozen_cash DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '下单时冻结资金(买)，结算按比例释放',
    status TINYINT NOT NULL COMMENT '0待成交 1部分成交 2已成交 3已撤 4已拒',
    reject_reason VARCHAR(64) DEFAULT NULL,
    client_order_id VARCHAR(40) DEFAULT NULL COMMENT '前端幂等键',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_user_status (user_id, status),
    KEY idx_symbol (symbol),
    KEY idx_client (client_order_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='委托单'`,

  `CREATE TABLE IF NOT EXISTS trades (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    trade_no VARCHAR(32) NOT NULL COMMENT '成交编号',
    symbol VARCHAR(16) NOT NULL,
    buy_order_id BIGINT DEFAULT NULL,
    sell_order_id BIGINT DEFAULT NULL,
    buyer_id INT DEFAULT NULL,
    seller_id INT DEFAULT NULL,
    side TINYINT NOT NULL COMMENT '主动方 1买 2卖',
    price DECIMAL(12,4) NOT NULL,
    quantity INT NOT NULL,
    amount DECIMAL(18,4) NOT NULL,
    trade_time DATETIME(3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_trade_no (trade_no),
    KEY idx_buy (buy_order_id),
    KEY idx_sell (sell_order_id),
    KEY idx_buyer (buyer_id),
    KEY idx_seller (seller_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成交记录'`,

  `CREATE TABLE IF NOT EXISTS positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    symbol VARCHAR(16) NOT NULL,
    quantity INT NOT NULL DEFAULT 0 COMMENT '总持仓',
    available_quantity INT NOT NULL DEFAULT 0 COMMENT '可卖数量',
    frozen_quantity INT NOT NULL DEFAULT 0 COMMENT '冻结数量',
    total_cost DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '持仓总成本',
    avg_cost DECIMAL(12,4) NOT NULL DEFAULT 0 COMMENT '持仓均价',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_symbol (user_id, symbol)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='持仓'`,

  `CREATE TABLE IF NOT EXISTS klines (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    symbol VARCHAR(16) NOT NULL,
    period VARCHAR(4) NOT NULL COMMENT '1m/5m/15m/60m/1d',
    ts DATETIME NOT NULL COMMENT '周期开始时间',
    open DECIMAL(12,4) NOT NULL,
    high DECIMAL(12,4) NOT NULL,
    low DECIMAL(12,4) NOT NULL,
    close DECIMAL(12,4) NOT NULL,
    volume BIGINT NOT NULL DEFAULT 0,
    amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    UNIQUE KEY uk_sym_period_ts (symbol, period, ts)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='K线历史'`,

  `CREATE TABLE IF NOT EXISTS quotes (
    symbol VARCHAR(16) PRIMARY KEY,
    last_price DECIMAL(12,4) NOT NULL DEFAULT 0,
    open DECIMAL(12,4) NOT NULL DEFAULT 0,
    high DECIMAL(12,4) NOT NULL DEFAULT 0,
    low DECIMAL(12,4) NOT NULL DEFAULT 0,
    pre_close DECIMAL(12,4) NOT NULL DEFAULT 0,
    volume BIGINT NOT NULL DEFAULT 0,
    amount DECIMAL(18,4) NOT NULL DEFAULT 0,
    ts TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='行情快照'`,

  `CREATE TABLE IF NOT EXISTS risk_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    symbol VARCHAR(16) DEFAULT NULL,
    action VARCHAR(32) NOT NULL,
    rule VARCHAR(32) NOT NULL,
    detail VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='风控日志'`,
]

// 种子股票数据
const SEED_STOCKS = [
  { symbol: '600519', name: '贵州茅台', exchange: 'SSE', prev_close: 1680.00, price_limit_pct: 0.10, lot_size: 100 },
  { symbol: '000001', name: '平安银行', exchange: 'SZSE', prev_close: 12.50, price_limit_pct: 0.10, lot_size: 100 },
  { symbol: '000858', name: '五粮液', exchange: 'SZSE', prev_close: 158.00, price_limit_pct: 0.10, lot_size: 100 },
  { symbol: '601318', name: '中国平安', exchange: 'SSE', prev_close: 48.00, price_limit_pct: 0.10, lot_size: 100 },
  { symbol: '300750', name: '宁德时代', exchange: 'SZSE', prev_close: 210.00, price_limit_pct: 0.20, lot_size: 100 },
  { symbol: '600036', name: '招商银行', exchange: 'SSE', prev_close: 35.00, price_limit_pct: 0.10, lot_size: 100 },
  { symbol: '002594', name: '比亚迪', exchange: 'SZSE', prev_close: 245.00, price_limit_pct: 0.10, lot_size: 100 },
  { symbol: '601899', name: '紫金矿业', exchange: 'SSE', prev_close: 15.00, price_limit_pct: 0.10, lot_size: 100 },
]

async function initTradingDB() {
  console.log('开始初始化交易数据库...')

  // 1. 建表
  for (const sql of DDL) {
    await pool.query(sql)
  }
  console.log('✅ 8 张交易表创建完成')

  // 2. 插入股票种子数据
  for (const stock of SEED_STOCKS) {
    await pool.query(
      `INSERT INTO stocks (symbol, name, exchange, prev_close, price_limit_pct, lot_size, status)
       VALUES (?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE name = VALUES(name), prev_close = VALUES(prev_close)`,
      [stock.symbol, stock.name, stock.exchange, stock.prev_close, stock.price_limit_pct, stock.lot_size]
    )

    // 初始化行情快照
    await pool.query(
      `INSERT INTO quotes (symbol, last_price, open, high, low, pre_close)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE pre_close = VALUES(pre_close)`,
      [stock.symbol, stock.prev_close, stock.prev_close, stock.prev_close, stock.prev_close, stock.prev_close]
    )
  }
  console.log(`✅ ${SEED_STOCKS.length} 只股票种子数据写入完成`)

  // 3. 给所有用户初始化资金账户
  const [users] = await pool.query('SELECT id FROM users')
  for (const user of users) {
    await pool.query(
      `INSERT INTO accounts (user_id, cash_total, cash_available, cash_frozen, fee_rate)
       VALUES (?, ?, ?, 0, ?)
       ON DUPLICATE KEY UPDATE cash_total = IF(cash_total = 0, VALUES(cash_total), cash_total)`,
      [user.id, config.trading.defaultCash, config.trading.defaultCash, config.trading.feeRate]
    )
  }
  console.log(`✅ ${users.length} 个用户资金账户初始化完成 (每人 ${config.trading.defaultCash} 元)`)

  console.log('\n🎉 交易数据库初始化完成！')
  console.log('   股票列表:')
  SEED_STOCKS.forEach((s) => {
    console.log(`   ${s.symbol} ${s.name} 昨收:${s.prev_close} 涨跌停:${(s.price_limit_pct * 100).toFixed(0)}%`)
  })
}

initTradingDB()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('初始化失败:', err)
    process.exit(1)
  })
