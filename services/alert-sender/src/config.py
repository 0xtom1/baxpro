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

    # ──────── DATABASE ────────
    database_url: str | None = os.environ.get("DATABASE_URL")

    db_user: str | None = os.environ.get("DB_USER")
    db_pass: str | None = os.environ.get("DB_PASS")
    db_name: str | None = os.environ.get("DB_NAME")
    db_host: str | None = os.environ.get("DB_HOST")
    instance_unix_socket: str | None = os.environ.get("INSTANCE_UNIX_SOCKET")

    # ──────── MESSAGING ────────
    sendgrid_api_key: str | None = os.environ.get("SENDGRID_API_KEY")

    environment: Literal["dev", "staging", "production"] = os.environ.get(  # type: ignore
        "ENVIRONMENT", "dev"
    )

    def get_db_connection_string(self) -> str:
        """Return the PostgreSQL connection string."""
        # 1. Prefer explicit DATABASE_URL
        if self.database_url and self.database_url.strip():
            return self.database_url.strip()

        # 2. TCP connection via private IP (for VPC connector)
        if self.db_host and self.db_user and self.db_pass and self.db_name:
            return (
                f"postgresql+psycopg2://{self.db_user}:{self.db_pass}"
                f"@{self.db_host}:5432/{self.db_name}"
            )

        # 3. Build from individual pieces
        if (
            self.db_user
            and self.db_pass
            and self.db_name
            and self.instance_unix_socket
            and all(
                v.strip()
                for v in [
                    self.db_user,
                    self.db_pass,
                    self.db_name,
                    self.instance_unix_socket,
                ]
            )
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
for var in ("GCP_PROJECT_ID", "SENDGRID_API_KEY"):
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
