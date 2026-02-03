# Mobile OAuth Setup Guide

## Overview

This guide explains how Google OAuth works with the Capacitor mobile app using the **AuthBridge** pattern. This approach requires **NO Supabase dashboard changes** because it uses an existing HTTPS redirect URL.

## Architecture

**Flow (AuthBridge Pattern):**
1. User taps "Sign in with Google" in mobile app
2. App opens system browser with Supabase OAuth URL
3. User authenticates with Google
4. Google redirects to Supabase
5. Supabase redirects to **web bridge**: `https://your-domain.com/auth/bridge`
6. Bridge page extracts tokens from URL hash
7. Bridge redirects to deep link: `rentaloo://auth/callback#access_token=...&refresh_token=...`
8. Android opens the app via deep link
9. App calls `supabase.auth.setSession()` with tokens
10. Browser closes automatically
11. User is logged in

**Why this works:**
- Supabase only sees an HTTPS URL (already in allowlist)
- No dashboard configuration changes needed
- Tokens are passed securely via deep link
- Works for all OAuth providers (Google, GitHub, Facebook, Twitter)

## Configuration Steps

### 1. Supabase Dashboard Configuration

**✅ NO CHANGES NEEDED!**

The mobile app uses the web bridge at `https://your-domain.com/auth/bridge`, which is already an allowed redirect URL in Supabase (any HTTPS URL from your domain is allowed by default).

**Optional:** If you want to use direct deep link flow (without bridge), add:
```
rentaloo://auth-callback
```
to Supabase Dashboard → Authentication → URL Configuration → Redirect URLs.

### 2. Google Cloud OAuth Configuration

**Navigate to:** Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs

**For Android Client:**
- **Application type:** Android
- **Package name:** `app.rentaloo.mobile`
- **SHA-1 certificate fingerprint:** (Get from your keystore)

**Redirect URIs:** Google automatically handles OAuth redirects for native apps, but ensure your Supabase project is configured correctly.

### 3. Android Manifest (Already Configured)

The deep link handler is already configured in `apps/mobile/android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <!-- Support both rentaloo://auth-callback and rentaloo://auth/callback -->
    <data android:scheme="rentaloo" android:host="auth-callback" />
    <data android:scheme="rentaloo" android:host="auth" android:pathPrefix="/callback" />
</intent-filter>
```

This allows Android to open the app when it receives URLs like:
- `rentaloo://auth/callback#access_token=...` (from AuthBridge)
- `rentaloo://auth-callback?code=...` (direct deep link, if configured)

## Implementation Details

### 1. Web Bridge (`src/pages/auth/AuthBridge.tsx`)

The bridge page extracts tokens from Supabase OAuth redirect and forwards to mobile app:

```typescript
useEffect(() => {
  // Get tokens from URL hash (Supabase puts them here)
  const hash = window.location.hash?.slice(1);
  const params = new URLSearchParams(hash);

  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  if (access_token && refresh_token) {
    // Redirect to mobile app with tokens
    const deepLinkUrl = `rentaloo://auth/callback#access_token=${access_token}&refresh_token=${refresh_token}`;
    window.location.href = deepLinkUrl;
  }
}, []);
```

### 2. Deep Link Listener (`apps/mobile/src/App.tsx`)

The mobile shell listens for deep link events and handles both token and code flows:

```typescript
CapApp.addListener('appUrlOpen', async ({ url }) => {
  // Handle both rentaloo://auth-callback and rentaloo://auth/callback
  if (!url.startsWith('rentaloo://auth')) return;

  const urlObj = new URL(url);
  const hash = urlObj.hash?.slice(1);
  const hashParams = new URLSearchParams(hash);

  // Try token flow first (from AuthBridge)
  const access_token = hashParams.get('access_token');
  const refresh_token = hashParams.get('refresh_token');

  if (access_token && refresh_token) {
    await supabase.auth.setSession({ access_token, refresh_token });
    await Browser.close();
  } else {
    // Fallback: PKCE code exchange (direct deep link)
    const code = urlObj.searchParams.get('code');
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
      await Browser.close();
    }
  }
});
```

### 3. OAuth Trigger (`src/contexts/AuthContext.tsx`)

The `signInWithOAuth` function detects native platform and uses the web bridge:

```typescript
if (isNative) {
  // Use web bridge URL (no Supabase dashboard changes needed!)
  const bridgeUrl = `${window.location.origin}/auth/bridge`;
  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: bridgeUrl,
      skipBrowserRedirect: true
    }
  });

  await Browser.open({ url: data.url });
}
```

## Testing

### 1. Build and Install

```bash
pnpm -C apps/mobile exec vite build
pnpm -C apps/mobile exec cap sync android
cd apps/mobile/android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 2. Monitor Logs

```bash
adb logcat -s "Capacitor/Console:*" | grep -iE "APP_URL_OPEN|OAUTH|auth-callback"
```

### 3. Expected Log Output

**AuthBridge flow (default):**
```
APP_URL_OPEN rentaloo://auth/callback#access_token=...&refresh_token=...
OAUTH_TOKENS_RECEIVED
OAUTH_SESSION_SET_OK
```

**Direct deep link flow (if configured):**
```
APP_URL_OPEN rentaloo://auth-callback?code=...
OAUTH_CODE_RECEIVED
OAUTH_EXCHANGED_OK
```

## Troubleshooting

### Browser doesn't close after login
- Check that `Browser.close()` is called after successful exchange
- Verify deep link listener is registered

### App doesn't open after OAuth
- Verify `rentaloo://auth-callback` is in Supabase redirect URLs
- Check AndroidManifest.xml has correct intent-filter
- Test deep link manually: `adb shell am start -a android.intent.action.VIEW -d "rentaloo://auth-callback?code=test"`

### OAuth exchange fails
- Check Supabase logs for errors
- Verify PKCE flow is enabled in Supabase Auth settings
- Ensure code is being extracted correctly from URL

## Security Notes

- **PKCE Flow:** Supabase uses PKCE (Proof Key for Code Exchange) for OAuth, which is secure for mobile apps
- **Deep Links:** The `rentaloo://` scheme is app-specific and cannot be intercepted by other apps
- **Code Exchange:** The authorization code is exchanged server-side by Supabase, never exposing tokens in the URL

