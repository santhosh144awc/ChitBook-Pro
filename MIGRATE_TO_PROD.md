# Step-by-Step Guide: Move Database to Production Firebase

This guide walks you through moving your ChitBook Pro database from development to production Firebase.

---

## 📋 Overview

You have **two main options**:

1. **Option A: Use Same Firebase Project** (Simplest)
   - Keep using your existing Firebase project for both dev and prod
   - Just update environment variables when deploying
   - ✅ No data migration needed

2. **Option B: Separate Production Project** (Recommended for Production)
   - Create a new Firebase project for production
   - Migrate all data from dev to prod
   - ✅ Better security and isolation

---

## 🎯 Quick Decision Guide

**Choose Option A if:**
- Small/medium app
- You want to keep everything simple
- No need for separate environments

**Choose Option B if:**
- You want production isolation
- You plan to have multiple environments
- You need better security separation

---

## 📝 OPTION A: Using Same Firebase Project (Simple)

### Step 1: Get Your Current Firebase Config

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your current project
3. Click the ⚙️ **gear icon** → **Project settings**
4. Scroll to **"Your apps"** section
5. If you don't have a web app, click **"Add app"** → **Web** (`</>`)
6. Copy the configuration values

### Step 2: Update Environment Variables for Production

Your production hosting platform needs these variables. Add them in your hosting provider:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### Step 3: Set Up Production Firestore Rules

1. Go to **Firestore Database** → **Rules** tab
2. Copy the rules from `firestore.rules` file or use:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    match /users/{userId}/{document=**} {
      allow read, write: if isOwner(userId);
    }
    
    match /userApprovals/{approvalId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated();
    }
    
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **"Publish"**

### Step 4: Create Firestore Indexes (If Needed)

Firestore will prompt you when indexes are needed, but you can create them proactively:

1. Go to **Firestore Database** → **Indexes** tab
2. Click **"Create Index"**
3. Create these composite indexes if you see errors:

   - **Collection**: `users/{userId}/groupMembers`
     - Fields: `groupId` (Ascending), `createdAt` (Descending)
   
   - **Collection**: `users/{userId}/payments`
     - Fields: `clientId` (Ascending), `paymentDueDate` (Ascending)
   
   - **Collection**: `users/{userId}/paymentLogs`
     - Fields: `clientId` (Ascending), `paymentDate` (Descending)

### Step 5: Enable Authentication (If Not Already)

1. Go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Save

### Step 6: Deploy Your App

Your database is ready! Now deploy your app using your hosting platform.

**✅ Done!** Your data is already in production since you're using the same project.

---

## 🔄 OPTION B: Separate Production Project (Recommended)

### Phase 1: Create Production Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add Project"** or **"Create a Project"**
3. Enter project name: `chitbook-pro-prod` (or your preferred name)
4. Follow the wizard:
   - Enable/disable Google Analytics (optional)
   - Create or choose billing account (Free tier is usually sufficient)

### Phase 2: Set Up Production Services

#### 2.1 Enable Authentication

1. In your **new production project**, go to **Authentication**
2. Click **"Get started"**
3. Go to **Sign-in method** tab
4. Enable **Email/Password** provider
5. Click **Save**

#### 2.2 Create Firestore Database

1. Go to **Firestore Database**
2. Click **"Create database"**
3. Choose **Production mode** (recommended) or **Test mode** (for initial testing)
4. Select a **location** (choose closest to your users)
5. Click **Enable**

#### 2.3 Set Up Firestore Security Rules

1. Go to **Firestore Database** → **Rules** tab
2. Paste the rules from `firestore.rules` or use the rules shown in Option A above
3. Click **Publish**

#### 2.4 Create Firestore Indexes

1. Go to **Firestore Database** → **Indexes** tab
2. Create the same indexes mentioned in Option A, Step 4

### Phase 3: Get Production Firebase Config

1. In your **production project**, go to ⚙️ **Project settings**
2. Scroll to **"Your apps"** section
3. Click **"Add app"** → **Web** (`</>`)
4. Register app with nickname: `ChitBook Pro Production`
5. Copy the configuration values

You'll get something like:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "chitbook-pro-prod.firebaseapp.com",
  projectId: "chitbook-pro-prod",
  storageBucket: "chitbook-pro-prod.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### Phase 4: Migrate User Authentication

