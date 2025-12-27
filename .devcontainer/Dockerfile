FROM python:3.13-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    unzip \
    gnupg \
    ca-certificates \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install Google Cloud SDK
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee /etc/apt/sources.list.d/google-cloud-sdk.list \
    && curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg \
    && apt-get update \
    && apt-get install -y google-cloud-cli \
    && rm -rf /var/lib/apt/lists/*

# Install Terraform
ARG TERRAFORM_VERSION=1.6.0
RUN curl -fsSL https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip -o terraform.zip \
    && unzip terraform.zip \
    && mv terraform /usr/local/bin/ \
    && rm terraform.zip \
    && terraform --version

# Install Python development tools
RUN pip install --no-cache-dir \
    flake8 \
    black \
    pytest \
    mypy \
    isort

# Verify installations
RUN python --version \
    && terraform --version \
    && gcloud --version | head -1 \
    && node --version \
    && npm --version \
    && flake8 --version \
    && black --version \
    && pytest --version \
    && mypy --version \
    && isort --version

# Copy the alert-processor requirements file
COPY services/alert-processor/requirements.txt ./alert_processor_requirements.txt

# Install them (you can keep your existing pip install commands)
RUN pip install --no-cache-dir -r alert_processor_requirements.txt

# --- NEW: Create non-root user and copy auth script ---
RUN useradd -m -s /bin/bash appuser

# Copy the auth script (from .devcontainer/scripts/)
COPY .devcontainer/scripts/auth-gcloud.sh /home/appuser/auth-gcloud.sh
RUN chown appuser:appuser /home/appuser/auth-gcloud.sh \
    && chmod +x /home/appuser/auth-gcloud.sh

# Switch to non-root user
USER appuser

# Environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONBUFFERED=1
ENV PYTHONPATH="${PYTHONPATH}:/app"
ENV PATH="/usr/local/bin:/home/appuser/.local/bin:$PATH"

# Set working directory
WORKDIR /workspace

# Default command
CMD ["/bin/bash"]