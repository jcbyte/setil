# Setil for Android

This directory contains the native Android project generated and maintained with [Capacitor](https://capacitorjs.com/docs/android). Capacitor commands should be run from the repository root.

## Firebase configuration

The repository does not include `app/google-services.json`. Each developer must provide a Firebase configuration for their own Firebase project. Note that Firebase client configuration is not a secret but excluding it prevents builds from unintentionally connecting to somebody else's Firebase project.

The `google-services.json` file can be downloaded from Firebase after creating an Android app with the specified package name.

## Application ID

The committed application ID is `dev.joelcutler.setil`.

If publishing a fork as a separate app, choose an application ID that you control and update the native Android package, Gradle namespace/application ID, and `appId` in [`capacitor.config.ts`](../capacitor.config.ts).

Note: Changing only `appId` after the Android project has been generated does not rename all native Android files automatically.

## Build Run

To build the web assets and synchronise Capacitor:

```bash
npm run android:sync
```

To run the app on a connected Android device or emulator (this will aso build and synchronise assets):

```bash
npm run android:run
```

The public facing Android `versionName` is read from the root `package.json` version during the Gradle build. The numeric `versionCode` in `app/build.gradle` must still be incremented for each published Google Play release.
