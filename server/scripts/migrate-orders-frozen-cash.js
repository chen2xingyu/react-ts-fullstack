const pool = require('../config/db')

/**
 * 迁移：为 orders 表增加 frozen_cash 列（阶段4 结算所需，按比例释放买单冻结资金）
 * 幂等：列已存在则跳过
 */
;(async () => {
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM orders LIKE 'frozen_cash'")
    if (cols.length === 0) {
      await pool.query(
        "ALTER TABLE orders ADD COLUMN frozen_cash DECIMAL(18,4) NOT NULL DEFAULT 0 COMMENT '下单时冻结资金(买)，结算按比例释放' AFTER avg_fill_price"
      )
      console.log('✅ orders 表已添加 frozen_cash 列')
    } else {
      console.log('ℹ️ orders 表已有 frozen_cash 列，跳过')
    }

    // 顺便把存量买单的 frozen_cash 回填（限价单 = price*qty*(1+fee)，按当前费率近似）
    const [rows] = await pool.query(
      `UPDATE orders
         SET frozen_cash = ROUND(price * quantity * (1 + (SELECT fee_rate FROM accounts WHERE accounts.id = orders.account_id)), 4)
       WHERE side = 1 AND price IS NOT NULL AND frozen_cash = 0`
    )
    console.log(`✅ 回填 ${rows.affectedRows} 条存量买单 frozen_cash`)
    process.exit(0)
  } catch (e) {
    console.error('迁移失败:', e.message)
    process.exit(1)
  }
})()
