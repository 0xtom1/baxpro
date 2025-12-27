# GitHub Actions CI/CD Setup

This guide shows you how to set up automated deployments to GCP whenever you push to the `main` branch.

## Overview

The GitHub Actions workflow will automatically:
1. ✅ Build a Docker image
2. ✅ Push to Google Artifact Registry
3. ✅ Run Terraform to deploy to Cloud Run
4. ✅ Update with the latest code

## Prerequisites

- GitHub repository with your BaxPro code
- GCP project with billing enabled
- Terraform state backend configured (optional but recommended)

## Step 1: Set Up GCP Workload Identity Federation

Workload Identity Federation is the **secure, recommended** way to authenticate GitHub Actions to GCP (no service account keys needed).

### 1.1 Enable Required APIs

```bash
gcloud services enable iamcredentials.googleapis.com \
  --project=YOUR_PROJECT_ID
```

### 1.2 Create a Service Account for GitHub Actions

```bash
# Set your project ID
export PROJECT_ID="your-gcp-project-id"

# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deployment" \
  --project=$PROJECT_ID

# Grant necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

### 1.3 Create Workload Identity Pool

```bash
# Create workload identity pool
gcloud iam workload-identity-pools create "github-pool" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Get the pool ID
export POOL_ID=$(gcloud iam workload-identity-pools describe github-pool \
  --project="${PROJECT_ID}" \
  --location="global" \
  --format="value(name)")

echo "Pool ID: $POOL_ID"
```

### 1.4 Create Workload Identity Provider

Replace `YOUR_GITHUB_USERNAME` and `YOUR_REPO_NAME` below:

```bash
export GITHUB_REPO="YOUR_GITHUB_USERNAME/YOUR_REPO_NAME"  # e.g., "johndoe/baxpro"

gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Get the provider resource name
export WORKLOAD_IDENTITY_PROVIDER=$(gcloud iam workload-identity-pools providers describe github-provider \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)")

echo "Workload Identity Provider: $WORKLOAD_IDENTITY_PROVIDER"
```

### 1.5 Allow GitHub to Impersonate Service Account

```bash
gcloud iam service-accounts add-iam-policy-binding "github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_ID}/attribute.repository/${GITHUB_REPO}"
```

## Step 2: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

### Required Secrets

| Secret Name | Value | Example |
|------------|-------|---------|
| `GCP_PROJECT_ID` | Your GCP project ID | `baxpro-prod-12345` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full provider resource name from step 1.4 | `projects/123.../locations/global/workloadIdentityPools/github-pool/providers/github-provider` |
| `GCP_SERVICE_ACCOUNT_EMAIL` | Service account email | `github-actions@baxpro-prod-12345.iam.gserviceaccount.com` |

### Optional Secrets

| Secret Name | Value | Example |
|------------|-------|---------|
| `CUSTOM_DOMAIN` | Your custom domain | `baxpro.xyz` |

**To get the Workload Identity Provider value:**
```bash
echo $WORKLOAD_IDENTITY_PROVIDER
```

Copy the full output (starts with `projects/...`) and paste into GitHub.

## Step 3: Set Up Terraform State Backend (Recommended)

For CI/CD, store Terraform state in Google Cloud Storage:

### 3.1 Create GCS Bucket

```bash
export PROJECT_ID="your-gcp-project-id"
export BUCKET_NAME="${PROJECT_ID}-terraform-state"

# Create bucket
gsutil mb -p $PROJECT_ID -l us-central1 gs://$BUCKET_NAME

# Enable versioning (important for rollbacks)
gsutil versioning set on gs://$BUCKET_NAME

# Set lifecycle policy to keep old versions
cat > lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "numNewerVersions": 3,
          "isLive": false
        }
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://$BUCKET_NAME
rm lifecycle.json
```

### 3.2 Update Terraform Backend Configuration

Edit `terraform/backend.tf` and uncomment the backend block:

```hcl
terraform {
  backend "gcs" {
    bucket = "your-project-id-terraform-state"  # Use your bucket name
    prefix = "terraform/state"
  }
}
```

### 3.3 Migrate Local State to GCS

```bash
cd terraform
terraform init -migrate-state
```

Type `yes` when prompted to migrate state.

## Step 4: Test the Workflow

### Manual Test

1. Go to GitHub → Actions tab
2. Click "Deploy to GCP" workflow
3. Click "Run workflow" → Run on main branch
4. Watch the deployment progress

### Automatic Deployment

Simply push to main:

```bash
git add .
git commit -m "Set up CI/CD deployment"
git push origin main
```

GitHub Actions will automatically:
- Build your Docker image
- Push to Artifact Registry
- Deploy via Terraform
- Update Cloud Run

## Step 5: Monitor Deployments

### View Workflow Runs

- Go to: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`
- Click on any workflow run to see detailed logs

