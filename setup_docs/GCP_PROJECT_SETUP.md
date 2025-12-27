# GCP Project Setup Guide

This guide covers how to set up a new GCP project for BaxPro deployment. Each environment (production and development) needs its own GCP project with completely separate infrastructure.

## Architecture

Each GCP project has its own:
- Terraform state bucket (`{project-id}-terraform-state`)
- Artifact Registry (`baxpro`)
- Cloud SQL instance
- Cloud Run service
- VPC Connector
- Load Balancer
- SSL Certificate
- All secrets

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed and configured
- GitHub repository for BaxPro

## Step 1: Create GCP Project

```bash
# For production
gcloud projects create YOUR_PROD_PROJECT_ID --name="BaxPro"

# For development
gcloud projects create YOUR_DEV_PROJECT_ID --name="BaxPro Dev"
```

Link billing account in the GCP Console.

## Step 2: Enable Required APIs

Run this for each project:

```bash
# Set your project (replace with your project ID)
export PROJECT_ID="YOUR_PROJECT_ID"  # your dev or production project ID

gcloud config set project $PROJECT_ID

# Enable all required APIs
gcloud services enable \
  iamcredentials.googleapis.com \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  compute.googleapis.com \
  vpcaccess.googleapis.com \
  servicenetworking.googleapis.com \
  secretmanager.googleapis.com \
  dns.googleapis.com \
  certificatemanager.googleapis.com \
  storage.googleapis.com \
  --project=$PROJECT_ID
```

**Wait 2-3 minutes** after enabling APIs before proceeding.

## Step 3: Set Up Workload Identity Federation

This allows GitHub Actions to authenticate to GCP without using service account keys.

```bash
# Set variables
export PROJECT_ID="YOUR_PROJECT_ID"  # your dev or production project ID
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
export GITHUB_ORG="your-github-username"  # or organization name
export GITHUB_REPO="baxpro"

# 1. Create Workload Identity Pool
gcloud iam workload-identity-pools create "github-pool" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# 2. Create OIDC Provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub Provider" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository == '${GITHUB_ORG}/${GITHUB_REPO}'"

# 3. Create Service Account
gcloud iam service-accounts create "github-actions-sa" \
  --project="${PROJECT_ID}" \
  --display-name="GitHub Actions Service Account"

# 4. Grant permissions to service account
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/editor"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/secretmanager.admin"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# 4b. Grant Cloud Functions deployment permissions (required for alert-processor)
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudfunctions.developer"

# 4c. Grant Cloud Build service account permissions (required for Cloud Functions 2nd Gen)
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-cloudbuild.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"

# 5. Allow GitHub to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding \
  "github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/github-pool/attribute.repository/${GITHUB_ORG}/${GITHUB_REPO}"


# For Compute
###############################
# Enable the Compute SA if it's disabled (common issue)
gcloud iam service-accounts enable ${PROJECT_NUMBER}-compute@developer.gserviceaccount.com --project=$PROJECT_ID

# Grant roles to the Compute Engine SA (the build executor)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"  # Core role for build execution

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/logging.logWriter"  # For writing build logs

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectViewer"  # To read your source zip from the bucket

# Also ensure Artifact Registry access (for runtime images)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Double-check Cloud Build SA (from before, but include logs/storage if missing)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.builder"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

## Step 4: Get Values for GitHub Secrets

```bash
# Get Workload Identity Provider (for GCP_WORKLOAD_IDENTITY_PROVIDER or GCP_WORKLOAD_IDENTITY_PROVIDER_DEV)
gcloud iam workload-identity-pools providers describe "github-provider" \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)"

# Service Account Email (for GCP_SERVICE_ACCOUNT_EMAIL or GCP_SERVICE_ACCOUNT_EMAIL_DEV)
echo "github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com"
```

## Step 5: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Navigate to **APIs & Services** > **Credentials**
4. Click **+ CREATE CREDENTIALS** > **OAuth client ID**

### Configure OAuth Consent Screen (first time only)

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type
3. Fill in:
   - App name: `BaxPro` (or `BaxPro Dev`)
   - User support email: Your email
   - Developer contact: Your email
4. Save and continue through scopes and test users

### Create OAuth Client ID

1. Application type: **Web application**
2. Name: `BaxPro Web Client` (or `BaxPro Dev Web Client`)
3. **Authorized JavaScript origins:**
   - Production: `https://baxpro.xyz`
   - Dev: `https://dev.baxpro.xyz`
   - Local: `http://localhost:5000`
