# Setil for Android

This directory contains the native Android project generated and maintained with [Capacitor](https://capacitorjs.com/docs/android). Capacitor commands should be run from the repository root.

## Firebase configuration

The repository does not include `app/google-services.json`. Each developer must provide a Firebase configuration for their own Firebase project. Note that Firebase client configuration is not a secret but excluding it prevents builds from unintentionally connecting to somebody else's Firebase project.

The `google-services.json` file can be downloaded from Firebase after creating an Android app with the specified package name, and .

## Application ID

The committed application ID is `dev.joelcutler.setil`.

If publishing a fork as a separate app, choose an application ID that you control and update the native Android package, Gradle namespace/application ID, and `appId` in [`capacitor.config.ts`](../capacitor.config.ts).

**Note:** Changing only `appId` after the Android project has been generated does not rename all native Android files automatically.

## Development

To run the app on a connected Android device or emulator:

```bash
npm run android:run
```

To create APKs for local testing/distributing:

```bash
npm run android:assemble-debug
```

```bash
npm run android:assemble-release
```

To create a bundle for google play:

```bash
npm run android:bundle
```

**Note:** All of these commands will also build and synchronises web assets.

## Signing keys

### Debug key

Android tooling generates the debug key automatically the first time a debug build was run. Usual location is `%USERPROFILE%\.android\debug.keystore` on Windows, and `~/.android/debug.keystore` on macOS and Linux.

This key is only for development and must not be used to publish the app.

### Release key

A release key can initially be generated with `keytool`:

```bash
keytool -genkeypair -v -keystore setil-release.jks -alias setil -keyalg RSA -keysize 2048 -validity 10000
```

Keep the resulting `.jks` file and its passwords; neither should be committed to VCS.

Create `android/key.properties` locally to tell Gradle about the key:

```properties
storeFile=../setil-release.jks
storePassword=$YOUR_PASSWORD
keyAlias=setil
keyPassword=$YOUR_PASSWORD
```

### Register Fingerprints with Firebase

Google sign-in identifies an Android build using the SHA certificate fingerprint of the key that signed it. The SHA-1 and SHA-256 fingerprints for the debug and release variants can be displayed with:

```bash
.\gradlew signingReport
```

```bash
keytool -list -v -keystore .\setil-release.jks` -alias setil
```

Add both SHA-1/SHA-256 fingerprints in Firebase Console under the Android project settings fingerprints.

After changing fingerprints, download and replace `google-services.json`

If Google Play App Signing is enabled, also add the **app signing key** fingerprints shown in Google Play Console.

## Versioning

The public facing Android `versionName` is read from the root `package.json` version during the Gradle build. The numeric `versionCode` in `app/build.gradle` must still be incremented for each published Google Play release.
