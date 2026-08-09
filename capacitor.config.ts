import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.joelcutler.setil',
  appName: 'Setil',
  webDir: 'dist',
  plugins: {
    FirebaseAuthentication: {
      providers: ['google.com'],
      // The app uses the Firebase JavaScript SDK for its auth state and Firestore.
      // Native Google Sign-In only supplies the credential to that SDK.
      skipNativeAuth: true,
    },
  },
};

export default config;
