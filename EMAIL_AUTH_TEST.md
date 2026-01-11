# Test Login/Registrazione Email/Password (NO Browser)

## ✅ Modifiche Implementate

### 1. AuthContext.tsx
**Metodo `signUp`** (righe 172-214):
```typescript
const signUp = useCallback(
  async (email: string, password: string, userData: UserMetadata) => {
    // Validazione ruolo client-side
    const ALLOWED_ROLES = ['renter', 'owner'] as const;
    const providedRole = userData?.role;

    if (
      providedRole &&
      !ALLOWED_ROLES.includes(providedRole as (typeof ALLOWED_ROLES)[number])
    ) {
      return {
        error: {
          message: `Invalid role: "${providedRole}". Only "renter" or "owner" roles are allowed for signup.`,
          name: 'AuthError',
          status: 400,
        } as AuthError,
      };
    }

    // Sanitizza i dati
    const sanitizedUserData: UserMetadata = {
      ...userData,
      role:
        providedRole &&
        ALLOWED_ROLES.includes(providedRole as (typeof ALLOWED_ROLES)[number])
          ? providedRole
          : 'renter', // Default sicuro
    };

    try {
      // ✅ USA supabase.auth.signUp (NO Browser.open)
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: sanitizedUserData,
        },
      });
      return { error };
    } catch (error) {
      return { error: error as AuthError };
    }
  },
  []
);
```

**Metodo `signInWithPassword`** (righe 87-111):
```typescript
const signInWithPassword = useCallback(
  async (email: string, password: string): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      // ✅ USA apiSignIn (che internamente chiama supabase.auth.signInWithPassword)
      const { session: newSession, error: signInError } = await apiSignIn(
        supabase,
        email,
        password
      );

      if (signInError) {
        setError(signInError.message);
        return false;
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);
      return true; // ✅ Ritorna true per successo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      return false;
    } finally {
      setLoading(false);
    }
  },
  []
);
```

### 2. LoginScreen.tsx
**Diff - handleSubmit**:
```diff
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await signInWithPassword(email, password);
    if (success) {
-     navigate('/');
+     navigate('/explore');
    }
  };
```

### 3. SignupScreen.tsx
**handleSubmit** (righe 62-91):
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);

  if (!validateForm()) {
    return;
  }

  setIsLoading(true);

  try {
    // ✅ USA signUp (che chiama supabase.auth.signUp - NO Browser.open)
    const { error: signUpError } = await signUp(email, password, {
      role,
      fullName: fullName.trim(),
      location: location.trim(),
      interests: [],
      experienceLevel: role === 'renter' ? 'beginner' : undefined,
    });

    if (signUpError) {
      setError(signUpError.message);
    } else {
      // ✅ Naviga a /verify (pagina di conferma email)
      navigate('/verify', { state: { email } });
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
  } finally {
    setIsLoading(false);
  }
};
```

---

## 🔍 Verifica: Nessun Browser.open() nel flusso email

**Browser.open() appare SOLO in `signInWithOAuth`** (righe 113-144):
```typescript
const signInWithOAuth = useCallback(
  async (provider: 'google' | 'apple'): Promise<void> => {
    // ...
    if (url) {
      if (Capacitor.isNativePlatform()) {
        // ✅ Browser.open SOLO per OAuth (Google/Apple)
        await Browser.open({ url });
      } else {
        window.open(url, '_blank');
      }
    }
  },
  []
);
```

✅ **Conferma**: Il flusso email/password NON chiama mai `Browser.open()` o `signInWithOAuth()`.

---

## 📱 Istruzioni per il Test

### A. Build e Deploy

```bash
# 1. Build della mobile app
cd /home/davide/Sviluppo/Progetti/rentaloo-ai/apps/mobile
npm run build

# 2. Sync con Capacitor
pnpm cap sync android

# 3. Build Android APK
cd android
./gradlew assembleDebug

# 4. Installa su dispositivo (esegui da apps/mobile/android)
cd /home/davide/Sviluppo/Progetti/rentaloo-ai/apps/mobile/android
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Oppure usa percorso assoluto da qualsiasi directory:
adb install -r /home/davide/Sviluppo/Progetti/rentaloo-ai/apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk

