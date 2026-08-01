const bcrypt = require('bcryptjs')
const pool = require('../config/db')

/**
 * 初始化测试用户数据
 * 包含加密密码的用户，用于登录测试
 */
async function seedUsersWithPassword() {
  const testUsers = [
    {
      id: 1,
      email: 'zhangsan@example.com',
      password: '123456',
    },
    {
      id: 2,
      email: 'lisi@example.com',
      password: '123456',
    },
    {
      id: 3,
      email: 'wangwu@example.com',
      password: '123456',
    },
    {
      id: 4,
      email: 'zhaoliu@example.com',
      password: '123456',
    },
    {
      id: 5,
      email: 'sunqi@example.com',
      password: '123456',
    },
    {
      id: 6,
      email: 'zhouba@example.com',
      password: '123456',
    },
  ]

  console.log('开始初始化用户密码...')

  for (const user of testUsers) {
    const passwordHash = await bcrypt.hash(user.password, 10)
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ? AND email = ?',
      [passwordHash, user.id, user.email]
    )
    console.log(`  ✅ ${user.email} → 密码: ${user.password}`)
  }

  // 添加一个新测试账号
  const newUser = {
    name: '测试账号',
    email: 'test@example.com',
    password: 'test123',
    phone: '13800138000',
    company: '测试公司',
  }

  const [existing] = await pool.query(
    'SELECT id FROM users WHERE email = ?',
    [newUser.email]
  )

  if (existing.length === 0) {
    const passwordHash = await bcrypt.hash(newUser.password, 10)
    await pool.query(
      'INSERT INTO users (name, email, password, phone, company) VALUES (?, ?, ?, ?, ?)',
      [newUser.name, newUser.email, passwordHash, newUser.phone, newUser.company]
    )
    console.log(`  ✅ 新增账号: ${newUser.email} → 密码: ${newUser.password}`)
  } else {
    console.log(`  ℹ️ 账号 ${newUser.email} 已存在`)
  }

  console.log('\n🎉 用户密码初始化完成！')
  console.log('\n可使用以下账号登录：')
  console.log('  zhangsan@example.com / 123456')
  console.log('  lisi@example.com / 123456')
  console.log('  wangwu@example.com / 123456')
  console.log('  test@example.com / test123')
}

seedUsersWithPassword()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('初始化失败:', err)
    process.exit(1)
  })
