# Universal Links Setup Guide

This guide explains how to enable Universal Links for seamless deep linking in your iOS and Android apps.

## Current State

The app currently uses custom URL schemes (`youdomain://`) which work but have limitations:

- iOS Safari blocks automatic redirects from web→app
- User must manually tap "Open in youdomain"
- Email confirmation requires manual sign-in after verification

## What Universal Links Enable

With a domain, the app will use `https://yourdomain.com` links that:

- ✅ Open the app automatically (no prompt)
- ✅ Fall back to web if app not installed
- ✅ Work seamlessly from email clients
- ✅ Are cryptographically verified (secure)

## Prerequisites

1. **A domain you control** (e.g., `youdomain.com`)
2. **Ability to host files** at `https://yourdomain.com/.well-known/`
3. **Apple Developer Account** (for iOS Universal Links)

## Setup Steps

### 1. Configure Environment Variable

Add to your `.env.prod` (or `.env.local` for testing):

```bash
EXPO_PUBLIC_APP_DOMAIN=youdomain.com
```

### 2. Update app.json

Uncomment the Universal Links configuration:

**For iOS:**

```json
{
  "ios": {
    "associatedDomains": ["applinks:youdomain.com"]
  }
}
```

**For Android:**

```json
{
  "android": {
    "intentFilters": [
      {
        "action": "VIEW",
        "category": ["BROWSABLE", "DEFAULT"],
        "autoVerify": true,
        "data": [
          {
            "scheme": "https",
            "host": "youdomain.com",
            "pathPrefix": "/auth-callback"
          }
        ]
      }
    ]
  }
}
```

### 3. Create Apple App Site Association File

Create a file at `https://youdomain.com/.well-known/apple-app-site-association` (no file extension):

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "HWJZHVS443.com.luvenapps.youdomain",
        "paths": ["/auth-callback", "/reset-password", "/*"]
      }
    ]
  }
}
```

**Important:**

- Replace `HWJZHVS443` with your Apple Team ID
- Replace `com.luvenapps.youdomain` with your bundle identifier
- Serve with `Content-Type: application/json`
- Must be accessible over HTTPS (no redirects)

### 4. Create Android Asset Links File

Create a file at `https://youdomain.com/.well-known/assetlinks.json`:

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.luvenapps.youdomain",
      "sha256_cert_fingerprints": ["YOUR_SHA256_CERTIFICATE_FINGERPRINT"]
    }
  }
]
```

**Get your SHA256 fingerprint:**

```bash
# For production keystore:
keytool -list -v -keystore your-release-key.keystore

# For EAS Build:
eas credentials
```

### 5. Update Supabase Configuration

In your Supabase Dashboard → Authentication → URL Configuration:

**Add redirect URLs:**

- `https://youdomain.com/**`
- Keep `youdomain://**` as fallback

### 6. Rebuild Your App

Universal Links require native code changes:

```bash
# Clear and rebuild
npx expo prebuild --clean
npm run ios    # or npm run android
```

### 7. Test the Flow

1. Sign up with a test email
2. Check email on your device
3. Tap confirmation link
4. App should open automatically!

## Verification

**iOS Universal Links:**

1. Open https://youdomain.com/.well-known/apple-app-site-association in Safari
2. Verify it returns valid JSON (no 404)
3. Test link: https://youdomain.com/auth-callback
   - Long-press → Should show "Open in youdomain"

**Android App Links:**

1. Visit https://youdomain.com/.well-known/assetlinks.json
2. Verify valid JSON
3. Test with: `adb shell am start -W -a android.intent.action.VIEW -d "https://youdomain.com/auth-callback"`

## Troubleshooting

### iOS Universal Links Not Working

1. **Check association file:**

   ```bash
   curl https://youdomain.com/.well-known/apple-app-site-association
   ```

   Should return JSON (not HTML)

2. **Verify domain in app:**
   - Xcode → Signing & Capabilities → Associated Domains
   - Should list: `applinks:youdomain.com`

3. **Clear iOS cache:**
   - Delete app
   - Restart device
   - Reinstall app

4. **Apple CDN caching:**
   - Apple caches the association file for 24 hours
   - Wait or use a different subdomain for testing

### Android App Links Not Working

1. **Verify intent filter:**

   ```bash
   adb shell dumpsys package d
   # Search for your package and verify verified domains
   ```

2. **Test with ADB:**

   ```bash
   adb shell am start -W -a android.intent.action.VIEW -d "https://youdomain.com/auth-callback"
   ```

3. **Check certificate fingerprint:**
   - Must match the one in assetlinks.json exactly
   - Use the production keystore fingerprint for production builds

## Current Fallback

Without a domain, the app uses the **manual flow**:

1. User signs up
2. Clicks email confirmation link
3. Email verified in browser
4. Returns to app and signs in with credentials

This is a valid approach and works reliably across all platforms.

## Future Improvements

Once you have a domain, you can also enable:

- Password reset links that open the app directly
- Magic link authentication (passwordless)
- Invite links that open the app
- Deep links to specific content/screens
