# 🚀 Quick Start: Move to Production Firebase

## TL;DR - Choose Your Path

### ⚡ **Option A: Same Project (Fastest - 5 minutes)**
If you want to keep using the same Firebase project:

1. Get your Firebase config from [Firebase Console](https://console.firebase.google.com)
2. Add config as environment variables in your hosting platform
3. Deploy your app
4. ✅ Done!

**See**: `DEPLOYMENT.md` for details

---

### 🔄 **Option B: Separate Production Project (Recommended - 30-60 minutes)**
If you want a separate production environment:

1. **Create new Firebase project** → [Firebase Console](https://console.firebase.google.com)
2. **Set up services** (Auth, Firestore, Rules, Indexes)
3. **Migrate users** (Firebase Auth export/import)
4. **Migrate data** (Use `scripts/migrate-to-prod.js`)
5. **Update environment variables**
6. **Deploy your app**

**See**: `MIGRATE_TO_PROD.md` for step-by-step instructions

---

## 📚 Full Documentation

- **Detailed Migration Guide**: `MIGRATE_TO_PROD.md`
- **General Deployment Guide**: `DEPLOYMENT.md`
- **Migration Script Help**: `scripts/migrate-data.md`

---

## ⚠️ Before You Start

- [ ] Backup your current database
- [ ] Test in a staging environment if possible
- [ ] Have your Firebase project ready
- [ ] Know where you'll deploy (Vercel, Netlify, Firebase Hosting, etc.)

---

## 🆘 Quick Help

**Need help with migration?** Check `MIGRATE_TO_PROD.md`

**Just deploying?** Check `DEPLOYMENT.md`

**Migration script not working?** Check `scripts/migrate-data.md`

