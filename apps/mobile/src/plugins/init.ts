import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';

/**
 * Initialize Capacitor plugins on app start
 */
export async function initCapacitorPlugins(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('Running in web mode, skipping native plugin init');
    return;
  }

  try {
    // Hide splash screen after app is ready
    await SplashScreen.hide();

    // Configure status bar
    await StatusBar.setStyle({ style: Style.Light });

    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
    }

    // Configure keyboard
    Keyboard.addListener('keyboardWillShow', (info) => {
      console.log('Keyboard will show, height:', info.keyboardHeight);
    });

    Keyboard.addListener('keyboardWillHide', () => {
      console.log('Keyboard will hide');
    });

    console.log('Capacitor plugins initialized');
  } catch (error) {
    console.error('Error initializing Capacitor plugins:', error);
  }
}
