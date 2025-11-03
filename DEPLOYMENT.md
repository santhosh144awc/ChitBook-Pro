# Firebase Production Deployment Guide

This guide explains how to move your ChitBook Pro database and application to production in Firebase.

## Option 1: Use the Same Firebase Project (Recommended for Small/Medium Apps)

If you're using the same Firebase project for both development and production, you just need to:
1. Update environment variables for production hosting
2. Deploy your application

**No data migration needed** - your data stays in the same database.

## Option 2: Separate Firebase Projects (Recommended for Large Apps)

Use separate projects for development and production. This is more secure and allows you to test without affecting production data.

---

## Step 1: Create Production Firebase Project (If Using Separate Projects)

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add Project"** or **"Create a Project"**
3. Enter project name: `chitbook-pro-prod` (or your preferred name)
4. Follow the setup wizard:
   - Disable Google Analytics (or enable if you want it)
   - Choose or create a billing account (Firebase free tier is usually sufficient)

---

## Step 2: Export Data from Development (If Using Separate Projects)

### Method A: Using Firebase Console (Manual Export)

1. Go to your **development** Firebase project
2. Navigate to **Firestore Database**
3. For each collection (`users`, `userApprovals` if exists):
   - Click on the collection
   - Select all documents
   - Manually copy or use export functionality

### Method B: Using Firebase CLI (Recommended)

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Initialize Firebase in your project**:
   ```bash
   firebase init
   ```
   - Select **Firestore**
   - Choose your development project
   - Choose **Use an existing rules file** (if you have one)

4. **Export Firestore Data**:
   ```bash
   # Export from development project
   firebase use your-dev-project-id
   
   # Use gcloud to export (requires Google Cloud SDK)
   gcloud firestore export gs://your-bucket-name/firestore-backup
   ```

### Method C: Using Node.js Script (Easiest)

Create a migration script to export and import data.

---

## Step 3: Set Up Production Firebase Services

### 3.1 Enable Authentication
1. Go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Add your production domain to authorized domains if needed

### 3.2 Create Firestore Database
1. Go to **Firestore Database**
2. Click **"Create database"**
3. Choose **Production mode** (or start in test mode)
4. Select a location (choose closest to your users)
5. Click **"Enable"**

### 3.3 Set Up Firestore Security Rules

1. Go to **Firestore Database** → **Rules** tab
2. Paste these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User-specific collections (users/{userId}/...)
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Public collections (if any) - adjust as needed
    match /{document=**} {
      allow read, write: if false; // Default: deny all
    }
  }
}
```

3. Click **"Publish"**

### 3.4 Create Firestore Indexes

Firestore will prompt you to create indexes when needed. However, if you've encountered index errors in development, create them proactively:

1. Go to **Firestore Database** → **Indexes** tab
2. Create composite indexes for common queries:
   - Collection: `users/{userId}/groupMembers`
     - Fields: `groupId` (Ascending), `createdAt` (Descending)
   - Collection: `users/{userId}/payments`
     - Fields: `clientId` (Ascending), `paymentDueDate` (Ascending)
   - Collection: `users/{userId}/paymentLogs`
     - Fields: `clientId` (Ascending), `paymentDate` (Descending)

---

## Step 4: Import Data to Production (If Using Separate Projects)

### Method A: Using Firebase Console (Manual Import)

1. Go to your **production** Firebase project
2. Navigate to **Firestore Database**
3. Manually create collections and documents
4. Copy data from development export

### Method B: Using Migration Script

See **Step 6** below for a data migration script.

---

## Step 5: Get Production Firebase Config

1. Go to **Project Settings** (gear icon) → **General** tab
2. Scroll to **"Your apps"** section
3. If you don't have a web app, click **"Add app"** → **Web** (</>)
4. Register your app (give it a nickname)
5. Copy the Firebase configuration object

You'll get something like:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## Step 6: Create Production Environment File

Create `.env.production` or update your hosting platform's environment variables:

```env
# Firebase Production Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-production-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-production-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

