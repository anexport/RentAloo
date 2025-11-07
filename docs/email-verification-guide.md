# Email Verification Flow Implementation Guide

This guide walks through adding a dedicated `/verify` page that every new registrant sees immediately after signing up. The page confirms that a verification email was sent, provides a clean shadcn-styled UI, and exposes a “Resend verification email” button wired to Supabase.

## 1. Create the Verification Page

1. **File**: `src/pages/auth/EmailVerification.tsx`.
2. **Imports**:
   - React `useState`.
   - `Link` from `react-router-dom`.
   - `MailCheck`, `RefreshCw` icons from `lucide-react`.
   - shadcn components: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, `Button`, `Alert`, `AlertDescription`, `AlertTitle`, and optional `Separator`.
   - `useToast` from `@/hooks/useToast` for feedback.
   - `useAuth` (or directly `supabase` if you prefer) to access the Supabase client/session.
   - Optionally pull `supabase` from `@/lib/supabase` if you’d rather avoid touching the auth context.
3. **Component structure**:
   - Wrap everything in `<div className="min-h-screen flex items-center justify-center bg-background px-4">`.
   - Nest a `Card` with `max-w-md` width similar to existing auth pages to maintain brand consistency.
   - `CardHeader`:
     ```tsx
     <CardHeader className="space-y-1 text-center">
       <MailCheck className="mx-auto h-10 w-10 text-primary" />
       <CardTitle className="text-2xl font-semibold">Verify your e-mail</CardTitle>
       <CardDescription>
         Please check your inbox for a verification link to continue creating your account.
       </CardDescription>
     </CardHeader>
     ```
   - `CardContent`: surface the user’s email (if available) and contextual info. Suggested layout:
     ```tsx
     {user?.email && (
       <Alert>
         <AlertTitle>Sent to {user.email}</AlertTitle>
         <AlertDescription>
           Didn’t get it? Double-check spam or use the button below to resend the link.
         </AlertDescription>
       </Alert>
     )}
     ```
     Include a muted paragraph describing what happens after verification if necessary.
   - `CardFooter`: place the resend button and a secondary link:
     ```tsx
     <Button className="w-full" disabled={isSending} onClick={handleResend}>
       {isSending ? (
         <>
           <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
           Sending…
         </>
       ) : (
         <>
           <RefreshCw className="mr-2 h-4 w-4" />
           Resend verification email
         </>
       )}
     </Button>
     <Button variant="link" asChild className="w-full">
       <Link to="/login">Back to login</Link>
     </Button>
     ```

## 2. Wire Up Resend Logic

1. Inside `EmailVerification`, pull out `const { session } = useAuth();` (or `const user = session?.user;`).
2. Track UI state:
   ```tsx
   const [isSending, setIsSending] = useState(false);
   const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
   const [message, setMessage] = useState<string | null>(null);
   ```
3. Implement `handleResend`:
   ```tsx
   const handleResend = async () => {
     if (!session?.user?.email) return;
     setIsSending(true);
     setStatus("idle");
     setMessage(null);
     try {
       const { error } = await supabase.auth.resend({
         type: "signup",
         email: session.user.email,
       });
       if (error) {
         setStatus("error");
         setMessage(error.message);
         toast({ variant: "destructive", title: "Unable to resend", description: error.message });
         return;
       }
       setStatus("success");
       setMessage("Verification email resent. Please check your inbox.");
       toast({ title: "Email sent", description: "We just resent your verification link." });
     } catch (err) {
       const message = err instanceof Error ? err.message : "Unexpected error";
       setStatus("error");
       setMessage(message);
       toast({ variant: "destructive", title: "Unexpected error", description: message });
     } finally {
       setIsSending(false);
     }
   };
   ```
4. Surface inline feedback under the button using `status`/`message`. Example:
   ```tsx
   {message && (
     <p className={`text-sm ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}>
       {message}
     </p>
   )}
   ```
5. (Optional) throttle multiple resend attempts by disabling the button for ~30 seconds after success. A simple approach is to store `nextAllowedResend` with `Date.now() + 30_000` and compare on each click.

## 3. Register the Route

1. Import the new page in `src/App.tsx`: `import EmailVerification from "@/pages/auth/EmailVerification";`.
2. Add a public route so it stays accessible even before the user is authenticated:
   ```tsx
   <Route path="/verify" element={<EmailVerification />} />
   ```
   Place it with the other public routes (near `/login`) to ensure unverified users can see it.
3. Keep `/verification` (existing identity verification) untouched; this new route is solely for email confirmation.

## 4. Redirect Post-Registration

1. In both `src/pages/auth/RenterRegistration.tsx` and `src/pages/auth/OwnerRegistration.tsx`, change the success `navigate` calls to:
   ```tsx
   void navigate("/verify");
   ```
   Leave error handling unchanged.
2. If there are future registration entry points (e.g., owner quick-create), ensure they follow the same redirect after `signUp`.

## 5. (Optional) Guard Authenticated Areas

- Consider updating the router or dashboards to ensure unverified users cannot access protected content. With Supabase you can inspect `user?.email_confirmed_at`; if it is `null`, redirect them back to `/verify` until they confirm.
- This guard can be implemented either in `App.tsx` (wrap protected routes) or inside `RenterDashboard`/`OwnerDashboard` components.

## 6. QA & UX Polish

1. Manually go through both registration flows and confirm they land on `/verify`.
2. Trigger the resend button with the network tab open to ensure the Supabase call fires and UI states update.
3. Validate mobile view (375px) to ensure the card and buttons stack nicely.
4. Confirm toasts render via the global `<Toaster />`.
5. After verifying the email via the Supabase link, confirm normal login works and you can reach dashboards without being forced back to `/verify`.

Following the steps above will deliver a consistent, accessible verification screen that leverages shadcn components and integrates cleanly with the existing Supabase auth setup.
