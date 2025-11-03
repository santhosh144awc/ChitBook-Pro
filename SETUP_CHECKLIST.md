# Setup Checklist - Next Steps

## ✅ Step 1: Verify Node.js Installation (Do this first!)

1. **Close this terminal/PowerShell window completely**
2. **Open a NEW PowerShell or Terminal window**
   - Press `Win + X` and select "Windows PowerShell" or "Terminal"
   - Or press `Win + R`, type `powershell`, press Enter

3. **Verify installation:**
   ```bash
   node --version
   npm --version
   ```
   You should see version numbers (like v20.11.0 and 10.2.4)

## ✅ Step 2: Navigate to Your Project

In the NEW terminal, navigate to your project:

```bash
cd "E:\Software\Cursor\ChitBook Pro"
```

## ✅ Step 3: Install Dependencies

```bash
npm install
```

This will download all required packages (Next.js, Firebase, Tailwind, etc.)
**This may take 2-5 minutes** depending on your internet speed.

## ✅ Step 4: Set Up Firebase (Required before running!)

Before running the app, you need to:

1. **Create a Firebase Project:**
   - Go to https://console.firebase.google.com/
   - Click "Add project" or select existing project
   - Follow the setup wizard

2. **Enable Authentication:**
   - In Firebase Console, go to "Authentication"
   - Click "Get started"
   - Go to "Sign-in method" tab
   - Enable "Email/Password" provider
   - Click "Save"

3. **Create Firestore Database:**
   - In Firebase Console, go to "Firestore Database"
   - Click "Create database"
   - Choose "Start in test mode" (we'll add security rules later)
   - Select a location (choose closest to you)
   - Click "Enable"

4. **Get Your Firebase Config:**
   - In Firebase Console, click the gear icon ⚙️ > "Project settings"
   - Scroll down to "Your apps" section
   - If no web app exists, click "</>" (Web app icon)
   - Register app with a nickname (e.g., "ChitBook Pro")
   - Copy the config values

5. **Create .env.local file:**
   - In your project folder, create a file named `.env.local`
   - Add your Firebase config:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

## ✅ Step 5: Set Up Firestore Security Rules

1. In Firebase Console, go to "Firestore Database" > "Rules"
2. Replace the rules with the content from `firestore.rules` file in your project
3. Click "Publish"

## ✅ Step 6: Run the Application

After completing all above steps:

```bash
npm run dev
```

You should see:
```
✓ Ready in X seconds
○ Local:        http://localhost:3000
```

## ✅ Step 7: Open in Browser

Open your browser and go to:
```
http://localhost:3000
```

You should see the login page!

## 🎉 Step 8: Create Your First Account

1. Click "Sign up" on the login page
2. Enter your email and password (minimum 6 characters)
3. You'll be automatically logged in and redirected to the dashboard

## Troubleshooting

### If npm commands don't work:
- Restart your computer to update PATH
- Or manually add Node.js to PATH (see INSTALL_NODEJS.md)

### If you see Firebase errors:
- Check that `.env.local` file exists and has correct values
- Verify Firebase project is set up correctly
- Check browser console for specific error messages

### If port 3000 is already in use:
- The app will automatically use the next available port (3001, 3002, etc.)
- Check the terminal output for the actual URL

## Need Help?

- Check browser console (F12) for errors
- Check terminal output for errors
- Verify all environment variables are set correctly
