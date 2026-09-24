from typing import Dict
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from app.core.config import settings

# Control plane DB engine & session maker
control_engine: AsyncEngine = create_async_engine(
    settings.control_db_async_url,
    echo=False,
    pool_size=5,
    max_overflow=5,
    pool_timeout=15,
    pool_recycle=1800,
    pool_pre_ping=True,
)

ControlSessionLocal = async_sessionmaker(
    bind=control_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def get_control_db():
    async with ControlSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# Registry of tenant DB engines: db_name -> AsyncEngine
_tenant_engines: Dict[str, AsyncEngine] = {}
_tenant_session_makers: Dict[str, async_sessionmaker] = {}

def get_tenant_engine(db_name: str) -> AsyncEngine:
    if db_name not in _tenant_engines:
        url = settings.get_tenant_db_async_url(db_name)
        _tenant_engines[db_name] = create_async_engine(
            url,
            echo=False,
            pool_size=5,
            max_overflow=5,
            pool_timeout=15,
            pool_recycle=1800,
            pool_pre_ping=True,
        )
    return _tenant_engines[db_name]

def get_tenant_session_maker(db_name: str) -> async_sessionmaker:
    if db_name not in _tenant_session_makers:
        engine = get_tenant_engine(db_name)
        _tenant_session_makers[db_name] = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    return _tenant_session_makers[db_name]

async def close_all_connections():
    await control_engine.dispose()
    for engine in _tenant_engines.values():
        await engine.dispose()
    _tenant_engines.clear()
    _tenant_session_makers.clear()
