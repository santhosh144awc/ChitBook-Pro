/**
 * Firebase Database Migration Script
 * 
 * Migrates Firestore data from development to production Firebase project.
 * 
 * SETUP:
 * 1. Install dependencies: npm install firebase-admin
 * 2. Get service account keys from both dev and prod Firebase projects
 * 3. Save them as: serviceAccountKey-dev.json and serviceAccountKey-prod.json
 * 4. Place both files in the scripts/ directory
 * 5. Update the userIds array below with your actual user IDs
 * 
 * USAGE:
 * node scripts/migrate-to-prod.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration
const DEV_SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey-dev.json');
const PROD_SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey-prod.json');

// User IDs to migrate (get these from Firebase Auth → Users in dev project)
// You can also set this to 'all' to migrate all users found in Firestore
const USER_IDS_TO_MIGRATE = ['user-id-1', 'user-id-2']; // Replace with actual user IDs or use 'all'

// Collections to migrate for each user
const COLLECTIONS_TO_MIGRATE = [
  'clients',
  'groups',
  'groupMembers',
  'auctions',
  'payments',
  'paymentLogs'
];

// Initialize Firebase Admin SDKs
let sourceApp, destApp, sourceDb, destDb;

function initializeApps() {
  try {
    // Check if service account files exist
    if (!fs.existsSync(DEV_SERVICE_ACCOUNT_PATH)) {
      throw new Error(`Development service account file not found: ${DEV_SERVICE_ACCOUNT_PATH}`);
    }
    
    if (!fs.existsSync(PROD_SERVICE_ACCOUNT_PATH)) {
      throw new Error(`Production service account file not found: ${PROD_SERVICE_ACCOUNT_PATH}`);
    }

    const serviceAccountDev = require(DEV_SERVICE_ACCOUNT_PATH);
    const serviceAccountProd = require(PROD_SERVICE_ACCOUNT_PATH);

    // Initialize source (development) Firebase Admin
    sourceApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountDev),
      databaseURL: `https://${serviceAccountDev.project_id}.firebaseio.com`
    }, 'source');

    // Initialize destination (production) Firebase Admin
    destApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountProd),
      databaseURL: `https://${serviceAccountProd.project_id}.firebaseio.com`
    }, 'dest');

    sourceDb = sourceApp.firestore();
    destDb = destApp.firestore();

    console.log('✓ Firebase Admin SDKs initialized');
    console.log(`  Source (Dev): ${serviceAccountDev.project_id}`);
    console.log(`  Destination (Prod): ${serviceAccountProd.project_id}\n`);
    
    return true;
  } catch (error) {
    console.error('✗ Failed to initialize Firebase Admin SDKs:', error.message);
    return false;
  }
}

async function migrateCollection(sourcePath, destPath, batchSize = 500) {
  try {
    console.log(`  Migrating: ${sourcePath} → ${destPath}`);
    
    const snapshot = await sourceDb.collection(sourcePath).get();
    
    if (snapshot.empty) {
      console.log(`    → No data found (skipped)`);
      return 0;
    }

    // Firestore batch limit is 500 operations
    const batches = [];
    let currentBatch = destDb.batch();
    let count = 0;
    let totalMigrated = 0;

    for (const doc of snapshot.docs) {
      const destRef = destDb.collection(destPath).doc(doc.id);
      currentBatch.set(destRef, doc.data());
      count++;
      totalMigrated++;

      if (count >= batchSize) {
        batches.push(currentBatch);
        currentBatch = destDb.batch();
        count = 0;
      }
    }

    // Add remaining documents to batch
    if (count > 0) {
      batches.push(currentBatch);
    }

    // Commit all batches
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      if (batches.length > 1) {
        console.log(`    → Batch ${i + 1}/${batches.length} committed`);
      }
    }

    console.log(`    ✓ Migrated ${totalMigrated} documents`);
    return totalMigrated;
  } catch (error) {
    console.error(`    ✗ Error migrating ${sourcePath}:`, error.message);
    throw error;
  }
}

async function getAllUserIds() {
  try {
    console.log('  Finding all users in Firestore...');
    const usersSnapshot = await sourceDb.collection('users').get();
    const userIds = usersSnapshot.docs.map(doc => doc.id);
    console.log(`  Found ${userIds.length} users: ${userIds.join(', ')}\n`);
    return userIds;
  } catch (error) {
    console.error('  ✗ Error finding users:', error.message);
    // If users collection doesn't exist or is empty, return empty array
    return [];
  }
}

async function migrateUserData(userId) {
  console.log(`\n📦 Migrating data for user: ${userId}`);
  console.log('─'.repeat(50));
  
  let totalDocuments = 0;

  for (const collection of COLLECTIONS_TO_MIGRATE) {
    const sourcePath = `users/${userId}/${collection}`;
    const destPath = `users/${userId}/${collection}`;
    
    try {
      const count = await migrateCollection(sourcePath, destPath);
      totalDocuments += count;
    } catch (error) {
      console.error(`  ✗ Failed to migrate ${collection}:`, error.message);
      // Continue with other collections
    }
  }

  // Also migrate userApprovals if they exist (these are at root level)
  try {
    const userApprovalsSnapshot = await sourceDb.collection('userApprovals')
      .where('userId', '==', userId)
      .get();
    
    if (!userApprovalsSnapshot.empty) {
      console.log(`  Migrating userApprovals for user ${userId}...`);
      const count = await migrateCollection(`userApprovals`, `userApprovals`);
      totalDocuments += count;
    }
  } catch (error) {
    // userApprovals might not exist or have different structure
    console.log(`  → Skipping userApprovals (may not exist)`);
  }

  console.log(`\n✓ Completed migration for user ${userId}`);
  console.log(`  Total documents migrated: ${totalDocuments}`);
  console.log('─'.repeat(50));
  
  return totalDocuments;
}

async function verifyUserExistsInProd(userId) {
  try {
    // Check if user has any data in production (simple check)
    const testSnapshot = await destDb.collection(`users/${userId}/clients`).limit(1).get();
    return !testSnapshot.empty;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Firebase Database Migration');
  console.log('='.repeat(50));
  
  // Initialize Firebase Admin SDKs
  if (!initializeApps()) {
    process.exit(1);
  }

  try {
    let userIds = USER_IDS_TO_MIGRATE;

    // If 'all' is specified, get all user IDs from Firestore
    if (USER_IDS_TO_MIGRATE.includes('all') || USER_IDS_TO_MIGRATE.length === 0) {
      console.log('\n📋 Finding all users to migrate...');
      const allUserIds = await getAllUserIds();
      
      if (allUserIds.length === 0) {
        console.log('\n⚠️  No users found in Firestore. Please check your source database.');
        console.log('   You may need to manually specify user IDs in the script.\n');
        process.exit(1);
      }
      
      userIds = allUserIds;
    }

    if (userIds.length === 0) {
      console.log('\n⚠️  No user IDs specified for migration.');
      console.log('   Please update USER_IDS_TO_MIGRATE in the script.\n');
      process.exit(1);
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   Users to migrate: ${userIds.length}`);
    console.log(`   Collections per user: ${COLLECTIONS_TO_MIGRATE.length}`);
    console.log(`   Collections: ${COLLECTIONS_TO_MIGRATE.join(', ')}\n`);

    // Confirm before proceeding
    console.log('⚠️  WARNING: This will copy data to production Firebase!');
    console.log('   Make sure you have:');
    console.log('   1. Backed up your production database');
    console.log('   2. Verified users exist in production Firebase Auth');
    console.log('   3. Set up Firestore security rules in production');
    console.log('   4. Created required Firestore indexes\n');
    
    // In a real scenario, you might want to add a confirmation prompt here
    // For now, we'll proceed automatically

    let grandTotal = 0;
    
    // Migrate each user
    for (const userId of userIds) {
      // Check if user exists in prod (optional check)
      const exists = await verifyUserExistsInProd(userId);
      if (exists) {
        console.log(`⚠️  Warning: User ${userId} appears to have existing data in production`);
        console.log(`   Migration will overwrite existing documents with same IDs\n`);
      }

      const count = await migrateUserData(userId);
      grandTotal += count;
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Migration completed successfully!');
    console.log(`   Total users migrated: ${userIds.length}`);
    console.log(`   Total documents migrated: ${grandTotal}`);
    console.log('='.repeat(50));

    // Cleanup
    await sourceApp.delete();
    await destApp.delete();
    
    console.log('\n✓ Cleanup completed');
    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('✗ Migration failed:', error);
    console.error('='.repeat(50));
    
    // Cleanup on error
    try {
      await sourceApp?.delete();
      await destApp?.delete();
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
    
    process.exit(1);
  }
}

// Run migration
main();

