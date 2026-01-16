Starting CodeRabbit review in plain text mode...

Connecting to review service
Setting up
Analyzing
Reviewing

============================================================================
File: src/components/layout/MobileBottomNav.tsx
Line: 218
Type: potential_issue

Prompt for AI Agent:
In @src/components/layout/MobileBottomNav.tsx at line 218, In MobileBottomNav (component rendering center items), remove the dead conditional check !user && item.label === "Account" and simply render item.label for center items (where isCenter is true), since center items are always "Explore" or "Add"; ensure you do not alter the existing login-label logic used for non-center items elsewhere.



Review completed ✔
