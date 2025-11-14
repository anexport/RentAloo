# Signup Modal Transformation Plan

## Overview
Transform the current page-based signup flows (RenterRegistration and OwnerRegistration) into modal-based components, following the pattern established by the LoginModal. This will provide a more seamless user experience without navigating away from the explore page.

## Current State Analysis

### Existing Modal Pattern (LoginModal)
**Location:** `src/components/auth/LoginModal.tsx`

**Key Features:**
- Uses shadcn `Dialog` component
- Props: `open` (boolean), `onOpenChange` (function)
- Controlled by URL query parameter (`?login=true`)
- Single-step form with email/password
- OAuth integration (Google sign-in)
- Error handling with inline alerts
- Form reset on modal close via useEffect
- Navigation after successful login based on user role
- Links to signup pages (currently navigates away)

**Pattern Used in ExplorePage:**
```tsx
const loginOpen = searchParams.get("login") === "true";

const handleLoginOpenChange = (open: boolean) => {
  if (open) {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("login", "true");
    setSearchParams(newParams, { replace: true });
  } else {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("login");
    setSearchParams(newParams, { replace: true });
  }
};

<LoginModal open={loginOpen} onOpenChange={handleLoginOpenChange} />
```

### Current Signup Pages

#### RenterRegistration
**Location:** `src/pages/auth/RenterRegistration.tsx`

**Structure:**
- Full-page component with Card layout
- 3-step multi-step form
- Uses `StepProgress`, `PasswordStrength`, `CheckboxGroup` components
- Steps:
  1. Account Setup (fullName, email, password, confirmPassword)
  2. Details (location, experienceLevel)
  3. Interests (activity interests - hiking, climbing, skiing, etc.)
- Navigation buttons (Back, Continue, Create Account)
- Form validation with react-hook-form + zod
- Redirects to `/verify` on success
- Link to login page

**Dependencies:**
- `useForm` from react-hook-form
- `zodResolver` with separate schemas for each step
- Multiple Lucide icons (Mountain, ArrowLeft, Eye, EyeOff, User, Mail, MapPin, ArrowRight, Check)
- Custom UI components (StepProgress, PasswordStrength, CheckboxGroup)

#### OwnerRegistration
**Location:** `src/pages/auth/OwnerRegistration.tsx`

