# Quick Guide: Set Up Admin User in Firebase

Follow these steps to make a user admin in Firebase.

---

## 📋 Prerequisites

- User must already exist in Firebase Authentication (must have registered/logged in at least once)
- You have access to Firebase Console

---

## 🚀 Step-by-Step Instructions

### Step 1: Get Service Account Key

1. **Open Firebase Console**: [https://console.firebase.google.com](https://console.firebase.google.com)
2. **Select your project**: "Chit Application Cursor"
3. **Click the gear icon** ⚙️ (top left) → **Project settings**
4. **Go to "Service Accounts" tab**
5. **Click "Generate New Private Key"** button
6. **Click "Generate Key"** in the confirmation dialog
7. A JSON file will download - this is your service account key
8. **Rename it to** `serviceAccountKey.json`
9. **Move it to** your project's `scripts/` folder:
   ```
   E:\Software\Cursor\ChitBook Pro\scripts\serviceAccountKey.json
   ```

⚠️ **Security**: This file is already in `.gitignore` - never commit it to git!

---

### Step 2: Install Firebase Admin SDK

Open PowerShell/Terminal in your project directory and run:

```bash
npm install firebase-admin
```

---

### Step 3: Make a User Admin

You have two options:

#### **Option A: Using Command Line (Recommended)**

```bash
# Replace with your admin user's email
node scripts/set-admin.js set your-email@example.com
```

**Example:**
```bash
node scripts/set-admin.js set admin@yourcompany.com
```

#### **Option B: Edit Script Directly**

1. Open `scripts/set-admin.js`
2. Find this line (around line 25):
   ```javascript
   const ADMIN_USER_EMAIL = 'admin@example.com';
   ```
3. Change it to your admin email:
   ```javascript
   const ADMIN_USER_EMAIL = 'your-admin@email.com';
   ```
4. Run the script:
   ```bash
   node scripts/set-admin.js
   ```

---

### Step 4: Verify Admin Status (Optional)

Check if the user is now admin:

```bash
node scripts/set-admin.js check your-email@example.com
```

You should see:
```
User: your-email@example.com
UID: abc123...
Admin Status: ✅ Admin
```

---

### Step 5: Publish Firestore Rules

Your Firestore rules need to be published for admin access to work:

1. **Open Firebase Console** → **Firestore Database** → **Rules** tab
2. **Copy the rules** from `firestore.rules` file
3. **Paste them** in the Firebase Console rules editor
4. **Click "Publish"**

The rules should include the `isAdmin()` function.

---

### Step 6: User Must Re-Login

⚠️ **IMPORTANT**: The admin user **must**:
1. **Sign out** from your app
2. **Sign back in**

This is because Firebase caches authentication tokens. The admin claim will only be available after re-authentication.

---

## ✅ Verification

After completing the steps:

1. ✅ User has admin claim set
2. ✅ Firestore rules are published
3. ✅ User has signed out and signed back in
4. ✅ Admin can now access all users' data

---

## 🧪 Test Admin Access

To verify admin is working:

1. **Login as admin user**
2. **Try accessing another user's data** (if you have UI for this)
3. **Check browser console** - should NOT show permission errors
4. **Verify in Firestore Console** - admin can see all collections

---

## 🆘 Troubleshooting

### Error: "Service account file not found"

**Solution**: 
- Make sure `serviceAccountKey.json` is in `scripts/` folder
- Check file name matches exactly (case-sensitive)

### Error: "auth/user-not-found"

**Solution**: 
- User must exist in Firebase Authentication first
- User must have registered/logged in at least once
- Check email spelling

### Error: "Permission denied" after setting admin

**Solution**:
1. User must sign out and sign back in
2. Clear browser cache
3. Verify Firestore rules are published
4. Check admin claim: `node scripts/set-admin.js check email@example.com`

### Admin claim not working

**Solution**:
1. Verify claim is set: `node scripts/set-admin.js check email@example.com`
2. Have user sign out completely
3. Clear browser cache/cookies
4. Sign back in
5. Wait a few minutes (token refresh might be cached)

---

## 📚 Additional Commands

```bash
# Make user admin
node scripts/set-admin.js set user@email.com

# Check admin status
node scripts/set-admin.js check user@email.com

# Remove admin status
node scripts/set-admin.js remove user@email.com
```

---

## 🔐 Security Notes

1. **Limit admin users** - Only grant to trusted users
2. **Strong passwords** - Admin accounts need strong passwords
3. **Remove when needed** - If admin leaves, remove status immediately
4. **Protect service key** - Never share or commit service account key
5. **Monitor activity** - Check Firestore logs for admin actions

---

## 📖 Full Documentation

For more details, see:
- `ADMIN_SETUP.md` - Complete admin setup guide
- `PRODUCTION_SECURITY_RULES.md` - Security rules explanation

---

**That's it! Your admin user is now set up and can manage all users' data. 🔐**

