FROM mcr.microsoft.com/devcontainers/python:1-3.11-bullseye

# System deps
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
        libpq-dev \
        postgresql-client \
        curl \
    && rm -rf /var/lib/apt/lists/*

# ───── Install Google Cloud CLI (gcloud) ─────
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | \
    tee /etc/apt/sources.list.d/google-cloud-sdk.list && \
    curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | \
    gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg && \
    apt-get update && \
    apt-get install -y google-cloud-cli && \
    rm -rf /var/lib/apt/lists/*

# ───── Install Cloud SQL Auth Proxy (standalone binary) ─────
RUN curl -L https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.0/cloud-sql-proxy.linux.amd64 \
    -o /usr/local/bin/cloud-sql-proxy && \
    chmod +x /usr/local/bin/cloud-sql-proxy
    
# Python tools + app deps
RUN pip install --upgrade pip
COPY requirements.txt /tmp/
RUN pip install -r /tmp/requirements.txt
RUN pip install black ruff pytest pytest-asyncio ipython

# # ←←← ADD THESE TWO LINES HERE ←←←
# # This works because build context = .. (monorepo root)
COPY scripts/*.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/*.sh

USER vscode
WORKDIR /workspaces/alert-sender

CMD ["sleep", "infinity"]