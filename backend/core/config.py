import secrets
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "StockSense"
    DATABASE_URL: str = "sqlite:///./stocksense.db"
    # must be set in .env — never leave the default in production
    SECRET_KEY: str = "CHANGE_ME"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    # restrict this in .env: e.g. "http://localhost:3000,https://yourapp.com"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8081,http://localhost:19006"

    class Config:
        env_file = ".env"


settings = Settings()

# fail fast if someone forgot to set a real secret key
if settings.SECRET_KEY == "CHANGE_ME":
    raise RuntimeError(
        "SECRET_KEY is not set. Add it to your .env file.\n"
        f"You can generate one with: python -c \"import secrets; print(secrets.token_hex(32))\"\n"
        f"Suggested key: {secrets.token_hex(32)}"
    )
