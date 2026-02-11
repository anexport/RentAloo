import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.rentaloo.mobile',
  appName: 'Vaymo',
  webDir: 'dist',
  server: {
    // Uncomment for development with live reload
    // url: 'http://192.168.1.x:5173',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      // iOS specific
      iosSpinnerStyle: 'small',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
      // iOS keyboard behavior
      style: 'dark', // or 'light'
    },
    StatusBar: {
      style: 'light', // 'dark' for light backgrounds
      backgroundColor: '#ffffff',
    },
  },
  ios: {
    // Associated domains for deep links
    // Configure in Xcode: applinks:rentaloo.app
    contentInset: 'automatic', // Handles safe areas automatically
    allowsLinkPreview: true,
    scrollEnabled: true,
    // Enable edge-to-edge display
    preferredContentMode: 'mobile',
  },
  android: {
    // Deep link verification
    // Configure in AndroidManifest.xml
    backgroundColor: '#ffffff',
    allowMixedContent: false,
    // Enable edge-to-edge display
    useLegacyBridge: false,
  },
};

export default config;
