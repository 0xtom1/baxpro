# CI/CD Quick Start Guide

Get automated deployments running in 10 minutes.

## TL;DR

```bash
# 1. Set up GCP authentication
export PROJECT_ID="your-project-id"
export GITHUB_REPO="username/baxpro"

# Run the setup script
bash scripts/setup-github-actions.sh

# 2. Add secrets to GitHub
# Go to: Settings → Secrets → Actions → New repository secret
# Add: GCP_PROJECT_ID, GCP_WORKLOAD_IDENTITY_PROVIDER, GCP_SERVICE_ACCOUNT_EMAIL

# 3. Push to main → auto-deploy! 🚀
git push origin main
```

## What Gets Automated

Every push to `main` triggers:
1. ✅ Docker build
2. ✅ Push to Artifact Registry
3. ✅ Terraform deployment
4. ✅ Cloud Run update

Pull requests trigger:
1. ✅ Build validation
2. ✅ Type checking
3. ✅ Terraform validation

## Setup Steps

### 1. Create GCP Service Account

```bash
export PROJECT_ID="your-gcp-project-id"

gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions" \
  --project=$PROJECT_ID

# Grant permissions
for role in run.admin cloudsql.admin artifactregistry.admin secretmanager.admin iam.serviceAccountUser storage.admin; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
    --role="roles/${role}"
done
```

### 2. Set Up Workload Identity

```bash
# Create pool
gcloud iam workload-identity-pools create "github-pool" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Create provider
export GITHUB_REPO="your-username/your-repo"  # e.g., "johndoe/baxpro"

gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Allow impersonation
POOL_ID=$(gcloud iam workload-identity-pools describe github-pool \
  --project="${PROJECT_ID}" --location="global" --format="value(name)")

gcloud iam service-accounts add-iam-policy-binding \
  "github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_ID}/attribute.repository/${GITHUB_REPO}"
```

### 3. Get Values for GitHub Secrets

```bash
# Get Workload Identity Provider (copy this whole value)
gcloud iam workload-identity-pools providers describe github-provider \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)"

# Get Service Account Email
echo "github-actions@${PROJECT_ID}.iam.gserviceaccount.com"
```

### 4. Add GitHub Secrets

Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions`

Add these secrets:

| Secret | Value |
|--------|-------|
| `GCP_PROJECT_ID` | your-project-id |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | projects/123.../providers/github-provider |
| `GCP_SERVICE_ACCOUNT_EMAIL` | github-actions@project.iam.gserviceaccount.com |
| `CUSTOM_DOMAIN` | baxpro.xyz (optional) |

### 5. Set Up Terraform State (Optional but Recommended)

```bash
# Create bucket
gsutil mb -p $PROJECT_ID gs://${PROJECT_ID}-terraform-state
gsutil versioning set on gs://${PROJECT_ID}-terraform-state

# Edit terraform/backend.tf and uncomment the backend block
# Then migrate:
cd terraform
terraform init -migrate-state
```

### 6. Test

```bash
# Manual trigger
# Go to: Actions → Deploy to GCP → Run workflow

# Or push to main
git push origin main
```

## Workflows

### Main Deployment (`.github/workflows/deploy.yml`)
- **Triggers**: Push to `main`, manual
- **Actions**: Build → Push → Deploy
- **Duration**: ~5-10 minutes

### PR Validation (`.github/workflows/test.yml`)
- **Triggers**: Pull requests to `main`
- **Actions**: Type check → Build → Validate
- **Duration**: ~3-5 minutes

## Monitoring

```bash
# View deployments
gcloud run revisions list --service=baxpro-production --region=us-central1

# View logs
gcloud run services logs read baxpro-production --region=us-central1

# GitHub CLI
gh run list
gh run watch
```

## Troubleshooting

### "Failed to authenticate"
→ Check workload identity provider value in GitHub secrets

### "Permission denied"
→ Verify service account has all required roles

### "State locked"
→ Someone else is deploying. Wait or break lock:
```bash
cd terraform
terraform force-unlock LOCK_ID
```

## Need More Details?

See **GITHUB_ACTIONS_SETUP.md** for complete documentation.

## Rolling Back

```bash
# List revisions
gcloud run revisions list --service=baxpro-production --region=us-central1

# Route traffic to previous revision
gcloud run services update-traffic baxpro-production \
  --to-revisions=REVISION_NAME=100 \
  --region=us-central1
```

## Cost

- GitHub Actions: **Free** for public repos, 2,000 min/month for private
- GCP resources: Same as manual deployment
- Each deployment: ~5-10 minutes runtime

## Next Steps

- Add automated tests
- Set up staging environment
- Add Slack notifications
- Implement canary deployments
