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
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  ios: {
    // Associated domains for deep links
    // Configure in Xcode: applinks:rentaloo.app
  },
  android: {
    // Deep link verification
    // Configure in AndroidManifest.xml
  },
};

export default config;