# Verifica installazione
adb shell pm list packages | grep rentaloo
# Output atteso: package:app.rentaloo.mobile
```

### B. Test Registrazione (Email/Password)

1. **Apri l'app Rentaloo**
2. **Tap su "Sign Up"**
3. **Seleziona ruolo: "I want to rent"** (o "I want to lend")
4. **Compila il form:**
   - Full Name: `Mario Rossi`
   - Email: `mario.rossi@example.com`
   - Password: `password123` (min 6 caratteri)
   - Confirm Password: `password123`
   - Location: `Milano, Italy`
5. **Tap "Create Account"**

**✅ Risultato atteso:**
- ❌ **NESSUNA apertura di Chrome**
- ✅ Navigazione a schermata `/verify` con messaggio "Check your email"
- ✅ Email visualizzata: `mario.rossi@example.com`

**Verifica console (adb logcat):**
```bash
adb logcat -s chromium:* | grep -i browser
# Non dovrebbe mostrare "Browser.open" o "BrowserControllerActivity"
```

### C. Test Login (Email/Password)

**ATTENZIONE**: Devi prima confermare l'email dal link ricevuto via email, altrimenti Supabase restituirà errore "Email not confirmed".

1. **Controlla email di verifica** (inbox di `mario.rossi@example.com`)
2. **Clicca sul link di conferma** nel messaggio da Supabase
3. **Torna all'app, vai su Login**
4. **Inserisci credenziali:**
   - Email: `mario.rossi@example.com`
   - Password: `password123`
5. **Tap "Log In"**

**✅ Risultato atteso:**
- ❌ **NESSUNA apertura di Chrome**
- ✅ Navigazione diretta a `/explore` (schermata Explore)
- ✅ User autenticato, visibile nella tab bar

**Verifica console:**
```bash
adb logcat | grep -E "(Session set|User authenticated|navigate)"
# Dovrebbe mostrare:
# "Session set successfully"
# "User authenticated: mario.rossi@example.com"
```

### D. Test Persistenza Sessione

1. **Dopo login, force-stop l'app:**
   ```bash
   adb shell am force-stop app.rentaloo.mobile
   ```
2. **Riapri l'app dal launcher**

**✅ Risultato atteso:**
- ✅ User ancora autenticato (no redirect a login)
- ✅ Navigazione automatica a `/explore`
- ✅ Dati utente presenti in AuthContext

**Verifica storage:**
```bash
adb shell run-as app.rentaloo.mobile cat shared_prefs/CapacitorStorage.xml
# Dovrebbe contenere chiave "supabase.auth.token"
```

---

## 🐛 Troubleshooting

### Errore "Email not confirmed"
**Causa**: Email non ancora verificata
**Soluzione**: 
1. Controlla inbox (e spam) per email da Supabase
2. Clicca sul link di conferma
3. Riprova login

### Errore "Invalid login credentials"
**Causa**: Email/password errati o utente non esistente
**Soluzione**: 
1. Verifica di aver completato la registrazione
2. Verifica che password sia corretta (min 6 caratteri)
3. Prova "Forgot password?" (se implementato)

### App si blocca/crash dopo login
**Causa**: Possibile errore di navigazione o mancanza di dati
**Soluzione**:
```bash
# Verifica log errori
adb logcat | grep -E "(ERROR|FATAL|AndroidRuntime)"
```

### Chrome si apre comunque
**Causa**: Hai usato bottoni OAuth (Google/Apple) invece di form email
**Soluzione**: Usa SOLO il form email/password, NON i bottoni OAuth

---

## 📊 Checklist Finale

- [ ] Build completato senza errori
- [ ] APK installato su device
- [ ] Registrazione: NO apertura Chrome
- [ ] Registrazione: navigazione a `/verify`
- [ ] Email di conferma ricevuta
- [ ] Link di conferma cliccato
- [ ] Login: NO apertura Chrome
- [ ] Login: navigazione a `/explore`
- [ ] User autenticato visibile nell'app
- [ ] Force-stop: sessione persiste
- [ ] Riapetura: user ancora loggato

---

## 🎯 Differenze tra Email e OAuth

| Feature | Email/Password | OAuth (Google/Apple) |
|---------|----------------|----------------------|
| **Browser.open()** | ❌ NO | ✅ SI |
| **Chrome Custom Tabs** | ❌ NO | ✅ SI |
| **Email conferma** | ✅ Richiesta | ❌ Opzionale |
| **Deep link callback** | ❌ NO | ✅ `rentaloo://auth/callback` |
| **Navigazione dopo successo** | `/explore` (email) o `/verify` (signup) | `/explore` |
| **Storage sessione** | ✅ Preferences API | ✅ Preferences API |

---

## 📝 Note Aggiuntive

1. **Conferma email obbligatoria**: Supabase richiede conferma email prima del primo login (default)
2. **Password minima**: 6 caratteri (configurabile in Supabase Dashboard)
3. **Rate limiting**: Supabase applica rate limit su signUp (evita spam)
4. **Session persistence**: Usa `@capacitor/preferences` (SharedPreferences su Android)
5. **Auto-refresh token**: Supabase auto-rinnova token ogni 60 minuti

---

**Data test**: 11 Gennaio 2026  
**APK Location**: `/home/davide/Sviluppo/Progetti/rentaloo-ai/apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`  
**APK Size**: ~23MB  
**Package**: app.rentaloo.mobile

## 🚀 Quick Start

```bash
# From root directory
cd /home/davide/Sviluppo/Progetti/rentaloo-ai

# Build web app
cd apps/mobile && npm run build

# Sync to Android
pnpm cap sync android

# Build APK
cd android && ./gradlew assembleDebug

# Install on device
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Launch app
adb shell am start -n app.rentaloo.mobile/.MainActivity
```
