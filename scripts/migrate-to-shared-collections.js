/**
 * Migration Script: Move data from user-specific paths to shared collections
 * 
 * This script migrates data from:
 *   users/{userId}/clients → clients
 *   users/{userId}/groups → groups
 *   users/{userId}/groupMembers → groupMembers
 *   users/{userId}/auctions → auctions
 *   users/{userId}/payments → payments
 *   users/{userId}/paymentLogs → paymentLogs
 * 
 * SETUP:
 * 1. Install dependencies: npm install firebase-admin
 * 2. Ensure serviceAccountKey.json exists in scripts/ directory
 * 
 * USAGE:
 * node scripts/migrate-to-shared-collections.js
 * 
 * NOTE: This script will merge data from all users into shared collections.
 * If duplicate document IDs exist, it will append a suffix to avoid conflicts.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');

// Collections to migrate
const COLLECTIONS_TO_MIGRATE = [
  'clients',
  'groups',
  'groupMembers',
  'auctions',
  'payments',
  'paymentLogs'
];

// Initialize Firebase Admin SDK
let db;

function initializeApp() {
  try {
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      throw new Error(`Service account file not found: ${SERVICE_ACCOUNT_PATH}`);
    }
    
    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    db = admin.firestore();
    console.log('✓ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('✗ Error initializing Firebase Admin:', error.message);
    process.exit(1);
  }
}

/**
 * Get all user IDs that have data in Firestore
 * We check the first collection (clients) to find all users with data
 */
async function getAllUserIds() {
  try {
    console.log('\n📋 Finding all users with data...');
    const userIds = new Set();
    
    // Try to get user IDs by checking the users collection group
    // Since we can't directly list subcollections, we'll try to query a known collection
    try {
      // Check if there's a users collection with documents
      const usersRef = db.collection('users');
      const usersSnapshot = await usersRef.get();
      
      usersSnapshot.forEach(doc => {
        userIds.add(doc.id);
      });
    } catch (error) {
      console.log('  Note: Could not query users collection directly');
    }
    
    // Also try to find users by checking subcollections
    // We'll check the first collection (clients) to find user IDs
    try {
      const clientsCollectionGroup = db.collectionGroup('clients');
      const clientsSnapshot = await clientsCollectionGroup.get();
      
      clientsSnapshot.forEach(doc => {
        // Extract userId from path: users/{userId}/clients/{docId}
        const pathParts = doc.ref.path.split('/');
        if (pathParts.length >= 3 && pathParts[0] === 'users') {
          userIds.add(pathParts[1]);
        }
      });
    } catch (error) {
      console.log('  Note: Could not query collection group');
    }
    
    const userIdArray = Array.from(userIds);
    console.log(`✓ Found ${userIdArray.length} user(s) with data`);
    
    if (userIdArray.length === 0) {
      console.log('\n⚠️  No users found. This could mean:');
      console.log('   1. Data is already in shared collections');
      console.log('   2. No data exists in user-specific paths');
      console.log('   3. Data structure is different than expected');
    }
    
    return userIdArray;
  } catch (error) {
    console.error('✗ Error getting user IDs:', error.message);
    throw error;
  }
}

/**
 * Check if a document exists in the shared collection
 */
async function documentExists(collectionName, docId) {
  try {
    const docRef = db.collection(collectionName).doc(docId);
    const docSnap = await docRef.get();
    return docSnap.exists;
  } catch (error) {
    console.error(`Error checking document existence: ${error.message}`);
    return false;
  }
}

/**
 * Generate a unique document ID by appending a suffix
 */
function generateUniqueId(originalId, userId, attempt = 0) {
  if (attempt === 0) {
    return `${originalId}_${userId.substring(0, 8)}`;
  }
  return `${originalId}_${userId.substring(0, 8)}_${attempt}`;
}

/**
 * Migrate a single collection for a user
 */
