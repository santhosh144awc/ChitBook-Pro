# Migration Guide: User-Specific to Shared Collections

This guide explains how to migrate your Firestore data from user-specific paths to shared collections so all users can access the same data.

## What Changed

**Before:** Data was stored per user
- `users/{userId}/clients`
- `users/{userId}/groups`
- `users/{userId}/auctions`
- etc.

**After:** Data is stored in shared collections
- `clients`
- `groups`
- `auctions`
- etc.

All authenticated users can now see and modify the same data.

## Prerequisites

1. Node.js installed
2. Firebase Admin SDK installed: `npm install firebase-admin`
3. Service account key file at `scripts/serviceAccountKey.json`

## Migration Steps

### 1. Backup Your Data (Recommended)

Before running the migration, it's recommended to backup your Firestore database:
- Use Firebase Console → Firestore → Export
- Or use `gcloud firestore export` command

### 2. Update Firestore Security Rules

The security rules have been updated to allow all authenticated users to access shared collections. Deploy the updated rules:

```bash
firebase deploy --only firestore:rules
```

Or manually update in Firebase Console → Firestore → Rules

### 3. Run the Migration Script

```bash
node scripts/migrate-to-shared-collections.js
```

The script will:
- Find all users with data
- Migrate each collection from `users/{userId}/{collection}` to `{collection}`
- Handle duplicate document IDs by appending a suffix
- Provide progress updates and a summary

### 4. Verify the Migration

1. Check Firebase Console → Firestore
2. Verify data exists in root-level collections (clients, groups, etc.)
3. Test the application - both users should see the same data

### 5. Clean Up (Optional)

After verifying everything works, you can delete the old user-specific paths:
- `users/{userId}/clients`
- `users/{userId}/groups`
- etc.

**Warning:** Only delete after confirming the migration was successful!

## Troubleshooting

### Error: Service account file not found
- Ensure `scripts/serviceAccountKey.json` exists
- Download it from Firebase Console → Project Settings → Service Accounts

### Duplicate Document IDs
- The script automatically handles duplicates by appending a suffix
- Check the console output for any conflicts

### Permission Errors
- Ensure the service account has Firestore Admin permissions
- Check Firebase Console → IAM & Admin

## Rollback

If you need to rollback:
1. Restore from backup
2. Revert the code changes in `lib/firestore.ts` (change `getSharedCollection` back to `getUserCollection`)
3. Revert security rules

## Support

If you encounter issues:
1. Check the console output for specific error messages
2. Verify service account permissions
3. Ensure Firestore rules are deployed correctly

