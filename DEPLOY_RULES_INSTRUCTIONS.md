# Deploy Firestore Rules - Quick Instructions

## Option 1: Firebase Console (Easiest - 2 minutes)

1. **Open Firebase Console**: https://console.firebase.google.com
2. **Select your project**: `chit-application-cursor`
3. **Go to Firestore Database** → Click **"Rules"** tab
4. **Delete all existing rules** in the editor
5. **Copy the entire content** from `firestore.rules` file (shown below)
6. **Paste** into the Firebase Console rules editor
7. **Click "Publish"** button (top right)
8. **Wait 10-20 seconds** for rules to deploy
9. **Refresh your application** - errors should be gone!

---

## Option 2: Firebase CLI (If you prefer command line)

### Step 1: Complete Firebase Login

Open a terminal and run:
```bash
firebase login
```

When prompted:
- **Enable Gemini?** → Type `n` and press Enter (or `Y` if you want it)
- A browser window will open
- **Sign in** with your Google account
- **Allow** Firebase CLI access
- Return to terminal - you should see "Success! Logged in as..."

### Step 2: Deploy Rules

```bash
firebase deploy --only firestore:rules
```

You should see:
```
✔  Deploy complete!
```

---

## Rules Content (Copy this to Firebase Console)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user is admin
    function isAdmin() {
      return isAuthenticated() && request.auth.token.admin == true;
    }
    
    // Shared collections - all authenticated users can access
    // Clients, Groups, Group Members, Auctions, Payments, Payment Logs
    match /clients/{document=**} {
      allow read, write: if isAuthenticated();
    }
    
    match /groups/{document=**} {
      allow read, write: if isAuthenticated();
    }
    
    match /groupMembers/{document=**} {
      allow read, write: if isAuthenticated();
    }
    
    match /auctions/{document=**} {
      allow read, write: if isAuthenticated();
    }
    
    match /payments/{document=**} {
      allow read, write: if isAuthenticated();
    }
    
    match /paymentLogs/{document=**} {
      allow read, write: if isAuthenticated();
    }
    
    // Legacy user-specific data paths (for migration purposes)
    // Users can access their own data OR admins can access any user's data
    match /users/{userId}/{document=**} {
      // Allow read if user owns the data OR user is admin
      allow read: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      // Allow write (create, update, delete) if user owns the data OR user is admin
      allow write: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
    }
    
    // User Approvals - admins can manage all, users can create their own
    match /userApprovals/{approvalId} {
      // Admins can read all, users can read their own
      allow read: if isAuthenticated() && (isAdmin() || resource.data.userId == request.auth.uid);
      // Users can create their own approval request during registration
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      // Only admins can update approvals (approve/reject users)
      allow update: if isAuthenticated() && isAdmin();
      // Only admins can delete approval records
      allow delete: if isAuthenticated() && isAdmin();
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## After Deployment

1. **Refresh your application** in the browser
2. **Check the console** - errors should be gone
3. **Verify data loads** - clients, groups, auctions should appear
4. **Test with both users** - both should see the same data

---

## Troubleshooting

**If you still see errors after deploying:**
1. Wait 30-60 seconds (rules can take time to propagate)
2. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
3. Clear browser cache
4. Check Firebase Console → Firestore → Rules to confirm rules are published
5. Verify you're logged in to the application