### View Deployment in GCP

```bash
# Get Cloud Run service status
gcloud run services describe baxpro-production \
  --region=us-central1 \
  --format=yaml

# View recent revisions
gcloud run revisions list \
  --service=baxpro-production \
  --region=us-central1
```

## Troubleshooting

### Error: "Workload Identity Federation authentication failed"

**Solution**: Verify the workload identity provider and service account are configured correctly:

```bash
# Check provider exists
gcloud iam workload-identity-pools providers describe github-provider \
  --project=$PROJECT_ID \
  --location=global \
  --workload-identity-pool=github-pool

# Check service account IAM binding
gcloud iam service-accounts get-iam-policy \
  github-actions@${PROJECT_ID}.iam.gserviceaccount.com
```

### Error: "Permission denied" during Terraform

**Solution**: Ensure service account has all required roles:

```bash
# List current roles
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:github-actions@${PROJECT_ID}.iam.gserviceaccount.com"
```

### Error: "Backend initialization required"

**Solution**: Your Terraform state is not configured. Either:

1. Configure GCS backend (recommended for CI/CD)
2. Or commit `.terraform/` to git (not recommended)

### Error: "Docker push authentication failed"

**Solution**: Verify Artifact Registry permissions:

```bash
# Check registry exists
gcloud artifacts repositories describe baxpro \
  --location=us-central1

# Verify service account has access
gcloud artifacts repositories get-iam-policy baxpro \
  --location=us-central1
```

### Deployment succeeds but app doesn't work

**Solution**: Check Cloud Run logs:

```bash
gcloud run services logs read baxpro-production \
  --region=us-central1 \
  --limit=100
```

## Alternative: Service Account Key Method (Not Recommended)

If you can't use Workload Identity Federation, you can use a service account key:

**⚠️ Warning**: Service account keys are less secure. Use Workload Identity Federation when possible.

```bash
# Create service account key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com

# Add to GitHub Secrets as GCP_SA_KEY
# Copy the entire contents of github-actions-key.json
cat github-actions-key.json

# Delete local copy
rm github-actions-key.json
```

Then modify the workflow to use:
```yaml
- name: Authenticate to Google Cloud
  uses: google-github-actions/auth@v2
  with:
    credentials_json: ${{ secrets.GCP_SA_KEY }}
```

## Security Best Practices

1. ✅ Use Workload Identity Federation (not service account keys)
2. ✅ Grant minimum necessary permissions
3. ✅ Enable branch protection on `main`
4. ✅ Require pull request reviews
5. ✅ Use environment secrets for production
6. ✅ Rotate service account keys regularly (if using keys)
7. ✅ Monitor deployment logs for suspicious activity

## Cost Optimization

GitHub Actions includes:
- **2,000 minutes/month free** (public repos: unlimited)
- Each deployment takes ~5-10 minutes

For frequent deployments:
- Enable workflow caching (Docker layers)
- Deploy only on version tags instead of every commit
- Use GitHub's larger runners for faster builds (paid)

## Next Steps

1. Set up staging environment (separate workflow)
2. Add automated tests before deployment
3. Implement blue-green deployments
4. Set up Slack/Discord notifications on deploy
5. Add rollback workflow for emergencies

## Useful Commands

```bash
# View workflow runs
gh run list --workflow=deploy.yml

# Watch latest workflow
gh run watch

# Cancel a running workflow
gh run cancel RUN_ID

# Re-run failed workflow
gh run rerun RUN_ID

# View workflow logs
gh run view RUN_ID --log
```

## Support Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation)
- [Cloud Run CI/CD](https://cloud.google.com/run/docs/continuous-deployment)
