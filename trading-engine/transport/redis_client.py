"""Redis 异步客户端（单例，长连接复用）"""
import os
import redis.asyncio as aioredis

_config = {
    'host': os.getenv('REDIS_HOST', 'localhost'),
    'port': int(os.getenv('REDIS_PORT', '6379')),
    'db': int(os.getenv('REDIS_DB', '0')),
    'decode_responses': True,
}

_client = None


async def get_redis():
    """获取（必要时创建）Redis 异步客户端单例"""
    global _client
    if _client is None:
        _client = aioredis.Redis(**_config)
        await _client.ping()
    return _client
