# Data Migration Script Instructions

## Setup

1. **Install Firebase Admin SDK**:
   ```bash
   npm install firebase-admin
   ```

2. **Get Service Account Keys**:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key" for both dev and prod projects
   - Save as `serviceAccountKey-dev.json` and `serviceAccountKey-prod.json`
   - **⚠️ Never commit these files to git!**

3. **Create migration script** (see example below)

## Example Migration Script

Create `scripts/migrate-to-prod.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccountDev = require('./serviceAccountKey-dev.json');
const serviceAccountProd = require('./serviceAccountKey-prod.json');

// Initialize source (dev)
const sourceApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccountDev),
  databaseURL: `https://${serviceAccountDev.project_id}.firebaseio.com`
}, 'source');

// Initialize destination (prod)
const destApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccountProd),
  databaseURL: `https://${serviceAccountProd.project_id}.firebaseio.com`
}, 'dest');

const sourceDb = sourceApp.firestore();
const destDb = destApp.firestore();

async function migrateCollection(sourcePath, destPath) {
  console.log(`Migrating ${sourcePath} to ${destPath}...`);
  const snapshot = await sourceDb.collection(sourcePath).get();
  
  if (snapshot.empty) {
    console.log(`  No data found in ${sourcePath}`);
    return;
  }

  // Firestore batch limit is 500
  const batchSize = 500;
  const batches = [];
  let currentBatch = destDb.batch();
  let count = 0;

  snapshot.docs.forEach((doc) => {
    const destRef = destDb.collection(destPath).doc(doc.id);
    currentBatch.set(destRef, doc.data());
    count++;

    if (count === batchSize) {
      batches.push(currentBatch);
      currentBatch = destDb.batch();
      count = 0;
    }
  });

  if (count > 0) {
    batches.push(currentBatch);
  }

  // Commit all batches
  for (const batch of batches) {
    await batch.commit();
  }

  console.log(`  ✓ Migrated ${snapshot.size} documents`);
}

async function migrateUserData(userId) {
  console.log(`\nMigrating data for user: ${userId}\n`);
  
  const collections = [
    'clients',
    'groups', 
    'groupMembers',
    'auctions',
    'payments',
    'paymentLogs'
  ];

  for (const collection of collections) {
    const sourcePath = `users/${userId}/${collection}`;
    const destPath = `users/${userId}/${collection}`;
    await migrateCollection(sourcePath, destPath);
  }
}

// Run migration
async function main() {
  try {
    // Replace with actual user IDs from your development database
    const userIds = ['user-id-1', 'user-id-2']; // Get these from Auth users list
    
    for (const userId of userIds) {
      await migrateUserData(userId);
    }

    console.log('\n✓ Migration completed successfully!');
    
    // Cleanup
    await sourceApp.delete();
    await destApp.delete();
    
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

main();
```

## Run Migration

```bash
node scripts/migrate-to-prod.js
```

## Important Notes

1. **Backup First**: Always backup your production database before migrating
2. **Test First**: Test with one user first before migrating all users
3. **Authentication**: Users must exist in production Firebase Auth before migrating their data
4. **Indexes**: Ensure production Firestore has all required indexes created
5. **Security**: Keep service account keys secure and never commit to version control

