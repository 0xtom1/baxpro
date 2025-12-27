# Setting Up baxpro.xyz Custom Domain

This guide walks you through configuring your custom domain **baxpro.xyz** for your Cloud Run deployment.

## Prerequisites

- BaxPro deployed to Cloud Run (follow DEPLOYMENT.md first)
- Access to your domain registrar (where you bought baxpro.xyz)
- Domain ownership verification in Google Cloud

## Step-by-Step Setup

### Step 1: Verify Domain Ownership

First, you need to prove to Google that you own baxpro.xyz:

1. **Open Google Cloud Console**
   - Go to: https://console.cloud.google.com
   - Select your project

2. **Navigate to Domain Verification**
   - Search for "Webmaster Central" in the search bar, or
   - Go to: https://www.google.com/webmasters/verification/

3. **Add Your Domain**
   - Click "Add a property"
   - Enter: `baxpro.xyz`
   - Choose verification method:
     - **Recommended**: TXT record (DNS)
     - Google will give you a TXT record to add

4. **Add TXT Record to Your Domain**
   - Go to your domain registrar (e.g., Namecheap, GoDaddy, Google Domains)
   - Find DNS settings for baxpro.xyz
   - Add the TXT record Google provided:
     ```
     Type: TXT
     Host: @ (or leave blank for root domain)
     Value: google-site-verification=XXXXXXXXX
     TTL: 3600 (or default)
     ```
   - Save changes (DNS propagation takes 5-60 minutes)

5. **Verify in Google Cloud**
   - Return to Google Cloud Console
   - Click "Verify" button
   - If successful, you'll see "Verified" status

### Step 2: Configure Custom Domain in GitHub

**The custom domain `baxpro.xyz` is already configured in Terraform!**

You just need to add it as a GitHub secret:

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add:
   - **Name:** `CUSTOM_DOMAIN`
   - **Value:** `baxpro.xyz`

That's it! When you deploy via GitHub Actions, Terraform will automatically:
- Create the domain mapping
- Configure SSL certificates
- Output the DNS records you need

To get DNS records after deployment:
```bash
gcloud run domain-mappings describe baxpro.xyz \
  --region=us-central1 \
  --format='value(status.resourceRecords)'
```

### Step 3: Configure DNS at Your Registrar

You need to point baxpro.xyz to Google Cloud's servers.

**Option A: Using A and AAAA Records (Recommended)**

After running `terraform output domain_mapping_status`, you'll see something like:

```
resourceRecords = [
  {
    name = "baxpro.xyz"
    rrdata = "216.239.32.21"
    type = "A"
  },
  {
    name = "baxpro.xyz"
    rrdata = "216.239.34.21"
    type = "A"
  },
  {
    name = "baxpro.xyz"
    rrdata = "2001:4860:4802:32::15"
    type = "AAAA"
  },
  ...
]
```

Go to your domain registrar and add these records:

1. **Delete existing A/AAAA records** for baxpro.xyz (if any)

2. **Add the A records** shown in the output:
   ```
   Type: A
   Host: @ (or leave blank)
   Value: 216.239.32.21
   TTL: 3600
   ```
   Repeat for each A record shown.

3. **Add the AAAA records** (IPv6):
   ```
   Type: AAAA
   Host: @ (or leave blank)
   Value: 2001:4860:4802:32::15
   TTL: 3600
   ```
   Repeat for each AAAA record shown.

4. **Save changes** at your registrar

**Option B: Using CNAME (for subdomain only)**

If you want to use `www.baxpro.xyz` instead:
```
Type: CNAME
Host: www
Value: ghs.googlehosted.com
TTL: 3600
```

### Step 4: Wait for DNS Propagation

DNS changes can take **5 minutes to 48 hours** to propagate worldwide.

**Check propagation status:**
```bash
# Check A records
dig baxpro.xyz

# Check AAAA records
dig baxpro.xyz AAAA

# Or use online tool
# https://www.whatsmydns.net/#A/baxpro.xyz
```

When you see Google's IP addresses, DNS is propagated!

### Step 5: Verify Domain Mapping

1. **Check mapping status in Terraform**
   ```bash
   cd terraform
   terraform output domain_mapping_status
   ```

2. **Visit your domain**
   ```
   https://baxpro.xyz
   ```

3. **SSL Certificate Auto-Provisioning**
   - Google automatically provisions an SSL certificate
   - This can take **15-30 minutes** after DNS propagates
   - Initially you might see "Not Secure" - this is normal
   - Once ready, you'll see the padlock icon 🔒

### Step 6: Optional - Redirect www to Root

To redirect www.baxpro.xyz → baxpro.xyz:

1. **Add CNAME for www**
   ```
   Type: CNAME
   Host: www
   Value: ghs.googlehosted.com
   TTL: 3600
   ```

2. **Update Terraform** to include www subdomain:
   ```hcl
   # In terraform/main.tf, add another domain mapping
   # Or handle redirects in your application code
   ```

## Troubleshooting

### "Domain verification failed"
- Wait 15-60 minutes after adding TXT record
- Check TXT record is correct: `dig TXT baxpro.xyz`
- Ensure there are no typos in the verification code

### "SSL certificate not provisioning"
- Ensure DNS is fully propagated (check with `dig`)
- Wait up to 24 hours for automatic provisioning
- Verify A/AAAA records point to Google's IPs

### "ERR_NAME_NOT_RESOLVED"
- DNS not propagated yet - wait longer
- Check DNS records at registrar are correct
- Try different DNS resolver: `8.8.8.8` (Google DNS)

### "This site can't be reached"
- Cloud Run service might not be running
- Check service status: `gcloud run services describe baxpro-production --region=us-central1`
- Verify domain mapping: `terraform output domain_mapping_status`

### Mixed Content Warnings
- Ensure all assets use HTTPS
- Check browser console for HTTP resources
- Update any hardcoded HTTP URLs in your code

## Common DNS Record Examples

### Namecheap
```
Type: A Record
Host: @
Value: 216.239.32.21
TTL: Automatic
```

### GoDaddy
```
Type: A
Name: @
Value: 216.239.32.21
TTL: 1 Hour
```

### Cloudflare
```
Type: A
Name: baxpro.xyz
IPv4: 216.239.32.21
Proxy: OFF (gray cloud)
TTL: Auto
```

**Important**: If using Cloudflare, turn OFF the proxy (gray cloud, not orange) for the initial setup.

## Verification Commands

```bash
# Check current DNS
dig baxpro.xyz

# Check domain verification
gcloud domains list-user-verified

# Check domain mapping
gcloud run domain-mappings describe baxpro.xyz \
  --region=us-central1

# View Cloud Run service URL
terraform output cloud_run_url
```

## Cost

**Custom domains on Cloud Run are FREE!** No additional charges for:
- Domain mapping
- SSL certificates
- IPv4/IPv6 support

You only pay for:
- Domain registration (varies by registrar)
- Cloud Run usage (compute/requests)

## Security Notes

- SSL certificates are automatically managed by Google
- Certificates auto-renew before expiration
- HTTPS is enforced automatically
- HTTP requests are redirected to HTTPS

## Next Steps

Once your domain is live:

1. Update marketing materials with https://baxpro.xyz
2. Configure Google Analytics with your domain
3. Set up email forwarding (if needed)
4. Consider adding a www → root redirect
5. Monitor site performance in Cloud Console

## Support Resources

- [Cloud Run Custom Domains](https://cloud.google.com/run/docs/mapping-custom-domains)
- [Domain Verification](https://cloud.google.com/storage/docs/domain-name-verification)
- [DNS Propagation Checker](https://www.whatsmydns.net/)
