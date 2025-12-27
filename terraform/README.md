# BaxPro Terraform Infrastructure

This directory contains Terraform infrastructure-as-code for deploying BaxPro to Google Cloud Platform.

## Quick Start

```bash
# 1. Install prerequisites
# - Terraform 1.0+
# - gcloud CLI
# - Docker

# 2. Authenticate with GCP
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
gcloud auth configure-docker us-central1-docker.pkg.dev

# 3. Configure variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your project_id

# 4. Initialize and deploy
terraform init
terraform plan
terraform apply
```

See [../DEPLOYMENT.md](../DEPLOYMENT.md) for the complete deployment guide.

## Infrastructure Components

### Compute
- **Cloud Run**: Serverless container hosting with auto-scaling
- **Service Account**: Least-privilege service account for Cloud Run

### Database
- **Cloud SQL**: Managed PostgreSQL 15 instance
- **Database & User**: Auto-created with secure random password

### Storage & Secrets
- **Artifact Registry**: Docker image repository
- **Secret Manager**: Secure storage for DATABASE_URL and SESSION_SECRET

### Networking
- **Public Access**: Cloud Run service accessible via HTTPS
- **Cloud SQL Proxy**: Secure database connection from Cloud Run

## Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `project_id` | GCP Project ID | **required** |
| `region` | GCP region | `us-central1` |
| `environment` | Environment name | `production` |
| `image_tag` | Docker image tag | `latest` |
| `db_tier` | Cloud SQL tier | `db-f1-micro` |
| `cloud_run_cpu` | CPU allocation | `1` |
| `cloud_run_memory` | Memory allocation | `512Mi` |
| `min_instances` | Min instances | `0` |
| `max_instances` | Max instances | `10` |

## Outputs

After deployment, Terraform displays:
- Cloud Run service URL
- Artifact Registry URL
- Database connection details
- Secret IDs

Access outputs anytime:
```bash
terraform output cloud_run_url
```

## Cost Estimation

### Free Tier Configuration
```hcl
db_tier = "db-f1-micro"
min_instances = 0
cloud_run_cpu = "1"
cloud_run_memory = "512Mi"
```
**Estimated cost**: $0-10/month (within free tier limits)

### Production Configuration
```hcl
db_tier = "db-custom-2-7680"
min_instances = 1
max_instances = 100
cloud_run_cpu = "2"
cloud_run_memory = "1Gi"
```
**Estimated cost**: $50-200/month (depending on traffic)

## File Structure

```
terraform/
├── main.tf              # Main infrastructure definitions
├── variables.tf         # Input variable declarations
├── outputs.tf           # Output value definitions
├── terraform.tfvars     # Your values (gitignored)
├── terraform.tfvars.example  # Example values
└── README.md           # This file
```

## Common Commands

```bash
# View current state
terraform show

# List resources
terraform state list

# Get specific output
terraform output -raw cloud_run_url

# Update single variable
terraform apply -var="image_tag=v1.1.0"

# Destroy everything
terraform destroy
```

## Troubleshooting

### First Apply Fails
**Issue**: Cloud Run deployment fails because image doesn't exist yet.

**Solution**: This is expected. Follow the deployment guide to push the Docker image, then re-run `terraform apply`.

### Permission Denied
**Issue**: `Error 403: Permission denied`

**Solution**: Ensure your account has Project Editor or Owner role:
```bash
gcloud projects get-iam-policy PROJECT_ID
```

### Database Connection Issues
**Issue**: Cloud Run can't connect to Cloud SQL

**Solution**: Verify service account has `cloudsql.client` role and Cloud SQL Proxy is configured correctly in the Cloud Run template.

## Security Notes

- Secrets are stored in Secret Manager (never in code)
- Database passwords are randomly generated
- Service account uses least-privilege IAM roles
- SSL enforced for database connections
- All terraform.tfvars files are gitignored

## Next Steps

1. Review [../DEPLOYMENT.md](../DEPLOYMENT.md) for complete deployment instructions
2. Set up CI/CD pipeline for automated deployments
3. Configure custom domain in Cloud Run
4. Enable Cloud Monitoring and alerting
5. Implement automated backups
