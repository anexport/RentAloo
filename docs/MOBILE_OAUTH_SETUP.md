# Mobile OAuth Setup Guide

## Overview

This guide explains how to configure Google OAuth to work with the Capacitor mobile app, ensuring users are redirected back to the app after authentication instead of staying in the browser.

## Architecture

**Flow:**
1. User taps "Sign in with Google" in mobile app
2. App opens system browser with Supabase OAuth URL
3. User authenticates with Google
4. Google redirects to Supabase
5. Supabase redirects to deep link: `rentaloo://auth-callback?code=...`
6. Android opens the app via deep link
7. App exchanges code for session with Supabase
8. Browser closes automatically
9. User is logged in

## Configuration Steps

### 1. Supabase Dashboard Configuration

**Navigate to:** Supabase Dashboard → Authentication → URL Configuration

**Add Redirect URL:**
```
rentaloo://auth-callback
```

**Important:** This URL must be added to the "Redirect URLs" allowlist in Supabase Auth settings.

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
    <data android:scheme="rentaloo" android:host="auth-callback" />
</intent-filter>
```

This allows Android to open the app when it receives a URL like `rentaloo://auth-callback?code=...`

## Implementation Details

### Deep Link Listener (`apps/mobile/src/App.tsx`)

The mobile shell listens for deep link events:

```typescript
CapApp.addListener('appUrlOpen', async ({ url }) => {
  if (!url.startsWith('rentaloo://auth-callback')) return;
  
  const urlObj = new URL(url);
  const code = urlObj.searchParams.get('code');
  
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    await Browser.close();
  }
});
```

### OAuth Trigger (`src/contexts/AuthContext.tsx`)

The `signInWithOAuth` function detects native platform and uses appropriate flow:

```typescript
if (isNative) {
  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'rentaloo://auth-callback',
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

```
APP_URL_OPEN rentaloo://auth-callback?code=...
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

