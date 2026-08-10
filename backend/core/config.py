from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "InvestMant Trading Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Upstox Configurations
    UPSTOX_API_BASE_URL: str = "https://api.upstox.com/v2"
    
    # Database Configurations (Future)
    DATABASE_URL: str | None = None
    REDIS_URL: str | None = None

    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

settings = Settings()
