# Production Security Rules for Firestore

## 🔒 Current Status

You have **production-ready security rules** in your `firestore.rules` file, but they need to be published to Firebase Console to replace the insecure default rules.

---

## ✅ Production Security Rules (With Admin Support)

Your `firestore.rules` file now includes admin functionality. Admins can access and delete all users' data.

Copy these rules to your Firebase Console → Firestore → Rules:

```javascript
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
    
    // Helper function to check if user owns the data
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users can access their own data OR admins can access any user's data
    // This protects all collections under users/{userId}/...
    // Examples: users/{userId}/clients, users/{userId}/groups, etc.
    match /users/{userId}/{document=**} {
      // Allow read if user owns the data OR user is admin
      allow read: if isOwner(userId) || isAdmin();
      // Allow write (create, update, delete) if user owns the data OR user is admin
      allow write: if isOwner(userId) || isAdmin();
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
    
    // Deny all other access - Default deny for security
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**🔐 Admin Functionality**: See `ADMIN_SETUP.md` for instructions on setting up admin users.

---

## 📋 What Each Rule Does

### 1. `isAuthenticated()` Helper Function
- Checks if the user is logged in
- Returns `true` if `request.auth` is not null

### 2. `isOwner(userId)` Helper Function
- Checks if the authenticated user owns the data
- Ensures `request.auth.uid == userId`
- Prevents users from accessing other users' data

### 3. `match /users/{userId}/{document=**}`
- **What it protects**: All collections under a user's path
  - `users/{userId}/clients`
  - `users/{userId}/groups`
  - `users/{userId}/groupMembers`
  - `users/{userId}/auctions`
  - `users/{userId}/payments`
  - `users/{userId}/paymentLogs`
- **Access**: Users can only read/write their own data
- **Security**: Very secure - isolates each user's data

### 4. `match /userApprovals/{approvalId}`
- **What it protects**: User registration approval records
- **Read access**: Any authenticated user (for admin dashboard)
- **Create access**: Users can create their own approval request
- **Update access**: Authenticated users can update (approve/reject)
- **Delete access**: Denied (approvals shouldn't be deleted)

### 5. `match /{document=**}`
- **Default deny rule**: Blocks access to any other path not explicitly allowed
- **Security**: Prevents accidental exposure of data

---

## 🚀 How to Publish These Rules

### Step 1: Open Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **"Chit Application Cursor"**
3. Click **"Firestore Database"** in the left sidebar
4. Click the **"Rules"** tab

### Step 2: Replace the Rules

1. **Delete** all the existing test rules (the ones with `timestamp.date(2025, 12, 2)`)
2. **Copy and paste** the production rules from above (or from your `firestore.rules` file)
3. **Review** the rules to make sure they match

### Step 3: Publish

1. Click **"Publish"** button (top right)
2. Confirm the publish action
3. Wait a few seconds for rules to deploy

### Step 4: Verify

1. The rules should now show your production rules
2. You should see a message confirming the rules are published
3. **Test** by trying to access your app - everything should work the same

---

## 🔍 Testing Your Rules

After publishing, test that:

- ✅ **Users can access their own data**: Login and verify you see your clients, groups, etc.
- ✅ **Users cannot access others' data**: Try accessing `users/different-user-id/clients` - should be denied
- ✅ **Unauthenticated users cannot access**: Sign out - should not be able to read/write data
- ✅ **Approvals work**: Registration approval flow should work

---

## 🔐 Enhanced Security (Optional - For Future)

For even better security, consider these enhancements:

### Option 1: Admin-Only Approval Updates

If you want only admins to approve/reject users:

```javascript
match /userApprovals/{approvalId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
  // Only admins can update
  allow update: if isAuthenticated() && request.auth.token.admin == true;
  allow delete: if false;
}
```

**Note**: This requires setting custom claims in Firebase Auth (admin token). See Firebase documentation for setting custom claims.

### Option 2: Field-Level Validation

Add validation to ensure data integrity:

```javascript
match /users/{userId}/clients/{clientId} {
  allow read: if isOwner(userId);
  allow create: if isOwner(userId) && 
    request.resource.data.name is string &&
    request.resource.data.name.size() > 0;
  allow update: if isOwner(userId);
  allow delete: if isOwner(userId);
}
```

### Option 3: Timestamp Validation

Ensure timestamps are not manipulated:

```javascript
match /users/{userId}/auctions/{auctionId} {
  allow read: if isOwner(userId);
  allow create: if isOwner(userId) && 
    request.resource.data.createdAt == request.time;
  allow update: if isOwner(userId);
  allow delete: if isOwner(userId);
}
```

---

## ⚠️ Important Security Notes

1. **Never use test rules in production** - The default rules allow anyone to access your data
2. **Rules are enforced client-side** - But also validated server-side by Firebase
3. **Rules are case-sensitive** - Make sure paths match exactly
4. **Test rules thoroughly** - Before going live, test all operations
5. **Monitor access** - Check Firebase Console → Firestore → Usage for suspicious activity

---

## 📊 Current Rule Coverage

| Collection Path | Read Access | Write Access | Security Level |
|----------------|-------------|--------------|----------------|
| `users/{userId}/clients` | Owner only | Owner only | ✅ Secure |
| `users/{userId}/groups` | Owner only | Owner only | ✅ Secure |
| `users/{userId}/groupMembers` | Owner only | Owner only | ✅ Secure |
| `users/{userId}/auctions` | Owner only | Owner only | ✅ Secure |
| `users/{userId}/payments` | Owner only | Owner only | ✅ Secure |
| `users/{userId}/paymentLogs` | Owner only | Owner only | ✅ Secure |
| `userApprovals/{approvalId}` | Authenticated | Authenticated | ⚠️ Moderate* |

*Moderate because any authenticated user can read/update approvals. Consider adding admin-only restrictions for production if you have admin users.

---

## 🆘 Troubleshooting

### "Permission denied" errors after publishing rules

**Possible causes:**
- User is not authenticated (not logged in)
- User trying to access another user's data
- Rules syntax error

**Solution:**
- Check browser console for specific error
- Verify user is logged in
- Check that `request.auth.uid` matches the `userId` in the path

### Rules not updating

**Solution:**
- Wait a few seconds after publishing
- Clear browser cache
- Check Firebase Console to confirm rules are published

### Need to temporarily allow access

**⚠️ DO NOT DO THIS IN PRODUCTION!**

If you need temporary access for debugging:
- Create a test project with test rules
- Never use test rules in production

---

## ✅ Pre-Production Checklist

Before going live, make sure:

- [ ] Production rules are published (not test rules)
- [ ] All users can access their own data
- [ ] Users cannot access others' data
- [ ] Unauthenticated users cannot access any data
- [ ] Registration approval flow works
- [ ] No permission errors in browser console
- [ ] Firestore indexes are created (if needed)

---

**Your rules in `firestore.rules` are production-ready! Just publish them to Firebase Console and you're secure! 🔒**

