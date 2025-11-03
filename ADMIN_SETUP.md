# Admin Setup Guide

This guide explains how to set up admin users who can access and delete all users' data.

---

## 🔐 What Are Admin Users?

Admin users have special privileges:
- ✅ Can **read** all users' data
- ✅ Can **edit** all users' data
- ✅ Can **delete** all users' data
- ✅ Can **approve/reject** user registrations
- ✅ Can **delete** approval records

Regular users can only access their own data.

---

## 🚀 Step 1: Update Firestore Security Rules

Your `firestore.rules` file has been updated with admin support. The rules now include:

1. **`isAdmin()` function** - Checks if user has admin custom claim
2. **Admin access to user data** - Admins can read/write/delete any user's data
3. **Admin-only approval management** - Only admins can approve/reject users

**The rules are already updated in your `firestore.rules` file!**

Now you need to:
1. **Publish these rules** to Firebase Console
2. **Set admin custom claims** for your admin users

---

## 📝 Step 2: Get Firebase Service Account Key

You need a service account key to set admin claims:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click ⚙️ **gear icon** → **Project settings**
4. Go to **Service Accounts** tab
5. Click **"Generate New Private Key"**
6. Click **"Generate Key"** in the dialog
7. Save the JSON file as `serviceAccountKey.json`
8. **Move it to** `scripts/serviceAccountKey.json`

⚠️ **SECURITY**: Never commit this file to git! It's already in `.gitignore`

---

## 🔧 Step 3: Set Up Admin Script

1. **Install Firebase Admin SDK** (if not already installed):
   ```bash
   npm install firebase-admin
   ```

2. **Place service account key** in `scripts/serviceAccountKey.json`

3. **Update the script** (optional):
   - Open `scripts/set-admin.js`
   - You can update `ADMIN_USER_EMAIL` or use command line arguments

---

## 👤 Step 4: Make a User Admin

### Method 1: Using Command Line (Recommended)

```bash
# Make a user admin
node scripts/set-admin.js set admin@yourdomain.com

# Check if user is admin
node scripts/set-admin.js check admin@yourdomain.com

# Remove admin status
node scripts/set-admin.js remove admin@yourdomain.com
```

### Method 2: Update Script Directly

1. Open `scripts/set-admin.js`
2. Change this line:
   ```javascript
   const ADMIN_USER_EMAIL = 'admin@yourdomain.com'; // Your admin email
   ```
3. Run the script:
   ```bash
   node scripts/set-admin.js
   ```

---

## ⚠️ IMPORTANT: User Must Re-login

After setting admin claims, the user **must**:
1. **Sign out** from the app
2. **Sign back in**

This is because Firebase Auth tokens are cached. The new admin claim will only be available after re-authentication.

---

## 🔍 Step 5: Verify Admin Status

### Check in Code

Update your `AuthContext.tsx` to check for admin status:

```typescript
// After user logs in, check admin status
const checkAdminStatus = async () => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdTokenResult();
    const isAdmin = token.claims.admin === true;
    // Use isAdmin in your app
  }
};
```

### Test Admin Access

1. **Login as admin user**
2. **Try to access another user's data** (if you have admin UI)
3. **Check browser console** - should not show permission errors
4. **Verify Firestore Console** - admin should be able to see all data

---

## 📋 Firestore Rules Explained

### Admin Access to User Data

```javascript
match /users/{userId}/{document=**} {
  allow read: if isOwner(userId) || isAdmin();
  allow write: if isOwner(userId) || isAdmin();
}
```

**What this means:**
- Regular users: Can only access `users/{their-uid}/...`
- Admin users: Can access `users/{any-uid}/...`

### Admin-Only Approval Management

```javascript
match /userApprovals/{approvalId} {
  allow read: if isAuthenticated() && (isAdmin() || resource.data.userId == request.auth.uid);
  allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
  allow update: if isAuthenticated() && isAdmin();  // Only admins
  allow delete: if isAuthenticated() && isAdmin(); // Only admins
}
```

**What this means:**
- Regular users: Can create their own approval request, read their own
- Admin users: Can read all, update (approve/reject), and delete any approval

---

## 🛡️ Security Best Practices

1. **Limit Admin Users**
   - Only grant admin status to trusted users
   - Regularly review who has admin access

2. **Use Strong Passwords**
   - Admin accounts should have strong, unique passwords
   - Consider enabling 2-factor authentication

3. **Audit Admin Actions**
   - Monitor Firestore logs for admin activities
   - Consider adding audit logging for admin actions

4. **Remove Admin When Needed**
   - If an admin user leaves, remove their admin status immediately
   - Run: `node scripts/set-admin.js remove user@email.com`

5. **Protect Service Account Key**
   - Never commit `serviceAccountKey.json` to git
   - Store it securely
   - Rotate keys periodically

---

## 🧪 Testing Admin Functionality

### Test 1: Admin Can Access All Data

1. Login as admin
2. Try to access different user's data (if you have UI for this)
3. Should work without permission errors

### Test 2: Regular User Cannot Access Others' Data

1. Login as regular user
2. Try to access another user's data
3. Should get permission denied error

### Test 3: Admin Can Delete Any User's Data

1. Login as admin
2. Delete a record from another user's collection
3. Should succeed

### Test 4: Regular User Cannot Delete Others' Data

1. Login as regular user
2. Try to delete another user's record
3. Should get permission denied error

---

## 📊 Admin vs Regular User Permissions

| Action | Regular User | Admin User |
|--------|-------------|------------|
| Read own data | ✅ Yes | ✅ Yes |
| Write own data | ✅ Yes | ✅ Yes |
| Delete own data | ✅ Yes | ✅ Yes |
| Read other users' data | ❌ No | ✅ Yes |
| Write other users' data | ❌ No | ✅ Yes |
| Delete other users' data | ❌ No | ✅ Yes |
| Approve registrations | ❌ No | ✅ Yes |
| Delete approvals | ❌ No | ✅ Yes |

---

## 🆘 Troubleshooting

### "Permission denied" for admin user

**Possible causes:**
- Admin claim not set correctly
- User hasn't re-logged in after admin claim was set
- Firestore rules not published

**Solution:**
1. Verify admin claim: `node scripts/set-admin.js check user@email.com`
2. Have user sign out and sign back in
3. Verify rules are published in Firebase Console

### Service account key not found

**Solution:**
- Make sure `serviceAccountKey.json` is in `scripts/` folder
- Verify the file name matches exactly (case-sensitive)

### "auth/user-not-found" error

**Solution:**
- User must exist in Firebase Authentication first
- User must have registered/logged in at least once
- Check email spelling

### Admin claim not working after re-login

**Solution:**
- Clear browser cache and cookies
- Wait a few minutes (token refresh might be cached)
- Try signing out, clearing browser data, then signing back in

---

## 📚 Additional Resources

- [Firebase Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

---

## ✅ Checklist

Before using admin functionality:

- [ ] Firestore rules updated with admin support
- [ ] Rules published to Firebase Console
- [ ] Firebase Admin SDK installed (`npm install firebase-admin`)
- [ ] Service account key obtained and placed in `scripts/`
- [ ] Admin user created/set using script
- [ ] Admin user signed out and signed back in
- [ ] Verified admin can access all data
- [ ] Verified regular users cannot access others' data

---

**Your admin setup is complete! Admins can now manage all users' data securely. 🔐**