**For hosting platforms** (Vercel, Netlify, etc.):
- Add these variables in your project settings → Environment Variables

---

## Step 7: Create Data Migration Script (Optional)

If you're moving data between projects, create this script:

```javascript
// scripts/migrate-to-prod.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize source (dev) Firebase Admin
const sourceApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://your-dev-project.firebaseio.com'
}, 'source');

// Initialize destination (prod) Firebase Admin  
const destApp = admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey-prod.json')),
  databaseURL: 'https://your-prod-project.firebaseio.com'
}, 'dest');

const sourceDb = sourceApp.firestore();
const destDb = destApp.firestore();

async function migrateCollection(collectionPath) {
  const snapshot = await sourceDb.collection(collectionPath).get();
  const batch = destDb.batch();
  
  snapshot.docs.forEach((doc) => {
    batch.set(destDb.collection(collectionPath).doc(doc.id), doc.data());
  });
  
  await batch.commit();
  console.log(`Migrated ${snapshot.size} documents from ${collectionPath}`);
}

async function migrateUserData(userId) {
  const collections = ['clients', 'groups', 'groupMembers', 'auctions', 'payments', 'paymentLogs'];
  
  for (const collection of collections) {
    const path = `users/${userId}/${collection}`;
    await migrateCollection(path);
  }
}

// Run migration
migrateUserData('your-user-id').then(() => {
  console.log('Migration complete!');
  process.exit(0);
}).catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
```

**Note:** This requires Firebase Admin SDK service account keys.

---

## Step 8: Deploy Your Application

### Option A: Deploy to Vercel (Recommended for Next.js)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```
   
3. **Add environment variables** in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add all `NEXT_PUBLIC_*` variables

### Option B: Deploy to Firebase Hosting

1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```

2. **Initialize Firebase Hosting**:
   ```bash
   firebase init hosting
   ```
   - Select your production project
   - Public directory: `out` (for static export) or `.next` (for SSR)
   - Configure as needed

3. **Build and deploy**:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

### Option C: Deploy to Other Platforms

- **Netlify**: Connect GitHub repo and set environment variables
- **Hostinger**: Upload build output via FTP/File Manager
- **AWS S3 + CloudFront**: Upload static files

---

## Step 9: Verify Production Deployment

1. **Test Authentication**:
   - Try logging in with a production user
   - Verify user can access dashboard

2. **Test Data Access**:
   - Verify data loads correctly
   - Test CRUD operations
   - Check that security rules work

3. **Monitor Firebase Console**:
   - Check **Firestore** → Usage tab for activity
   - Monitor **Authentication** → Users
   - Check **Hosting** → Usage for bandwidth

---

## Quick Reference Commands

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Switch between projects
firebase use dev-project-id     # Development
firebase use prod-project-id     # Production

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Build Next.js for production
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

---

## Important Notes

1. **Backup Before Migration**: Always backup your development data before migrating
2. **Test in Staging**: If possible, test the migration in a staging environment first
3. **User Authentication**: Users need to be created in the production Firebase Authentication
4. **Environment Variables**: Never commit `.env.production` to version control
5. **Security Rules**: Always review and test security rules before going live
6. **Firestore Indexes**: Create indexes proactively to avoid runtime errors

---

## Troubleshooting

### Issue: "Permission denied" errors
- Check Firestore security rules
- Verify user is authenticated
- Ensure rules allow access to user's own data

### Issue: "Index required" errors
- Go to Firestore → Indexes
- Create the required composite index
- Wait for index to build (can take a few minutes)

### Issue: Authentication not working
- Verify environment variables are set correctly
- Check Firebase Console → Authentication → Sign-in methods
- Ensure domain is authorized in Authentication settings

---

## Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Migration Guide](https://firebase.google.com/docs/firestore/manage-data/move-data)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
