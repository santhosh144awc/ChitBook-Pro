# Deploy to Hostinger - Step by Step Guide

This guide will walk you through deploying your ChitBook Pro application to Hostinger.

---

## 📋 Prerequisites

Before starting, make sure you have:
- [ ] Hostinger account and hosting plan
- [ ] FTP credentials or File Manager access
- [ ] Firebase configuration values ready
- [ ] Your domain name configured (if using custom domain)

---

## 🎯 Two Deployment Options for Hostinger

Hostinger supports two approaches:

### Option A: Static Export (Simpler, Recommended)
- Upload pre-built static files
- Works with most Hostinger plans
- No Node.js runtime needed
- **Note**: Requires static export configuration

### Option B: Node.js Hosting (If Available)
- Full Next.js SSR support
- Requires Node.js hosting plan on Hostinger
- More complex setup

**We'll use Option A (Static Export) as it's simpler and works on all Hostinger plans.**

---

## 🚀 Step 1: Configure Next.js for Static Export

First, we need to configure your Next.js app for static export. Since you have dynamic routes (`/groups/[id]`), we need to handle this carefully.

### Option 1A: Use Static Export with Dynamic Routes

Update `next.config.mjs`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Enable static export
  images: {
    unoptimized: true,
  },
  trailingSlash: true, // Add trailing slashes for better compatibility
};

export default nextConfig;
```

**Note**: With static export, dynamic routes won't work without `generateStaticParams`. Since your app uses Firebase and dynamic routes, this might not work perfectly.

### Option 1B: Keep Current Setup (Recommended for Hostinger with Node.js)

If Hostinger supports Node.js, keep your current `next.config.mjs` and deploy as a Node.js app.

---

## 🔧 Step 2: Get Your Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **"Chit Application Cursor"**
3. Click ⚙️ **gear icon** → **Project settings**
4. Scroll to **"Your apps"** section
5. Copy these values (you'll need them):

   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

---

## 📦 Step 3: Build Your Application

### For Static Export (Option A):

1. **Update next.config.mjs** (as shown above)

2. **Create environment file for build**:

   Create `.env.production` file (DO NOT commit to git):
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

3. **Build the application**:
   ```bash
   npm run build
   ```

4. **The output will be in `out/` folder** - this is what you'll upload to Hostinger

### For Node.js Hosting (Option B):

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **The output will be in `.next/` folder** - but you'll need to upload the entire project

---

## 📁 Step 4: Upload Files to Hostinger

### Method 1: Using File Manager (Easier)

1. **Log in to Hostinger**:
   - Go to [Hostinger hPanel](https://hpanel.hostinger.com)
   - Log in with your credentials

2. **Open File Manager**:
   - Click on **"Files"** or **"File Manager"**
   - Navigate to `public_html` (this is your website root)

3. **Clear existing files** (if any):
   - Select all files in `public_html`
   - Delete them (backup first if needed)

4. **Upload your files**:
   - Click **"Upload"** button
   - Select all files from `out/` folder (for static export)
   - Or upload entire project folder (for Node.js)
   - Wait for upload to complete

### Method 2: Using FTP (More Control)

1. **Get FTP credentials** from Hostinger hPanel:
   - Go to **"FTP Accounts"** or **"Hosting"** → **"FTP"**
   - Note down: Host, Username, Password, Port

2. **Use FTP client** (FileZilla, WinSCP, etc.):
   - Connect to your Hostinger FTP
   - Navigate to `public_html` folder
   - Upload contents of `out/` folder (for static export)

---

## 🔐 Step 5: Set Up Environment Variables (For Node.js Hosting)

If you're using Node.js hosting on Hostinger:

### Option A: Using .env File

1. Create `.env.production` file in your project root:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
   ```

2. Upload this file to Hostinger (but it will be visible - not secure)

### Option B: Using Hostinger Environment Variables (If Available)

1. Check if your Hostinger plan supports environment variables
2. Set them in Hostinger Control Panel
3. Refer to your plan's documentation

