# OAuth Fix Summary - VITE_PUBLIC_WEB_URL

## Problem Identified

**Issue:** Mobile OAuth was using `window.location.origin` which is `https://localhost` in Capacitor, causing the OAuth redirect to fail.

**Log Evidence:**
```
OAUTH_OPENING_BROWSER https://...redirect_to=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fbridge
```

This means Supabase tries to redirect to `http://localhost:5173/auth/bridge` which doesn't exist on the user's device.

## Solution Implemented

### 1. Added VITE_PUBLIC_WEB_URL Environment Variable

**Purpose:** Store the production web app URL where `/auth/bridge` exists.

**Files Modified:**
- `.env.local` - Added `VITE_PUBLIC_WEB_URL=http://localhost:5173` (for local dev)
- `apps/mobile/.env` - Added `VITE_PUBLIC_WEB_URL=http://localhost:5173` (for local dev)
- `apps/mobile/.env.example` - Added `VITE_PUBLIC_WEB_URL=https://your-production-domain.com`

### 2. Updated signInWithOAuth to Use VITE_PUBLIC_WEB_URL

**File:** `src/contexts/AuthContext.tsx`

**Before:**
```typescript
const bridgeUrl = `${window.location.origin}/auth/bridge`; // ❌ https://localhost in Capacitor
```

**After:**
```typescript
const webUrl = import.meta.env.VITE_PUBLIC_WEB_URL || window.location.origin;
const bridgeUrl = `${webUrl}/auth/bridge`; // ✅ Uses production URL
console.log('OAUTH_START', { provider, redirectTo: bridgeUrl });
```

### 3. Added Enhanced Logging

**OAuth Start Logs:**
- `OAUTH_START` - Shows provider and redirectTo URL
- `OAUTH_OPENING_BROWSER` - Shows full OAuth URL
- `OAUTH_START_ERROR` - Shows any errors during OAuth initiation

**Deep Link Handler Logs:**
- `APP_URL_OPEN` - Shows received deep link URL
- `OAUTH_TOKENS_RECEIVED` - Shows token lengths (not actual tokens)
- `OAUTH_SESSION_SET_OK` / `OAUTH_SESSION_SET_FAIL` - Session result
- `OAUTH_CODE_RECEIVED` - Shows code length (fallback flow)
- `OAUTH_EXCHANGED_OK` / `OAUTH_EXCHANGE_FAIL` - Code exchange result
- `OAUTH_NO_TOKENS_OR_CODE` - Error if neither tokens nor code found

## What User Needs to Do

### Step 1: Find Production Web App URL

The user needs to determine where their web app is deployed. Common options:

1. **Vercel:** `https://your-project.vercel.app` or custom domain
2. **Netlify:** `https://your-project.netlify.app` or custom domain
3. **Custom Domain:** `https://vaymo.com`, `https://rentaloo.com`, etc.
4. **Other:** Any HTTPS URL where the web app is accessible

### Step 2: Update Environment Variables

**In `.env.local` (for web app):**
```env
VITE_PUBLIC_WEB_URL=https://your-production-domain.com
```

**In `apps/mobile/.env` (for mobile app):**
```env
VITE_PUBLIC_WEB_URL=https://your-production-domain.com
```

**Important:** Both files must have the same URL!

### Step 3: Rebuild and Test

```bash
# Rebuild mobile app
pnpm -C apps/mobile exec vite build
pnpm -C apps/mobile exec cap sync android
cd apps/mobile/android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Launch app
adb shell am force-stop app.rentaloo.mobile
adb shell am start -n app.rentaloo.mobile/.MainActivity

# Monitor logs
adb logcat -s "Capacitor/Console:*" | grep -iE "OAUTH|APP_URL_OPEN"
```

### Step 4: Verify Logs

**Expected log output:**
```
OAUTH_START { provider: 'google', redirectTo: 'https://your-domain.com/auth/bridge' }
OAUTH_OPENING_BROWSER https://...redirect_to=https%3A%2F%2Fyour-domain.com%2Fauth%2Fbridge
APP_URL_OPEN rentaloo://auth/callback#access_token=...&refresh_token=...
OAUTH_TOKENS_RECEIVED { access_token_length: 234, refresh_token_length: 43 }
OAUTH_SESSION_SET_OK
```

**❌ Wrong (localhost):**
```
OAUTH_OPENING_BROWSER https://...redirect_to=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fbridge
```

**✅ Correct (production domain):**
```
OAUTH_OPENING_BROWSER https://...redirect_to=https%3A%2F%2Fvaymo.vercel.app%2Fauth%2Fbridge
```

## Testing Checklist

- [ ] Set `VITE_PUBLIC_WEB_URL` in both `.env.local` and `apps/mobile/.env`
- [ ] Rebuild mobile app
- [ ] Install APK on device
- [ ] Open app and tap "Sign in with Google"
- [ ] Check logs for `OAUTH_START` with correct redirectTo URL
- [ ] Complete Google login in browser
- [ ] Verify browser redirects to `/auth/bridge`
- [ ] Verify app reopens via deep link
- [ ] Check logs for `OAUTH_SESSION_SET_OK`
- [ ] Verify user is logged in

## Troubleshooting

### Browser doesn't redirect back to app
- Check that `VITE_PUBLIC_WEB_URL` is set to production domain
- Verify `/auth/bridge` exists at that URL
- Check browser network tab for redirect chain

### "OAUTH_NO_TOKENS_OR_CODE" error
- AuthBridge didn't send tokens in deep link
- Check browser console on `/auth/bridge` page
- Verify Supabase OAuth is configured correctly

### "OAUTH_SESSION_SET_FAIL" error
- Tokens are invalid or expired
- Check Supabase logs for session errors
- Verify Supabase project URL and anon key are correct

