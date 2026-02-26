from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str
    allowed_origins: str = "*"
    tmp_dir: str = "/tmp/see_you_later"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()  # type: ignore[call-arg]
