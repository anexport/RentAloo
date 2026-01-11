import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

/**
 * Handle deep links for:
 * - OAuth callback (rentaloo://auth/callback#access_token=...)
 * - Payment return (rentaloo://payment/confirmation?payment_intent=...)
 * - Universal links (https://rentaloo.app/...)
 */
export function useDeepLinks() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const handleAppUrlOpen = async ({ url }: { url: string }) => {
      console.log('Deep link received:', url);

      try {
        const parsedUrl = new URL(url);
        const path = parsedUrl.pathname;
        const hash = parsedUrl.hash;
        const searchParams = parsedUrl.searchParams;

        // OAuth callback - parse access token from hash
        if (path.includes('/auth/callback') || hash.includes('access_token')) {
          // Order is important:
          // 1. Set session first (so the app knows user is logged in)
          // 2. Navigate to home (or previous route)
          // 3. Close the browser last (so it doesn't interrupt navigation)
          await handleOAuthCallback(hash || url);
          navigate('/explore');
          await Browser.close();
          return;
        }

        // Payment confirmation
        if (path.includes('/payment/confirmation')) {
          const paymentIntent = searchParams.get('payment_intent');
          navigate(`/payment/confirmation?payment_intent=${paymentIntent}`);
          return;
        }

        // Equipment detail
        const equipmentMatch = path.match(/\/equipment\/([a-zA-Z0-9-]+)/);
        if (equipmentMatch) {
          navigate(`/equipment/${equipmentMatch[1]}`);
          return;
        }

        // Booking detail
        const bookingMatch = path.match(/\/booking\/([a-zA-Z0-9-]+)/);
        if (bookingMatch) {
          navigate(`/booking/${bookingMatch[1]}`);
          return;
        }

        // Default: navigate to the path
        if (path && path !== '/') {
          navigate(path);
        }
      } catch (error) {
        console.error('Error handling deep link:', error);
      }
    };

    // Listen for app URL open events
    App.addListener('appUrlOpen', handleAppUrlOpen);

    // Check for initial URL (app opened via deep link)
    App.getLaunchUrl().then((launchUrl) => {
      if (launchUrl?.url) {
        handleAppUrlOpen({ url: launchUrl.url });
      }
    });

    return () => {
      App.removeAllListeners();
    };
  }, [navigate]);
}

/**
 * Parse OAuth callback and set session
 */
async function handleOAuthCallback(urlOrHash: string): Promise<void> {
  console.log('handleOAuthCallback called with:', urlOrHash);
  
  // Extract hash fragment - could be full URL or just hash
  let hash = urlOrHash;
  if (urlOrHash.includes('#')) {
    hash = urlOrHash.split('#')[1];
  }
  
  console.log('Parsing hash:', hash);

  // Parse hash parameters
  const params = new URLSearchParams(hash);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  
  console.log('Tokens found:', { 
    hasAccessToken: !!accessToken, 
    hasRefreshToken: !!refreshToken,
    accessTokenLength: accessToken?.length,
    refreshTokenLength: refreshToken?.length
  });

  if (accessToken && refreshToken) {
    // Set session in Supabase
    console.log('Setting Supabase session...');
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      console.error('Error setting session from OAuth:', error);
    } else {
      console.log('Session set successfully:', { userId: data.user?.id, email: data.user?.email });
    }
  } else {
    console.warn('Missing tokens in OAuth callback - accessToken:', !!accessToken, 'refreshToken:', !!refreshToken);
  }
}
