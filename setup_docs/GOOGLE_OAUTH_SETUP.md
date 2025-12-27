# Google OAuth Setup Guide

## Overview
This guide walks you through setting up Google OAuth authentication for BaxPro.

## Step 1: Get Your Replit Development URL

Your current Replit dev URL is:
```
https://d5e63cea-11d1-4ff8-898c-7c4e87a99130-00-2kezvym74kcq0.kirk.replit.dev
```

You'll need this for the next step.

## Step 2: Create Google OAuth Credentials

### Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a project** → **New Project**
3. Name it "BaxPro" (or anything you prefer)
4. Click **Create**

### Configure OAuth Consent Screen

1. In the left sidebar, go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Click **Create**
4. Fill in the required fields:
   - **App name**: BaxPro
   - **User support email**: Your email
   - **Developer contact**: Your email
5. Click **Save and Continue**
6. Skip the **Scopes** section (click **Save and Continue**)
7. **IMPORTANT: Add Test Users**
   - Click **Add Users**
   - Enter your Google email address (the one you'll use to sign in)
   - Click **Add**
   - Click **Save and Continue**
8. Click **Back to Dashboard**

> **Note:** Your app starts in "Testing" mode. Only test users you add can sign in. Once you're ready for anyone to use it, you can publish the app to production.

### Create OAuth Client ID

1. In the left sidebar, go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Application type**: Web application
4. **Name**: BaxPro Web Client
5. Under **Authorized redirect URIs**, click **Add URI** and add:
   ```
   https://d5e63cea-11d1-4ff8-898c-7c4e87a99130-00-2kezvym74kcq0.kirk.replit.dev/api/auth/google/callback
   ```
   
6. Click **Create**
7. A dialog will show your **Client ID** and **Client Secret**
8. **Keep this dialog open** - you'll need these values in the next step

## Step 3: Add Credentials to Replit

You've already added the credentials using Replit Secrets! The app is now configured to use real Google authentication.

## Step 4: Test Google Login

**IMPORTANT: Open BaxPro in a real browser tab (not the Replit preview)**

1. In the Replit Webview pane, click the **"Open in new tab"** icon at the top
2. This opens BaxPro in a real browser tab
3. Sign into your Google account in that browser (if you're not already)
4. Click the "Continue with Google" button on the BaxPro login page
5. You'll be redirected to Google's authorization page
6. Grant permissions to BaxPro
7. You'll be redirected back to BaxPro and logged in!

> **Why a real browser tab?** The Replit preview has limited functionality and may not work with Google's authentication flow. Using a real browser tab ensures everything works correctly.

## Production Setup (When Deploying)

When you're ready to deploy BaxPro to production (baxpro.xyz):

1. Go back to **Google Cloud Console** → **Credentials**
2. Edit your OAuth client
3. Add the production redirect URI:
   - `https://baxpro.xyz/api/auth/google/callback`
4. Click **Save**

The same Client ID and Secret will work for both development and production!

## Troubleshooting

### "redirect_uri_mismatch" Error

This means the redirect URI in Google Cloud Console doesn't match exactly. Double-check:
- Your Replit dev URL is correct (check the Webview)
- The path ends with `/api/auth/google/callback`
- There are no extra spaces or typos

### "invalid_client" Error

This means the Client ID or Secret is incorrect:
- Double-check you copied both values correctly
- Make sure there are no extra spaces
- Try regenerating the credentials in Google Cloud Console

## Security Notes

- Never share your Client Secret publicly
- The Client Secret is stored securely in Replit Secrets
- Each environment (dev/production) can use the same credentials
- You can rotate credentials anytime in Google Cloud Console
