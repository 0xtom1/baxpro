# config.py
import os
from dataclasses import dataclass
from typing import Literal

from dotenv import load_dotenv

# Load .env file if it exists (perfectly safe to call multiple times)
load_dotenv(override=True)


@dataclass(frozen=True)
class Config:
    # ──────── ALWAYS REQUIRED ────────
    gcp_project_id: str = os.environ["GCP_PROJECT_ID"]
    pubsub_topic: str = os.environ["PUBSUB_TOPIC"]

    # ──────── DATABASE ────────
    database_url: str | None = os.environ.get("DATABASE_URL")

    db_user: str | None = os.environ.get("DB_USER")
    db_pass: str | None = os.environ.get("DB_PASS")
    db_name: str | None = os.environ.get("DB_NAME")
    instance_unix_socket: str | None = os.environ.get("INSTANCE_UNIX_SOCKET")

    helius_api_key: str | None = os.environ.get("HELIUS_API_KEY")

    # ──────── OPTIONAL WITH DEFAULTS ────────
    baxus_api_base: str = os.environ.get(
        "BAXUS_API_BASE", "https://services.baxus.co/api")
    baxus_api_key: str | None = os.environ.get("BAXUS_API_KEY")
    # Polling interval set by Terraform: 300s (dev) or 30s (prod)
    poll_interval_sec: int = int(os.environ.get("POLL_INTERVAL_SEC", "60"))
    environment: Literal["dev", "staging", "production"] = os.environ.get(  # type: ignore
        "ENVIRONMENT", "dev"
    )
    instance_type: str | None = os.environ.get("INSTANCE_TYPE")

    gemini_api_key: str | None = os.environ.get("GEMINI_API_KEY")

    def get_db_connection_string(self) -> str:
        """Return the PostgreSQL connection string."""
        # 1. Prefer explicit DATABASE_URL
        if self.database_url and self.database_url.strip():
            return self.database_url.strip()

        # 2. Build from individual pieces
        if (
            self.db_user
            and self.db_pass
            and self.db_name
            and self.instance_unix_socket
            and all(v.strip() for v in [self.db_user, self.db_pass, self.db_name, self.instance_unix_socket])
        ):
            return (
                f"postgresql+psycopg2://{self.db_user}:{self.db_pass}"
                f"@/{self.db_name}?host={self.instance_unix_socket}"
            )

        raise ValueError(
            "Database configuration invalid.\n\n"
            "You must define either:\n"
            "  • DATABASE_URL\n"
            "  OR all four of:\n"
            "    • DB_USER\n"
            "    • DB_PASS\n"
            "    • DB_NAME\n"
            "    • INSTANCE_UNIX_SOCKET"
        )


# ─────────────────────────────────────────────────────────────
# Validation – runs when the module is imported
# ─────────────────────────────────────────────────────────────
missing = []

# Always required
for var in ("GCP_PROJECT_ID", "PUBSUB_TOPIC", "GEMINI_API_KEY"):
    if var not in os.environ or not os.environ[var].strip():
        missing.append(var)

# Conditional DB requirement
if not (os.environ.get("DATABASE_URL") or "").strip():
    for var in ("DB_USER", "DB_PASS", "DB_NAME", "INSTANCE_UNIX_SOCKET"):
        if var not in os.environ or not os.environ[var].strip():
            missing.append(var)

if missing:
    raise RuntimeError(
        "Missing or empty required environment variables:\n  • "
        + "\n  • ".join(missing)
        + "\n\nCheck your .env file or exported shell variables."
    )

# All good → create the singleton
config = Config()
