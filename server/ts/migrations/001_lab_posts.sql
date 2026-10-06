-- ============================================================================
-- 面试实验室：文章 Feed 模块表结构（迁移 001）
-- 全部 lab_ 前缀，与交易业务表物理隔离，可重复执行（IF NOT EXISTS）
--
-- 🎯 面试考点：
-- 1. 游标分页依赖稳定的排序字段：这里用 (created_at DESC, id DESC) 复合顺序，
--    lab_posts 上建 (created_at, id) 复合索引支撑 WHERE 游标 + ORDER BY。
-- 2. 幂等点赞靠 UNIQUE(post_id, user_id)，配合 INSERT IGNORE 天然防重复计数。
-- 3. 反范式冗余 like_count/comment_count：读多写少场景避免每次 COUNT(*)，
--    写入时用事务维护一致性（Phase 2 实现）。
-- ============================================================================

CREATE TABLE IF NOT EXISTS lab_posts (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title         VARCHAR(200)  NOT NULL,
  summary       VARCHAR(500)  NOT NULL DEFAULT '',
  content       MEDIUMTEXT    NOT NULL,
  author        VARCHAR(100)  NOT NULL DEFAULT '匿名',
  tags          JSON          NULL,                 -- 简单标签数组，避免演示期多表 JOIN
  like_count    INT UNSIGNED  NOT NULL DEFAULT 0,
  comment_count INT UNSIGNED  NOT NULL DEFAULT 0,
  created_at    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_created_id (created_at, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lab_comments (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id    BIGINT UNSIGNED NOT NULL,
  author     VARCHAR(50)  NOT NULL DEFAULT '游客',
  content    VARCHAR(1000) NOT NULL,
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_post_created (post_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 点赞记录：同一用户对同一文章只能一条 → 唯一键保证幂等
CREATE TABLE IF NOT EXISTS lab_post_likes (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  post_id    BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL DEFAULT 0, -- 演示期用固定游客 id，接入鉴权后换真实用户
  created_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_post_user (post_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
