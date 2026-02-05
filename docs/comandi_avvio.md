Ran terminal command:  pnpm install

Ran terminal command:  cd /home/davide/Sviluppo/Progetti/rentaloo-ai/apps/mobile && pnpm build

Checked background terminal output

Ran terminal command:  npx cap sync android

Ran terminal command:  pnpm exec cap sync android

Ran terminal command:  pnpm exec cap run android

Checked background terminal output

Ran terminal command:  adb devices

Ran terminal command:  which adb || echo "ADB non trovato"

Ran terminal command:  adb start-server && adb devices

Il telefono è rilevato correttamente. Ora installo e avvio l'app: 

Ran terminal command:  pnpm exec cap run android --target R58M82VRJ9F

✅ **App installata e avviata con successo sul telefono!**

L'app è stata:
1. Compilata (build)
2. Sincronizzata con Android
3. Installata sul dispositivo `R58M82VRJ9F`
4. Avviata automaticamente

Dovresti vedere l'app Vaymo aperta sul tuo telefono ora. 📱