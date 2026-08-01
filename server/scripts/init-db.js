const pool = require('../config/db')

const initDatabase = async () => {
  const createDbSql = `
    CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'react_ts_db'}\`
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci
  `

  const createTableSql = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL COMMENT '姓名',
      email VARCHAR(100) NOT NULL COMMENT '邮箱',
      phone VARCHAR(20) DEFAULT '' COMMENT '电话',
      website VARCHAR(100) DEFAULT '' COMMENT '网站',
      company VARCHAR(100) DEFAULT '' COMMENT '公司',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
      UNIQUE KEY uk_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表'
  `

  const seedSql = `
    INSERT INTO users (name, email, phone, website, company) VALUES
    ('张三', 'zhangsan@example.com', '13800138001', 'zhangsan.com', '字节跳动'),
    ('李四', 'lisi@example.com', '13800138002', 'lisi.com', '阿里巴巴'),
    ('王五', 'wangwu@example.com', '13800138003', 'wangwu.com', '腾讯'),
    ('赵六', 'zhaoliu@example.com', '13800138004', 'zhaoliu.com', '百度'),
    ('孙七', 'sunqi@example.com', '13800138005', 'sunqi.com', '美团'),
    ('周八', 'zhouba@example.com', '13800138006', 'zhouba.com', '京东')
    ON DUPLICATE KEY UPDATE name = VALUES(name)
  `

  try {
    console.log('开始初始化数据库...')

    await pool.query(createDbSql)
    console.log('✅ 数据库创建/已存在')

    await pool.query(createTableSql)
    console.log('✅ 数据表创建/已存在')

    await pool.query(seedSql)
    console.log('✅ 示例数据写入完成')

    console.log('\n🎉 数据库初始化完成！')
    console.log('   启动服务: npm run dev')
  } catch (error) {
    console.error('❌ 初始化失败:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

initDatabase()
