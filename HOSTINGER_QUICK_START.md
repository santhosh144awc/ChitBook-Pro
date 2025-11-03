# 🚀 Quick Start: Deploy to Hostinger

Follow these simple steps to deploy your ChitBook Pro app to Hostinger.

---

## 📋 What You Need

- [ ] Hostinger account with hosting plan
- [ ] FTP access or File Manager access to Hostinger
- [ ] Firebase configuration values (get from Firebase Console)

---

## 🔥 Step 1: Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **"Chit Application Cursor"**
3. Click ⚙️ **gear icon** → **Project settings**
4. Scroll to **"Your apps"** section
5. Copy these 6 values:

   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

---

## 📝 Step 2: Create Environment File

Create `.env.production` file in your project root:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

**Replace** `your-*-here` with your actual Firebase values.

⚠️ **Important**: This file contains sensitive data. Make sure `.env.production` is in `.gitignore` (it should be).

---

## 🔧 Step 3: Configure Next.js for Static Export

Update `next.config.mjs` to enable static export:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Enable static export for Hostinger
  images: {
    unoptimized: true,
  },
  trailingSlash: true, // Better compatibility with Hostinger
};

export default nextConfig;
```

**Note**: Static export means your app will be pre-built as static files. Dynamic routes might need special handling.

---

## 🏗️ Step 4: Build Your Application

Run the build command:

```bash
npm run build
```

This will:
- Create optimized production build
- Output files to `out/` folder
- Include all necessary files for hosting

Wait for build to complete. You should see:
```
✓ Static files generated
✓ Build completed
```

---

## 📤 Step 5: Upload to Hostinger

### Option A: Using File Manager (Easiest)

1. **Log in to Hostinger**:
   - Go to [hPanel](https://hpanel.hostinger.com)
   - Log in with your credentials

2. **Open File Manager**:
   - Click **"Files"** or **"File Manager"**
   - Navigate to `public_html` folder (this is your website root)

3. **Clear existing files** (if any):
   - Select all files in `public_html`
   - Delete them (backup first if needed)

4. **Upload files**:
   - Click **"Upload"** button
   - Select **ALL files and folders** from the `out/` folder
   - Wait for upload to complete

5. **Upload .htaccess**:
   - The `.htaccess` file is in your project root
   - Upload it to `public_html` root as well

### Option B: Using FTP

1. **Get FTP credentials** from Hostinger:
   - Go to **"FTP Accounts"** in hPanel
   - Note: Host, Username, Password, Port

2. **Connect with FTP client** (FileZilla, WinSCP):
   - Connect to Hostinger FTP
   - Navigate to `public_html` folder
   - Upload all contents of `out/` folder
   - Upload `.htaccess` file to root

---

## ✅ Step 6: Verify Deployment

1. **Visit your website**:
   - Go to your domain or Hostinger-provided URL
   - The site should load

2. **Test functionality**:
   - ✅ Try logging in
   - ✅ Check if dashboard loads
   - ✅ Verify data can be accessed
   - ✅ Test creating/editing records

3. **Check for errors**:
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Verify Firebase connection works

---

## 🔍 Common Issues & Solutions

### Issue: Site shows blank page

**Solution**:
- Check if `index.html` exists in `public_html` root
- Verify `.htaccess` file is uploaded
- Check file permissions (should be 644)

### Issue: Firebase errors

**Solution**:
- Verify `.env.production` has correct values
- Check if environment variables are set correctly
- Rebuild with correct Firebase config

### Issue: Routes return 404

**Solution**:
- Make sure `.htaccess` is uploaded to root
- Verify rewrite rules are working
- Check Hostinger error logs

### Issue: Can't upload files

**Solution**:
- Use FTP for large uploads
- Check file size limits
- Upload in batches

---

## 📋 Deployment Checklist

Before going live:

- [ ] Firebase config values ready
- [ ] `.env.production` file created
- [ ] `next.config.mjs` updated for static export
- [ ] Build completed successfully (`npm run build`)
- [ ] Files uploaded to `public_html` on Hostinger
- [ ] `.htaccess` file uploaded
- [ ] Tested website loads correctly
- [ ] Tested login functionality
- [ ] Verified Firebase connection works

---

## 🌐 Setting Up Custom Domain (Optional)

1. **Add domain in Hostinger**:
   - Go to **"Domains"** in hPanel
   - Add your custom domain

2. **Configure DNS**:
   - Point A record to Hostinger IP
   - Or use Hostinger nameservers

3. **Wait for propagation** (usually 24-48 hours)

---

## 🆘 Need Help?

- **Full guide**: See `HOSTINGER_DEPLOYMENT.md`
- **Hostinger Support**: [support.hostinger.com](https://support.hostinger.com)
- **Build errors**: Check `npm run build` output

---

**Your app should now be live on Hostinger! 🎉**