**⚠️ Important:** Users must exist in production Firebase Auth before migrating their data.

#### Method 1: Manual User Creation (For Small Number of Users)

1. Go to **Authentication** → **Users** in production project
2. Click **"Add user"**
3. Enter email and password
4. Repeat for all users

#### Method 2: Import Users via Firebase CLI (For Many Users)

1. **Install Firebase CLI** (if not installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**:
   ```bash
   firebase login
   ```

3. **Export users from development**:
   ```bash
   firebase auth:export dev-users.json --project your-dev-project-id
   ```

4. **Import users to production**:
   ```bash
   firebase auth:import dev-users.json --project your-prod-project-id
   ```

### Phase 5: Migrate Firestore Data

You have three options for migrating data:

---

#### **Option 5A: Use Migration Script (Recommended)**

1. **Install dependencies**:
   ```bash
   npm install firebase-admin
   ```

2. **Get Service Account Keys**:
   - Go to **Firebase Console** → **Project Settings** → **Service Accounts**
   - Click **"Generate New Private Key"** for **development project**
   - Save as `serviceAccountKey-dev.json` (in `scripts` folder)
   - Repeat for **production project**
   - Save as `serviceAccountKey-prod.json` (in `scripts` folder)
   - ⚠️ **Never commit these files to git!**

3. **Create migration script**: `scripts/migrate-to-prod.js`

   (The script is already documented in `scripts/migrate-data.md`)

4. **Run the migration**:
   ```bash
   node scripts/migrate-to-prod.js
   ```

---

#### **Option 5B: Manual Export/Import via Console**

1. **Export from Development**:
   - This is manual - you'll need to copy data document by document
   - Not recommended for large datasets

2. **Import to Production**:
   - Manually create collections and documents
   - Paste exported data

---

#### **Option 5C: Use Firebase CLI Export/Import**

1. **Install Google Cloud SDK** (if not installed)

2. **Export from development**:
   ```bash
   gcloud firestore export gs://your-bucket-name/firestore-backup --project=your-dev-project-id
   ```

3. **Import to production**:
   ```bash
   gcloud firestore import gs://your-bucket-name/firestore-backup --project=your-prod-project-id
   ```

**Note:** This requires setting up Google Cloud Storage buckets.

---

### Phase 6: Create Production Environment File

Create `.env.production` file (for local testing) or add to your hosting platform:

```env
# Firebase Production Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-production-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-prod-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-prod-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-prod-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

**⚠️ Important:** Never commit `.env.production` to git!

### Phase 7: Test Production Setup

1. **Temporarily update** `.env.local` with production config
2. **Run locally**:
   ```bash
   npm run dev
   ```
3. **Test**:
   - Login with production user
   - Verify data loads correctly
   - Test CRUD operations
   - Check security rules work

### Phase 8: Deploy Your App

Deploy your app with production environment variables set in your hosting platform.

---

## 🔍 Verification Checklist

After migration, verify:

- [ ] Users can log in to production
- [ ] All clients data is visible
- [ ] Groups are accessible
- [ ] Auctions are showing correctly
- [ ] Payments are working
- [ ] Reports are generating
- [ ] No permission errors in console
- [ ] Firestore indexes are created

---

## 🚨 Important Security Notes

1. **Service Account Keys**: 
   - Keep them secure
   - Never commit to git (they're already in `.gitignore`)
   - Delete them after migration if no longer needed

2. **Environment Variables**:
   - Never commit `.env.production` to git
   - Use secure variable storage in hosting platform

3. **Firestore Rules**:
   - Always test rules before going live
   - Start with strict rules and relax as needed

4. **Backup**:
   - Always backup production database before making changes
   - Consider setting up automated backups

---

## 📞 Need Help?

- **Firebase Documentation**: https://firebase.google.com/docs
- **Firestore Migration**: https://firebase.google.com/docs/firestore/manage-data/move-data
- **Firebase CLI**: https://firebase.google.com/docs/cli

---

## 🎉 Quick Reference Commands

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Switch projects
firebase use dev-project-id      # Development
firebase use prod-project-id     # Production

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Export users
firebase auth:export users.json --project your-project-id

# Import users
firebase auth:import users.json --project your-project-id
```

---

**Choose your option and follow the steps. If you need help with any specific step, let me know!**

