import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const VerifyScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  
  // Get email from location state (passed from signup)
  const email = location.state?.email || user?.email || '';

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendMessage('');
    
    try {
      // TODO: Implement resend verification email logic
      // This would typically call a Supabase function to resend the email
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setResendMessage('Verification email sent! Check your inbox.');
    } catch (error) {
      setResendMessage('Failed to resend email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="p-4 bg-primary/10 rounded-full">
            <Mail className="h-16 w-16 text-primary" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Check your email</h1>
          <p className="text-muted-foreground">
            We've sent a verification link to
          </p>
          {email && (
            <p className="text-lg font-medium text-foreground">
              {email}
            </p>
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-4 text-left bg-muted/50 p-6 rounded-lg">
          <p className="text-sm text-muted-foreground">
            To complete your registration:
          </p>
          <ol className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>Check your email inbox (and spam folder)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>Click the verification link</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="shrink-0 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span>Return to the app and log in</span>
            </li>
          </ol>
        </div>

        {/* Resend message */}
        {resendMessage && (
          <div className={`text-sm p-3 rounded-lg ${
            resendMessage.includes('Failed') 
              ? 'bg-destructive/10 text-destructive' 
              : 'bg-green-500/10 text-green-700 dark:text-green-400'
          }`}>
            {resendMessage}
          </div>
        )}

        {/* Resend button */}
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Didn't receive the email?
          </p>
          <button
            onClick={handleResendEmail}
            disabled={isResending}
            className="text-primary font-medium hover:underline disabled:opacity-50"
          >
            {isResending ? 'Sending...' : 'Resend verification email'}
          </button>
        </div>

        {/* Back to login */}
        <button
          onClick={() => navigate('/login')}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          Go to Login
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default VerifyScreen;
