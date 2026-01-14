# Resend Email Integration Setup Guide

This guide walks you through deploying and configuring the Resend email service for admin notifications when users upload verification documents.

## Prerequisites

1. **Resend Account**: Sign up at [resend.com](https://resend.com)
2. **Supabase CLI**: Install the Supabase CLI if you haven't already
   ```bash
   npm install -g supabase
   ```

## Step 1: Get Your Resend API Key

1. Log in to your Resend dashboard
2. Navigate to **API Keys**
3. Create a new API key (name it something like "RentAloo Production")
4. Copy the API key (it starts with `re_`)

## Step 2: Configure Your Sending Domain (Recommended for Production)

For production use, you should verify a domain in Resend:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `rentaloo.com`)
4. Follow the DNS configuration instructions to verify your domain
5. Once verified, you can send from addresses like `notifications@rentaloo.com`

> **Note**: For testing, you can skip this step and use Resend's test domain, but emails will only be sent to verified recipients.

## Step 3: Deploy the Edge Function

The Edge Function has already been created at:
- `supabase/functions/send-verification-notification/index.ts`

To deploy it to Supabase:

```bash
cd /Users/mykolborghese/RentAloo-ai/rentaloo-ai
supabase functions deploy send-verification-notification
```

## Step 4: Configure Environment Variables

Set the required secrets for the Edge Function:

```bash
# Set your Resend API key
supabase secrets set RESEND_API_KEY="re_your_api_key_here"

# Optional: Set admin email (defaults to mykolb1@icloud.com)
supabase secrets set ADMIN_EMAIL="mykolb1@icloud.com"

# Optional: Set from email (defaults to notifications@rentaloo.com)
supabase secrets set FROM_EMAIL="notifications@rentaloo.com"

# Optional: Set your site URL for the review link in emails
supabase secrets set SITE_URL="https://rentaloo.com"
```

To set secrets, you can also use the Supabase Dashboard:
1. Go to your project dashboard
2. Navigate to **Edge Functions** > **send-verification-notification**
3. Click **Settings**
4. Add the secrets under **Environment Variables**

## Step 5: Test the Integration

To test that everything is working:

1. Log in to your app as a regular user
2. Navigate to the verification page (`/verification`)
3. Upload an identity document
4. Check that:
   - The document uploads successfully
   - An email is sent to `mykolb1@icloud.com`
   - The email contains the correct user information
   - The "Review Verification" link works correctly

## Email Configuration Details

### Default Configuration

- **Admin Email**: `mykolb1@icloud.com`
- **From Email**: `notifications@rentaloo.com`
- **Subject**: "New Verification Document Uploaded - [User Name]"

### Multiple Admin Emails

To send notifications to multiple admins, set `ADMIN_EMAIL` as a comma-separated list:

```bash
supabase secrets set ADMIN_EMAIL="admin1@rentaloo.com,admin2@rentaloo.com,mykolb1@icloud.com"
```

## Troubleshooting

### Edge Function Logs

View Edge Function logs to debug issues:

```bash
supabase functions logs send-verification-notification --follow
```

Or in the Supabase Dashboard:
1. Go to **Edge Functions**
2. Click on **send-verification-notification**
3. View the **Logs** tab

### Common Issues

1. **"RESEND_API_KEY is not configured"**
   - Make sure you've set the secret: `supabase secrets set RESEND_API_KEY="your_key"`
   - Verify the secret is set: `supabase secrets list`

2. **"Failed to send email: Domain not verified"**
   - Either verify your domain in Resend, or use a test email address that you've verified
   - For testing, try sending to the same email address you signed up with in Resend

3. **Emails not arriving**
   - Check your spam folder
   - Verify the API key is correct
   - Check Edge Function logs for errors
   - Verify your domain is properly configured in Resend

4. **Edge Function timeout**
   - The function has a 60-second timeout by default
   - Most email sends complete in under 2 seconds

## Email Template

The email includes:
- Professional gradient header
- User details (name, email, user ID, document type, upload time)
- "Review Verification" button that links to `/admin/verifications?userId=[user_id]`
- Mobile-responsive design
- Both HTML and plain text versions

## Next Steps

Once the email integration is working:

1. Consider implementing the admin verification dashboard at `/admin/verifications`
2. Add email notifications for other events (verification approved/rejected)
3. Customize the email template to match your brand

## Advanced: Database Trigger Alternative

For a more robust solution, you can replace the frontend-triggered approach with a database trigger that automatically calls the Edge Function when verification documents are uploaded. This ensures notifications are sent even if the frontend fails.

Let me know if you'd like to implement this approach!
