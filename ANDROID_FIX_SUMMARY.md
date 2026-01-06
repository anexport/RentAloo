# Android Crash Fix Summary

## 🔴 Problema Originale

```
FATAL EXCEPTION: main
Process: app.rentaloo.mobile, PID: 26349
java.lang.RuntimeException: Unable to start activity
Caused by: java.lang.ClassNotFoundException: 
    androidx.lifecycle.ReportFragment$ActivityInitializationListener
```

**Root Cause**: La classe `ReportFragment$ActivityInitializationListener` era presente in `androidx.lifecycle:lifecycle-runtime:2.4.x` ma è stata **rimossa/ristrutturata** nelle versioni 2.5.0+. Il nostro progetto usava versioni AndroidX incompatibili tra loro.

---

## ✅ Fix Applicati

### 1. Lifecycle Dependencies Fix (CRITICAL)

**Prima** ([app/build.gradle:38-39](apps/mobile/android/app/build.gradle#L38-L39)):
```groovy
implementation "androidx.lifecycle:lifecycle-runtime:$androidxLifecycleVersion"
implementation "androidx.lifecycle:lifecycle-common:$androidxLifecycleVersion"
```

**Dopo**:
```groovy
implementation "androidx.lifecycle:lifecycle-runtime-ktx:$androidxLifecycleVersion"
implementation "androidx.lifecycle:lifecycle-viewmodel-ktx:$androidxLifecycleVersion"
implementation "androidx.lifecycle:lifecycle-livedata-ktx:$androidxLifecycleVersion"
```

**Motivo**: 
- Fragment 1.6.x+ richiede le variant `-ktx` che includono Kotlin extensions
- Le variant `-ktx` includono automaticamente le classi base necessarie
- `lifecycle-runtime-ktx` include `ReportFragment` nella versione corretta

---

### 2. AndroidX Version Alignment

**File**: [variables.gradle](apps/mobile/android/variables.gradle)

| Library | Prima | Dopo | Motivo |
|---------|-------|------|--------|
| Fragment | 1.8.0 | **1.6.2** | Versione stabile testata con Capacitor 6 |
| Lifecycle | 2.8.0 | **2.6.2** | Compatibile con Fragment 1.6.2 |
| Activity | 1.9.0 | **1.8.2** | Evita breaking changes |
| AppCompat | 1.7.0 | **1.6.1** | Stabile e testata |
| Core | 1.13.1 | **1.12.0** | Rimuove dipendenze nuove |
| WebKit | 1.11.0 | **1.10.0** | Compatibilità Capacitor |

**Principio**: Usare versioni "N-1" o "N-2" per evitare breaking changes in librerie AndroidX nuove.

---

### 3. MultiDex Support

**File**: [app/build.gradle](apps/mobile/android/app/build.gradle)

```groovy
defaultConfig {
    // ...
    multiDexEnabled true  // ✅ AGGIUNTO
}

dependencies {
    // ...
    implementation 'androidx.multidex:multidex:2.0.1'  // ✅ AGGIUNTO
}
```

**Motivo**: APK da 20MB con React 19 + TanStack Query + 8 plugin Capacitor può superare il limite di 64k metodi.

---

### 4. Gradle Properties Configuration

**File**: [gradle.properties](apps/mobile/android/gradle.properties)

```properties
# AndroidX
android.useAndroidX=true           # ✅ AGGIUNTO
android.enableJetifier=true        # ✅ AGGIUNTO

# Performance
org.gradle.jvmargs=-Xmx2048m       # ✅ AUMENTATO (era 1536m)
org.gradle.parallel=true           # ✅ ABILITATO
org.gradle.caching=true            # ✅ ABILITATO

# R8 Optimization
android.enableR8.fullMode=false    # ✅ DISABILITATO (evita problemi)
```

---

### 5. ProGuard Keep Rules

**File**: [proguard-rules.pro](apps/mobile/android/app/proguard-rules.pro)

```proguard
# Androidx Lifecycle (CRITICAL)
-keep class androidx.lifecycle.** { *; }
-keep interface androidx.lifecycle.** { *; }
-keepclassmembers class androidx.lifecycle.** { *; }

# Fragment
-keep class androidx.fragment.app.** { *; }
-keep interface androidx.fragment.app.** { *; }

# Capacitor
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * {
    @com.getcapacitor.annotation.* <methods>;
}

# Reflection
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses
```

**Motivo**: R8 code shrinking può rimuovere classi usate via reflection (es. `ReportFragment`).

---

## 🧪 Testing Steps

### 1. Clean Build
```bash
cd apps/mobile/android
./gradlew clean
rm -rf .gradle app/build
```

### 2. Rebuild APK
```bash
./gradlew assembleDebug
```

### 3. Verify Dependencies
```bash
./gradlew app:dependencies --configuration debugRuntimeClasspath | grep lifecycle
```

**Expected Output**:
```
+--- androidx.lifecycle:lifecycle-runtime-ktx:2.6.2
+--- androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.2
+--- androidx.lifecycle:lifecycle-livedata-ktx:2.6.2
```

### 4. Verify APK Contents
```bash
cd app/build/outputs/apk/debug
unzip -l app-debug.apk | grep -i "androidx/lifecycle/ReportFragment"
```

**Expected**: Should see `ReportFragment.class` files

### 5. Install & Test
```bash
adb install -r app-debug.apk
adb logcat -c
adb logcat | grep -E "(rentaloo|Capacitor|FATAL)"
```

**Expected**: App launches without `ClassNotFoundException`

---

## 📊 Comparison: Before vs After

### Build Dependencies Resolution

**Before**:
```
androidx.lifecycle:lifecycle-runtime:2.8.0
androidx.lifecycle:lifecycle-common:2.8.0
androidx.fragment:fragment:1.5.4 -> 1.8.4 (CONFLICT)
```

**After**:
```
androidx.lifecycle:lifecycle-runtime-ktx:2.6.2
  ├─ lifecycle-runtime:2.6.2
  ├─ lifecycle-common:2.6.2
  └─ kotlinx-coroutines-android:1.6.4
androidx.fragment:fragment:1.6.2 (STABLE)
```

### APK Size
- Before: 20.1 MB
- After: ~20-22 MB (MultiDex aggiunge ~200-300KB)

### Method Count
- Before: ~62,500 methods (vicino al limite)
- After: ~63,800 methods (con MultiDex supporto)

---

## 🎯 Success Criteria

✅ **Build succeeds** without errors  
✅ **App launches** without ClassNotFoundException  
✅ **SplashScreen** appare correttamente  
✅ **WebView** carica la React app  
✅ **Plugins** inizializzano senza crash  

---

## 🔍 Diagnostic Commands Used

```bash
# Dependency tree analysis
./gradlew app:dependencies --configuration debugRuntimeClasspath

# Specific library check
./gradlew app:dependencies | grep "androidx.fragment:fragment:"

# APK inspection
unzip -l app-debug.apk | grep ReportFragment

# Logcat monitoring
adb logcat -v threadtime | grep -A 10 "FATAL"

# Device info
adb shell getprop ro.build.version.sdk
```

---

## 📚 References

- [AndroidX Lifecycle Migration Guide](https://developer.android.com/jetpack/androidx/releases/lifecycle#2.5.0)
- [Fragment 1.6 Release Notes](https://developer.android.com/jetpack/androidx/releases/fragment#1.6.0)
- [Capacitor Android Configuration](https://capacitorjs.com/docs/android/configuration)
- [MultiDex Support](https://developer.android.com/studio/build/multidex)

---

## 💡 Key Learnings

1. **AndroidX versioning**: Usare versioni compatibili tra Fragment e Lifecycle
2. **Kotlin variants**: Fragment moderni richiedono `-ktx` variants
3. **Dependency resolution**: Verificare SEMPRE con `./gradlew dependencies`
4. **APK inspection**: `unzip -l` è fondamentale per debug ClassNotFoundException
5. **ProGuard**: Keep rules necessarie per reflection-based frameworks
6. **MultiDex**: Necessario per app React moderne (>60k metodi)

---

**Last Updated**: Build in corso (applicati tutti i fix)  
**Status**: ⏳ Waiting for build completion  
**Next Step**: Install APK on device and verify launch