async function migrateCollection(userId, collectionName) {
  try {
    const sourcePath = `users/${userId}/${collectionName}`;
    const sourceRef = db.collection(sourcePath);
    const sourceSnapshot = await sourceRef.get();
    
    if (sourceSnapshot.empty) {
      return { migrated: 0, skipped: 0, errors: 0 };
    }
    
    console.log(`  📦 Migrating ${sourceSnapshot.size} documents from ${sourcePath}...`);
    
    const destRef = db.collection(collectionName);
    const batch = db.batch();
    let batchCount = 0;
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    const BATCH_LIMIT = 500;
    
    for (const sourceDoc of sourceSnapshot.docs) {
      try {
        let destDocId = sourceDoc.id;
        
        // Check if document already exists in shared collection
        const exists = await documentExists(collectionName, destDocId);
        
        if (exists) {
          // Try to generate unique ID
          let attempt = 0;
          let uniqueId = generateUniqueId(destDocId, userId, attempt);
          while (await documentExists(collectionName, uniqueId)) {
            attempt++;
            uniqueId = generateUniqueId(destDocId, userId, attempt);
          }
          destDocId = uniqueId;
          console.log(`    ⚠️  Document ID conflict: ${sourceDoc.id} → ${destDocId}`);
        }
        
        const destDocRef = destRef.doc(destDocId);
        batch.set(destDocRef, sourceDoc.data());
        batchCount++;
        migrated++;
        
        // Commit batch if we reach the limit
        if (batchCount >= BATCH_LIMIT) {
          await batch.commit();
          console.log(`    ✓ Committed batch of ${batchCount} documents`);
          batchCount = 0;
        }
      } catch (error) {
        console.error(`    ✗ Error migrating document ${sourceDoc.id}:`, error.message);
        errors++;
      }
    }
    
    // Commit remaining documents
    if (batchCount > 0) {
      await batch.commit();
      console.log(`    ✓ Committed final batch of ${batchCount} documents`);
    }
    
    return { migrated, skipped, errors };
  } catch (error) {
    console.error(`  ✗ Error migrating collection ${collectionName} for user ${userId}:`, error.message);
    return { migrated: 0, skipped: 0, errors: 1 };
  }
}

/**
 * Migrate all data for a user
 */
async function migrateUserData(userId) {
  console.log(`\n👤 Migrating data for user: ${userId}`);
  console.log('─'.repeat(50));
  
  const results = {
    totalMigrated: 0,
    totalSkipped: 0,
    totalErrors: 0
  };
  
  for (const collectionName of COLLECTIONS_TO_MIGRATE) {
    const result = await migrateCollection(userId, collectionName);
    results.totalMigrated += result.migrated;
    results.totalSkipped += result.skipped;
    results.totalErrors += result.errors;
  }
  
  console.log(`\n✓ User ${userId} migration complete:`);
  console.log(`  - Migrated: ${results.totalMigrated} documents`);
  console.log(`  - Skipped: ${results.totalSkipped} documents`);
  console.log(`  - Errors: ${results.totalErrors} documents`);
  
  return results;
}

/**
 * Main migration function
 */
async function runMigration() {
  try {
    console.log('🚀 Starting migration to shared collections...\n');
    
    // Get all user IDs
    const userIds = await getAllUserIds();
    
    if (userIds.length === 0) {
      console.log('⚠️  No users found with data to migrate');
      return;
    }
    
    // Migrate data for each user
    const allResults = {
      totalMigrated: 0,
      totalSkipped: 0,
      totalErrors: 0
    };
    
    for (const userId of userIds) {
      const results = await migrateUserData(userId);
      allResults.totalMigrated += results.totalMigrated;
      allResults.totalSkipped += results.totalSkipped;
      allResults.totalErrors += results.totalErrors;
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Documents Migrated: ${allResults.totalMigrated}`);
    console.log(`Total Documents Skipped: ${allResults.totalSkipped}`);
    console.log(`Total Errors: ${allResults.totalErrors}`);
    console.log('\n✓ Migration completed successfully!');
    console.log('\n⚠️  IMPORTANT: After verifying the migration, you can delete the old user-specific data paths if desired.');
    console.log('   Old paths: users/{userId}/{collection}');
    console.log('   New paths: {collection}');
    
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  initializeApp();
  runMigration()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration, migrateUserData, migrateCollection };

