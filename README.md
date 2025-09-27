# Block2Lock: From Web to Android APK

This guide provides a complete, step-by-step process for cloning the Block2Lock repository and building a signed, installable Android APK file using Capacitor.

## Prerequisites

Before you begin, ensure you have the following installed and configured on your system:

1.  **Git:** For cloning the repository.
2.  **Node.js and npm:** At least version 18. [Download here](https://nodejs.org/).
3.  **Java Development Kit (JDK):** Version 21 is required by the latest Capacitor tooling. You can install it manually or let Android Studio manage it (see Troubleshooting).
4.  **Android Studio:** The official IDE for Android development. [Download here](https://developer.android.com/studio).
    *   During installation, make sure to install the **Android SDK Platforms** and **Android SDK Command-line Tools**.

---

## Step 1: Clone the Repository & Install Dependencies

Open your terminal or command prompt, navigate to the directory where you want to store the project, and run the following commands:

```bash
# Replace with your actual repository URL
git clone https://github.com/L9s-G/Block2Lock-web.git
cd Block2Lock-web
npm install
```
This downloads the project and installs the Capacitor CLI and other required packages defined in `package.json`.

---

## Step 2: Initialize Capacitor

This crucial step creates the `capacitor.config.json` file which defines your application's metadata. While the file is already included in this repository, running `init` can be a good first step in a fresh environment to ensure Capacitor's tooling is set up correctly.

1.  Run the init command:
    ```bash
    npx cap init
    ```
2.  You will be prompted for your App Name and App ID. You can enter the following values:
    *   **App Name:** `Block2Lock`
    *   **App ID:** `ai.dsgr.block2lock`

3.  **Important:** The `capacitor.config.json` file included in this repository contains specific settings required for the Android build (like setting the Java version to 21). Ensure your file matches the one from the repository.

---

## Step 3: Add and Sync the Android Platform

Now, we'll create the native Android project folder and copy our web assets into it.

1.  **Add the Android platform.** This creates the `/android` directory:
    ```bash
    npx cap add android
    ```
    > **Note:** If the `/android` directory already exists from a previous attempt, it's best to delete it (`rm -rf android`) before running `add` to ensure a clean setup.

2.  **Sync the web assets.** This copies your web code (from the `/www` directory) into the native Android project. **Run this command every time you make changes to the game's web code.**
    ```bash
    npx cap sync android
    ```

---

## Step 4: Open the Project in Android Studio

This command launches Android Studio and opens your new Android project.

```bash
npx cap open android
```

Wait for Android Studio to fully load and for Gradle to finish its initial sync. This can take a few minutes the first time.

---

## Step 5: (Optional) Customize the APK Filename

By default, Android Studio names the output file `app-release.apk`. For better version management and clarity, you can change this to something like `Block2Lock-v1.0.0.apk`.

1.  In the Android Studio project pane on the left, navigate to and open the file: `Gradle Scripts` -> `build.gradle (Module :app)`.
2.  Scroll to the very bottom of the file and add the following code block:

    ```groovy
    // Add this block to customize the output APK filename
    android.applicationVariants.all { variant ->
        variant.outputs.all {
            def project = "Block2Lock"
            def SEP = "-"
            def version = variant.versionName
            def date = new Date()
            def formattedDate = date.format('yyyyMMdd')
    
            def newApkName = project + SEP + version + SEP + formattedDate + ".apk"
    
            outputFileName = newApkName
        }
    }
    ```
3.  After pasting the code, a yellow bar will likely appear at the top of the editor window saying "Gradle files have changed...". Click the **Sync Now** link.

This script will now automatically name your APK using the project name and the version name defined higher up in the `build.gradle` file.

---

## Step 6: Generate a Signed Release APK

An unsigned app cannot be installed for security reasons. We need to create a digital signature (a keystore) and use it to sign our app.

> **CRITICAL:** You only create this keystore file **once**. Keep it safe and back it up! If you lose it, you will not be able to publish updates for your app on the Google Play Store.

1.  In the Android Studio top menu, go to **Build → Generate Signed Bundle / APK...**.
2.  Select **APK** and click **Next**.
3.  Under the `Key store path` field, click **Create new...**.
4.  **Fill out the Keystore Form:**
    *   **Key store path:** Click the folder icon and choose a safe, permanent location **outside** of your project folder to save your `.jks` file (e.g., in your user's Documents folder). Give it a name like `block2lock-release-key.jks`.
    *   **Password:** Create a strong password for the keystore file.
    *   **Alias:** Give your key an alias, like `block2lock`.
    *   **Password:** Create a strong password for the key itself (it can be the same as the keystore password).
    *   **Certificate:** Fill in at least one of the fields (e.g., `Organization`).
    *   Click **OK**.
5.  You will be returned to the previous screen with your new key's information filled in. You can check `Remember passwords` for convenience. Click **Next**.
6.  **Select Build Variant:**
    *   Choose the **release** build variant.
    *   Ensure both **V1 (Jar Signature)** and **V2 (Full APK Signature)** are checked.
    *   Click **Finish**.

Android Studio will now build your signed APK. When it's done, a notification will appear in the bottom-right corner.

---

## Step 7: Locate and Install the APK

1.  Click the **locate** link in the notification popup.
2.  This will open the project's output folder: `/android/app/release/`.
3.  Inside, you will find your custom-named file (e.g., `Block2Lock-1.0-20240728.apk`).
4.  Transfer this file to your Android device (via USB, email, cloud storage, etc.).
5.  On your phone, locate the file and tap to install. You may need to grant permission to "install from unknown sources".

**Congratulations! You have successfully built and signed your Android application.**

---

## Troubleshooting Common Issues

### Issue: Gradle Sync Fails with a JDK Version Error
This error (e.g., `invalid source release: 21`) can occur if Android Studio's Gradle is not using the correct JDK version. This project is configured in `capacitor.config.json` to use JDK 21 automatically, but if your environment has a different default, you may need to set it manually.

*   **Solution:** Manually set the JDK in Android Studio.
    1.  Go to `File` > `Settings` > `Build, Execution, Deployment` > `Build Tools` > `Gradle`.
    2.  In the **Gradle JDK** dropdown, select a JDK of version **21**. If one isn't available, click "Download JDK..." and have Android Studio download and install it for you.
    3.  Click `OK` and let Gradle sync again.