4. **Authorized redirect URIs:**
   - Production: `https://baxpro.xyz/api/auth/google/callback`
   - Dev: `https://dev.baxpro.xyz/api/auth/google/callback`
   - Local: `http://localhost:5000/api/auth/google/callback`
5. Click **Create**
6. Copy the **Client ID** and **Client Secret**

## Step 6: Add GitHub Secrets

Go to your GitHub repo > **Settings** > **Secrets and variables** > **Actions**

### For Production (baxpro.xyz)

| Secret Name | Value |
|-------------|-------|
| `GCP_PROJECT_ID` | Your production project ID (e.g., `baxpro`) |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Output from Step 4 |
| `GCP_SERVICE_ACCOUNT_EMAIL` | `github-actions-sa@YOUR-PROJECT.iam.gserviceaccount.com` |
| `CUSTOM_DOMAIN` | `baxpro.xyz` |
| `GOOGLE_CLIENT_ID` | OAuth Client ID from Step 5 |
| `GOOGLE_CLIENT_SECRET` | OAuth Client Secret from Step 5 |

### For Development (dev.baxpro.xyz)

| Secret Name | Value |
|-------------|-------|
| `GCP_PROJECT_ID_DEV` | Your dev project ID |
| `GCP_WORKLOAD_IDENTITY_PROVIDER_DEV` | Output from Step 4 (dev project) |
| `GCP_SERVICE_ACCOUNT_EMAIL_DEV` | `github-actions-sa@YOUR_DEV_PROJECT.iam.gserviceaccount.com` |
| `CUSTOM_DOMAIN_DEV` | `dev.baxpro.xyz` |
| `GOOGLE_CLIENT_ID_DEV` | OAuth Client ID from Step 5 (dev project) |
| `GOOGLE_CLIENT_SECRET_DEV` | OAuth Client Secret from Step 5 (dev project) |

## Step 7: Deploy

Push to the appropriate branch:

```bash
# Deploy to dev
git push origin dev

# Deploy to production
git push origin main
```

## Troubleshooting

### "Cloud Resource Manager API has not been used"

Enable the API:
```bash
gcloud services enable cloudresourcemanager.googleapis.com --project=$PROJECT_ID
```
Wait 2-3 minutes and retry.

### "Identity and Access Management (IAM) API has not been used"

Enable the API:
```bash
gcloud services enable iam.googleapis.com --project=$PROJECT_ID
```
Wait 2-3 minutes and retry.

### "IAM Service Account Credentials API has not been used"

Enable the API:
```bash
gcloud services enable iamcredentials.googleapis.com --project=$PROJECT_ID
```
Wait 2-3 minutes and retry.

### "Unable to acquire impersonated credentials"

Check that:
1. The service account email is correctly formatted (full email address)
2. The Workload Identity User binding is set up correctly
3. The attribute condition matches your GitHub org/repo

### "Artifact Registry repository not found"

The workflow auto-creates the registry before Docker push:
```bash
gcloud artifacts repositories create baxpro \
  --repository-format=docker \
  --location=us-central1 \
  --project=$PROJECT_ID
```

### "Error creating Repository: the repository already exists"

This happens if the Artifact Registry already exists (created by workflow) but Terraform tries to create it. The workflow now manages Artifact Registry, not Terraform. If you have old Terraform state, remove it:
```bash
cd terraform
terraform state rm google_artifact_registry_repository.baxpro
```

### "VPC Connector not found"

Terraform creates this automatically. If there's an issue, check that `vpcaccess.googleapis.com` is enabled.

### "Permission 'cloudfunctions.functions.create' denied"

The GitHub Actions service account needs Cloud Functions developer permissions:
```bash
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:github-actions-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudfunctions.developer"
```

### "Build failed... missing permission on the build service account"

Cloud Functions 2nd Gen uses Cloud Build, which needs Artifact Registry and logging permissions:
```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-cloudbuild.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"
```

## Complete Setup Checklist

- [ ] GCP project created
- [ ] Billing enabled
- [ ] All APIs enabled (Step 2)
- [ ] Workload Identity Pool created
- [ ] OIDC Provider created
- [ ] Service Account created with permissions
- [ ] Workload Identity User binding added
- [ ] OAuth consent screen configured
- [ ] OAuth credentials created
- [ ] All GitHub secrets added
- [ ] First deployment successful