### Option C: Embed in HTML (For Static Export Only)

Since static export doesn't support server-side env vars, we need to embed them:

1. **Create a config file** that will be included in the build
2. **Update your build process** to include these values
3. Or use **next.config.mjs** to inject them

---

## 🚀 Step 6: Configure Hostinger for Node.js (If Using Node.js Hosting)

If your Hostinger plan supports Node.js:

1. **Enable Node.js**:
   - Go to **"Advanced"** → **"Node.js"** in hPanel
   - Enable Node.js
   - Select Node.js version (18.x or higher recommended)

2. **Set Application Root**:
   - Point to your project root directory
   - Set startup file: `server.js` or configure for Next.js

3. **Configure Next.js**:
   - Hostinger might require specific configuration
   - Check Hostinger documentation for Next.js setup

---

## 📝 Step 7: Create .htaccess for Static Export (Apache)

If using static export, create `.htaccess` file in `out/` folder:

```apache
# Enable rewrite engine
RewriteEngine On

# Redirect all requests to index.html for client-side routing
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Security headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
</IfModule>
```

Upload this `.htaccess` file to `public_html` on Hostinger.

---

## ✅ Step 8: Test Your Deployment

1. **Visit your website**:
   - Go to your domain or Hostinger-provided URL
   - Check if the site loads

2. **Test functionality**:
   - ✅ Try logging in
   - ✅ Check if Firebase connection works
   - ✅ Verify data loads
   - ✅ Test creating/editing records

3. **Check browser console**:
   - Open DevTools (F12)
   - Look for any errors
   - Check Firebase connection errors

---

## 🔧 Step 9: Fix Common Issues

### Issue: "Firebase config not found"

**Solution**: Environment variables are not set. Make sure `.env.production` is uploaded or config is embedded.

### Issue: "404 errors on routes"

**Solution**: For static export, make sure `.htaccess` is uploaded and configured correctly.

### Issue: "Permission denied"

**Solution**: Check file permissions in Hostinger File Manager (should be 644 for files, 755 for folders).

### Issue: "Site not loading"

**Solution**: 
- Check if `index.html` is in `public_html` root
- Verify file permissions
- Check Hostinger error logs

---

## 🌐 Step 10: Configure Custom Domain (Optional)

If you have a custom domain:

1. **Add domain in Hostinger**:
   - Go to **"Domains"** in hPanel
   - Add your domain
   - Follow DNS configuration

2. **Update DNS records**:
   - Point A record to Hostinger IP
   - Or use Hostinger nameservers

3. **Wait for DNS propagation** (can take up to 48 hours)

---

## 📊 Quick Checklist

Before going live:

- [ ] Built application successfully (`npm run build`)
- [ ] Firebase configuration values ready
- [ ] Environment variables set (if Node.js) or embedded (if static)
- [ ] Files uploaded to `public_html`
- [ ] `.htaccess` file uploaded (for static export)
- [ ] File permissions set correctly (644/755)
- [ ] Tested login functionality
- [ ] Verified Firebase connection works
- [ ] Checked browser console for errors

---

## 🆘 Troubleshooting

### Build Errors

If `npm run build` fails:
- Check Node.js version (should be 18+)
- Verify all dependencies installed (`npm install`)
- Check for TypeScript errors

### Upload Issues

- Use FTP for large files instead of File Manager
- Check file size limits
- Verify upload completed (compare file counts)

### Runtime Errors

- Check Hostinger error logs
- Verify Firebase config is correct
- Ensure Firestore rules are published

---

## 💡 Alternative: Use Vercel or Netlify

If Hostinger setup is complex, consider:

- **Vercel**: Free, excellent Next.js support, easy deployment
- **Netlify**: Free, good for static sites
- **Firebase Hosting**: Free, integrates with Firebase projects

These platforms are easier to set up for Next.js apps than traditional hosting.

---

## 📚 Additional Resources

- [Hostinger Knowledge Base](https://support.hostinger.com)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)

---

**Need help? Check the troubleshooting section or Hostinger support!**

