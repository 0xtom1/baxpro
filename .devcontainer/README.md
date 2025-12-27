# BaxPro Dev Container

This devcontainer provides a consistent development environment for BaxPro with all necessary tools pre-installed.

## What's Included

### Base Image
- **Python 3.13-slim** - Latest Python with minimal footprint

### Development Tools
- **Terraform 1.6.0** - Infrastructure as Code
- **flake8** - Python linter
- **black** - Python code formatter
- **pytest** - Testing framework
- **mypy** - Static type checker
- **isort** - Import organizer

### VS Code Extensions
- Python language support
- Terraform language support
- GitHub Copilot (optional)

## Usage

### Option 1: VS Code Local
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Install [VS Code Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Open this project in VS Code
4. Click "Reopen in Container" when prompted
5. Wait for container to build (~2-3 minutes first time)

### Option 2: GitHub Codespaces
1. Go to your GitHub repository
2. Click **Code** → **Codespaces** → **Create codespace on main**
3. Wait for environment to load
4. Start coding!

## Features

### ✅ Auto-Format on Save
- **Black** formats Python code automatically
- **isort** organizes imports
- Configured with 119 character line length

### ✅ Code Quality
- **flake8** lints your code (max-line-length: 119)
- **mypy** checks types
- All tools run automatically in VS Code

### ✅ Terraform Support
- Syntax highlighting
- Auto-completion
- Validation on save

## Configuration Files

- **Dockerfile** - Container image definition
- **devcontainer.json** - VS Code configuration
- **.flake8** - Flake8 settings (max line length 119)
- **pyproject.toml** - Black, isort, mypy settings

## Customization

### Add Python Packages
Create a `requirements.txt` in the project root:
```
# requirements.txt
requests
boto3
```

The container will auto-install them on creation.

### Change Terraform Version
Edit `Dockerfile`:
```dockerfile
ARG TERRAFORM_VERSION=1.7.0  # Change version here
```

### Add VS Code Extensions
Edit `devcontainer.json`:
```json
"extensions": [
  "existing.extensions",
  "new.extension.id"
]
```

## Troubleshooting

### Container won't build
- Check Docker is running
- Try: **Dev Containers: Rebuild Container**

### Extensions not working
- Reload VS Code window
- Check extension compatibility with container

### Python not found
- Container uses `/usr/local/bin/python`
- Check Python version: `python --version`

## Port Forwarding

Ports automatically forwarded:
- **5000** - Frontend dev server
- **8080** - Backend server

Access at: `http://localhost:5000`

## Notes

- **Replit**: This devcontainer is for local/Codespaces development. Replit uses its own environment.
- **Performance**: First build takes 2-3 minutes. Subsequent starts are instant.
- **Storage**: Container stores data in Docker volume. Workspace folder is mounted from host.

## Learn More

- [VS Code Dev Containers](https://code.visualstudio.com/docs/devcontainers/containers)
- [GitHub Codespaces](https://github.com/features/codespaces)
- [Devcontainer Specification](https://containers.dev/)