**Structure:**
- Full-page component with Card layout
- 4-step multi-step form
- Uses `StepProgress`, `PasswordStrength`, `CheckboxGroup` components
- Steps:
  1. Account Setup (fullName, businessName (optional), email, password, confirmPassword)
  2. Details (location, serviceArea, yearsExperience)
  3. Categories (equipment categories they'll list)
  4. Payment (bankAccount - optional, can be skipped)
- Navigation buttons (Back, Continue, Create Account)
- Form validation with react-hook-form + zod
- Redirects to `/verify` on success
- Link to login page
- "Skip for now" option on payment step

**Dependencies:**
- Same as RenterRegistration
- Additional icons (Shield, CreditCard, Award, Navigation)
- Additional UI components (Badge, Alert)

## Transformation Plan

### Phase 1: Create SignupModal Component Structure

#### File: `src/components/auth/SignupModal.tsx`

**Purpose:** Main modal container that handles role selection and delegates to role-specific forms.

**Implementation Details:**

1. **Component Props:**
```typescript
type SignupModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialRole?: 'renter' | 'owner'; // Optional: pre-select role from URL param
};
```

2. **State Management:**
```typescript
const [selectedRole, setSelectedRole] = useState<'renter' | 'owner' | null>(
  initialRole || null
);
const [showRoleSelection, setShowRoleSelection] = useState(!initialRole);
```

3. **Modal Structure:**
   - Use shadcn `Dialog` component (same as LoginModal)
   - If no role selected: Show role selection screen
   - If role selected: Show appropriate registration form (RenterSignupForm or OwnerSignupForm)
   - Back button to return to role selection (on step 1 only)

4. **Role Selection Screen:**
   - Header with Mountain icon and "Join RentAloo" title
   - Two prominent cards/buttons:
     - "Join as a Renter" - with description and icon
     - "Join as an Owner" - with description and icon
   - Link to login at bottom
   - On selection, set role and hide role selection

5. **Modal Size:**
   - Use `sm:max-w-2xl` for multi-step forms (wider than login modal's `sm:max-w-md`)
   - Ensures comfortable viewing of step progress and form fields

6. **Reset Behavior:**
   - Reset to role selection when modal closes
   - Clear form data on close
   - Use useEffect to monitor `open` prop

### Phase 2: Create RenterSignupForm Component

#### File: `src/components/auth/RenterSignupForm.tsx`

**Purpose:** Extracted form logic from RenterRegistration.tsx, adapted for modal use.

**Key Changes from Page Version:**

1. **Props:**
```typescript
type RenterSignupFormProps = {
  onSuccess: () => void; // Callback when signup succeeds
  onBack: () => void; // Return to role selection
};
```

2. **Remove Page-Specific Elements:**
   - Remove outer page container (`min-h-screen bg-background flex...`)
   - Remove "Back to home" link with ArrowLeft
   - Remove Card wrapper (modal provides container)
   - Keep CardHeader content but adjust for modal context

3. **Navigation Adjustments:**
   - On step 1, "Back" button calls `onBack()` to return to role selection
   - On steps 2-3, "Back" button navigates to previous step (existing behavior)
   - On success, call `onSuccess()` instead of navigate to verify page

4. **Form Sections:**
   - Keep StepProgress component
   - Keep all 3 steps exactly as-is
   - Keep form validation and error handling
   - Keep all field components and layouts

5. **Success Handling:**
```typescript
const onSubmit = async (data: RenterFormData) => {
  setIsLoading(true);
  setError(null);

  try {
    const { error } = await signUp(data.email, data.password, {
      role: "renter",
      fullName: data.fullName,
      location: data.location,
      interests: data.interests,
      experienceLevel: data.experienceLevel,
    });

    if (error) {
      setError(error.message);
    } else {
      // Instead of navigate("/verify", ...)
      onSuccess();
    }
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : "Registration failed. Please try again."
    );
  } finally {
    setIsLoading(false);
  }
};
```

6. **Link Adjustments:**
   - Change "Already have an account? Sign in" link
   - Instead of navigating to `/login`, should close modal and open login modal
   - Pass callback prop or use context/URL manipulation

### Phase 3: Create OwnerSignupForm Component

#### File: `src/components/auth/OwnerSignupForm.tsx`

**Purpose:** Extracted form logic from OwnerRegistration.tsx, adapted for modal use.

**Key Changes from Page Version:**

1. **Props:**
```typescript
type OwnerSignupFormProps = {
  onSuccess: () => void; // Callback when signup succeeds
  onBack: () => void; // Return to role selection
};
```

2. **Remove Page-Specific Elements:**
   - Same as RenterSignupForm
   - Remove page container, navigation header, Card wrapper
   - Keep CardHeader content and Badge

3. **Navigation Adjustments:**
   - Same pattern as RenterSignupForm
   - On step 1, "Back" returns to role selection
   - Steps 2-4 navigate between steps
   - Step 4 has "Skip for now" option that still works

4. **Form Sections:**
   - Keep StepProgress component
   - Keep all 4 steps exactly as-is
   - Keep skip payment functionality
   - Keep form validation and error handling

5. **Success Handling:**
   - Same pattern as RenterSignupForm
   - Call `onSuccess()` instead of navigate

### Phase 4: Update ExplorePage Integration

#### File: `src/pages/ExplorePage.tsx`

**Changes Required:**

1. **Import New Component:**
```typescript
import SignupModal from "@/components/auth/SignupModal";
```

2. **Add State Management:**
```typescript
// Signup modal state from URL query params
const signupOpen = searchParams.get("signup") === "true";
const signupRole = searchParams.get("role") as 'renter' | 'owner' | undefined;

const handleSignupOpenChange = (open: boolean) => {
  if (open) {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("signup", "true");
    // Optionally preserve role param
    if (signupRole) {
      newParams.set("role", signupRole);
    }
    setSearchParams(newParams, { replace: true });
  } else {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("signup");
    newParams.delete("role");
    setSearchParams(newParams, { replace: true });
  }
};
```

3. **Add Modal Component:**
```typescript
<SignupModal 
  open={signupOpen} 
  onOpenChange={handleSignupOpenChange}
  initialRole={signupRole}
/>
```

4. **OAuth Redirect Handling:**
   - Already exists for login, ensure it works for signup too
   - After OAuth success, user might need role selection if not set

### Phase 5: Update LoginModal Links

#### File: `src/components/auth/LoginModal.tsx`

**Changes Required:**

1. **Update Registration Links:**
```typescript
// Current:
<Link
  to="/register/renter"
  className="text-primary hover:underline"
  onClick={() => onOpenChange(false)}
>
  Sign up as a renter
</Link>

// New:
<button
  type="button"
  className="text-primary hover:underline cursor-pointer bg-transparent border-0 p-0"
  onClick={() => {
    onOpenChange(false);
    // Trigger signup modal with role
    const newParams = new URLSearchParams(window.location.search);
    newParams.set("signup", "true");
    newParams.set("role", "renter");
    window.history.replaceState({}, '', `?${newParams.toString()}`);
  }}
>
  Sign up as a renter
</button>
```

2. **Apply Same Pattern for Owner Link**

3. **Alternative Approach (Cleaner):**
   - Add props to LoginModal:
```typescript
type LoginModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowSignup?: (role: 'renter' | 'owner') => void;
};
```
   - Call `onShowSignup` instead of direct URL manipulation
   - Parent (ExplorePage) handles the coordination

### Phase 6: Update App Routing

#### File: `src/App.tsx`

**Changes Required:**

1. **Update Registration Routes:**
```typescript
// Redirect old registration URLs to explore page with signup modal
<Route 
  path="/register/renter" 
  element={<Navigate to="/?signup=true&role=renter" replace />} 
/>
<Route 
  path="/register/owner" 
  element={<Navigate to="/?signup=true&role=owner" replace />} 
/>
```

2. **Keep Pages as Fallback (Optional):**
   - Could keep the page versions for direct access or non-JS fallback
   - Or remove them entirely if modal-only approach is desired

3. **Verify Route:**
   - Keep `/verify` route as-is
   - After signup success in modal, redirect to verify page
   - Could also be a modal, but that's a separate enhancement

### Phase 7: Handle Success Flow

**Verification Flow:**

1. **After Signup Success:**
```typescript
// In SignupModal
const handleSignupSuccess = () => {
  // Close signup modal
  onOpenChange(false);
  
  // Get email from form data (need to pass up from child form)
  // Option A: Navigate to verify page
  navigate("/verify", { state: { email: userEmail } });
  
  // Option B: Show verification modal/message
  // Could create a VerificationModal for consistency
};
```

2. **Pass Email Up:**
   - Forms need to pass email to parent on success
   - Update success callbacks:
```typescript
type SignupFormProps = {
  onSuccess: (email: string) => void;
  onBack: () => void;
};
```

### Phase 8: Modal Coordination

**Handle Login/Signup Switching:**

1. **In SignupModal Forms:**
   - "Already have an account? Sign in" link
   - Should close signup modal and open login modal

2. **Implementation:**
```typescript
// In RenterSignupForm and OwnerSignupForm
<button
  type="button"
  className="text-primary hover:underline"
  onClick={onShowLogin}
>
  Sign in
</button>

// Props:
type SignupFormProps = {
  onSuccess: (email: string) => void;
  onBack: () => void;
  onShowLogin: () => void;
};

// In SignupModal:
const handleShowLogin = () => {
  onOpenChange(false); // Close signup
  // Open login via URL param
  const newParams = new URLSearchParams(window.location.search);
  newParams.set("login", "true");
  newParams.delete("signup");
  newParams.delete("role");
  window.history.replaceState({}, '', `?${newParams.toString()}`);
};
```

## Implementation Checklist

### Step 1: Create Base Modal Structure
- [ ] Create `src/components/auth/SignupModal.tsx`
- [ ] Implement role selection screen
- [ ] Add Dialog component with proper sizing
- [ ] Add state management for role selection
- [ ] Add reset logic on close
- [ ] Test modal open/close behavior

### Step 2: Extract Renter Form
- [ ] Create `src/components/auth/RenterSignupForm.tsx`
- [ ] Copy form logic from RenterRegistration.tsx
- [ ] Remove page-specific wrappers
- [ ] Update props interface
- [ ] Update navigation handlers
- [ ] Update success handler
- [ ] Update link to login
- [ ] Test all 3 steps
- [ ] Test validation
- [ ] Test back navigation

### Step 3: Extract Owner Form
- [ ] Create `src/components/auth/OwnerSignupForm.tsx`
- [ ] Copy form logic from OwnerRegistration.tsx
- [ ] Remove page-specific wrappers
- [ ] Update props interface
- [ ] Update navigation handlers
- [ ] Update success handler
- [ ] Update link to login
- [ ] Test all 4 steps
- [ ] Test validation
- [ ] Test skip payment
- [ ] Test back navigation

### Step 4: Integrate Forms into Modal
- [ ] Import forms in SignupModal
- [ ] Wire up role selection to form display
- [ ] Wire up back handler
- [ ] Wire up success handler
- [ ] Wire up login switch handler
- [ ] Test role selection
- [ ] Test form switching
- [ ] Test complete renter flow
- [ ] Test complete owner flow

### Step 5: Update ExplorePage
- [ ] Import SignupModal
- [ ] Add signup state management
- [ ] Add URL query param handling
- [ ] Add modal component
- [ ] Test modal opening from URL
- [ ] Test modal closing
- [ ] Test role parameter passing

### Step 6: Update LoginModal
- [ ] Add onShowSignup prop (optional approach)
- [ ] Update "Sign up as renter" link
- [ ] Update "Sign up as owner" link
- [ ] Test switching from login to signup
- [ ] Verify modal coordination

### Step 7: Update App Routing
- [ ] Add redirect routes for /register/renter
- [ ] Add redirect routes for /register/owner
- [ ] Test old URLs redirect correctly
- [ ] Verify modal opens with correct role
- [ ] Consider keeping/removing old page components

### Step 8: Handle Verification Flow
- [ ] Update success handler to capture email
- [ ] Pass email through callback chain
- [ ] Navigate to verify page on success
- [ ] OR create VerificationModal (future enhancement)
- [ ] Test complete signup-to-verification flow

### Step 9: Testing & Polish
- [ ] Test full renter registration flow
- [ ] Test full owner registration flow
- [ ] Test form validation on all steps
- [ ] Test error handling
- [ ] Test modal close/reset behavior
- [ ] Test switching between login/signup
- [ ] Test role selection back navigation
- [ ] Test OAuth flow (if applicable to signup)
- [ ] Test responsive design on mobile
- [ ] Test keyboard navigation and accessibility
- [ ] Test with screen reader
- [ ] Cross-browser testing

## Technical Considerations

### Modal Sizing and Scroll Behavior
- Login modal uses `sm:max-w-md` (448px)
- Signup forms need more space: use `sm:max-w-2xl` (672px)
- Multi-step forms are taller - ensure proper scroll behavior
- Consider: `DialogContent` with `className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"`

### Form State Management
- Each form maintains its own state via react-hook-form
- State is NOT preserved when switching modals
- This is acceptable - users start fresh if switching
- Consider: localStorage persistence for draft saves (future enhancement)

### Animation and Transitions
- Existing forms use `animate-in fade-in slide-in-from-right-4 duration-300`
- Keep these for step transitions
- Dialog provides its own enter/exit animations
- Ensure smooth transitions between role selection and forms

### Error Handling
- Keep inline error messages for form fields
- Keep Alert component for general errors
- Ensure errors clear when navigating between steps
- Ensure errors clear when switching between login/signup

### Accessibility
- Maintain existing ARIA labels and descriptions
- Ensure Dialog has proper focus trap
- Ensure keyboard navigation works for:
  - Role selection
  - Form fields
  - Step navigation
  - Modal close
- Maintain aria-invalid and aria-describedby attributes
- Test with keyboard only
- Test with screen reader

### Performance
- Forms are only rendered when modal is open
- Consider lazy loading SignupModal if bundle size is concern
- StepProgress, PasswordStrength, CheckboxGroup already optimized
- No performance issues expected

### OAuth Integration
- LoginModal has Google OAuth
- Should signup also have OAuth?
- If yes, need to handle role selection after OAuth
- OAuth metadata could include role
- Current plan: keep OAuth in login only, require explicit signup

### Mobile Considerations
- Multi-step forms need careful mobile testing
- Ensure modal doesn't exceed viewport height
- Ensure form fields are thumb-friendly
- Test on iOS Safari and Android Chrome
- Consider: hide role selection screen on mobile after selection (use overlay back button)

## File Structure Summary

```
src/
├── components/
│   └── auth/
│       ├── LoginModal.tsx (existing - update links)
│       ├── SignupModal.tsx (new)
│       ├── RenterSignupForm.tsx (new)
│       └── OwnerSignupForm.tsx (new)
├── pages/
│   ├── ExplorePage.tsx (update - add SignupModal)
│   └── auth/
│       ├── RenterRegistration.tsx (keep or remove)
│       ├── OwnerRegistration.tsx (keep or remove)
│       └── EmailVerification.tsx (keep as-is)
└── App.tsx (update - add redirects)
```

## URL Pattern Examples

### Before (Page-based)
- `/register/renter` - Full page renter registration
- `/register/owner` - Full page owner registration
- `/login` - Redirects to `/?login=true`

### After (Modal-based)
- `/?signup=true` - Opens signup modal with role selection
- `/?signup=true&role=renter` - Opens signup modal with renter form
- `/?signup=true&role=owner` - Opens signup modal with owner form
- `/?login=true` - Opens login modal (existing)
- `/register/renter` - Redirects to `/?signup=true&role=renter`
- `/register/owner` - Redirects to `/?signup=true&role=owner`

## Dependencies

### Existing (No Changes Needed)
- react-hook-form: Form state management
- @hookform/resolvers: Zod resolver
- zod: Schema validation
- lucide-react: Icons
- shadcn/ui components: Dialog, Button, Input, Label, etc.
- Custom UI components: StepProgress, PasswordStrength, CheckboxGroup

### No New Dependencies Required
All functionality can be achieved with existing packages.

## Rollback Plan

If issues arise:
1. Keep old page components
2. Revert route redirects in App.tsx
3. Remove modal components
4. Update links back to page navigation
5. Can be done incrementally (renter first, then owner)

## Future Enhancements (Out of Scope)

1. **Verification Modal:** Convert email verification to modal
2. **Draft Persistence:** Save partial signup forms to localStorage
3. **OAuth Signup:** Add Google/social signup with automatic role detection
4. **Progress Indicators:** Add percentage complete indicator
5. **Form Animations:** Enhanced step transition animations
6. **Mobile Optimization:** Bottom sheet style on mobile instead of modal
7. **A/B Testing:** Compare conversion rates page vs modal
8. **Analytics:** Track completion rates by step
9. **Autofill:** Enhanced browser autofill support
10. **Password Strength:** Real-time password requirements checklist

## Success Criteria

- [ ] Users can sign up as renter without leaving explore page
- [ ] Users can sign up as owner without leaving explore page
- [ ] All form validation works identically to page version
- [ ] Multi-step navigation works correctly
- [ ] Switching between login and signup works smoothly
- [ ] Modals can be closed and reopened without issues
- [ ] Form state resets properly on close
- [ ] Old URLs redirect correctly
- [ ] Accessibility standards maintained
- [ ] Mobile experience is smooth
- [ ] No regressions in existing functionality
