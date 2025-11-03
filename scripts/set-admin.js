/**
 * Script to Set Admin Custom Claims for Firebase Users
 * 
 * This script sets the admin custom claim on a Firebase user, which allows them
 * to access and delete all users' data according to Firestore security rules.
 * 
 * SETUP:
 * 1. Install dependencies: npm install firebase-admin
 * 2. Get service account key from Firebase Console
 * 3. Save it as: serviceAccountKey.json in scripts/ directory
 * 4. Update the ADMIN_USER_EMAIL below with the email of the user you want to make admin
 * 
 * USAGE:
 * node scripts/set-admin.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuration
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');

// Email of the user you want to make admin
const ADMIN_USER_EMAIL = 'admin@example.com'; // ⚠️ CHANGE THIS TO YOUR ADMIN EMAIL

// Initialize Firebase Admin SDK
function initializeAdmin() {
  try {
    // Check if service account file exists
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      throw new Error(`Service account file not found: ${SERVICE_ACCOUNT_PATH}`);
    }

    const serviceAccount = require(SERVICE_ACCOUNT_PATH);

    // Initialize Firebase Admin
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
      });
    }

    console.log('✓ Firebase Admin SDK initialized');
    console.log(`  Project: ${serviceAccount.project_id}\n`);
    
    return true;
  } catch (error) {
    console.error('✗ Failed to initialize Firebase Admin SDK:', error.message);
    return false;
  }
}

async function setAdminClaim(email) {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    
    console.log(`Found user: ${user.email} (UID: ${user.uid})`);
    
    // Set custom claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    
    console.log(`✓ Admin claim set successfully for ${email}`);
    console.log('\n⚠️  IMPORTANT: User needs to sign out and sign back in for changes to take effect!');
    
    return true;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`✗ User with email "${email}" not found in Firebase Authentication`);
      console.error('   Make sure the user exists and has registered in your app.');
    } else {
      console.error('✗ Error setting admin claim:', error.message);
    }
    return false;
  }
}

async function removeAdminClaim(email) {
  try {
    // Get user by email
    const user = await admin.auth().getUserByEmail(email);
    
    console.log(`Found user: ${user.email} (UID: ${user.uid})`);
    
    // Remove admin claim
    await admin.auth().setCustomUserClaims(user.uid, { admin: false });
    
    console.log(`✓ Admin claim removed successfully for ${email}`);
    console.log('\n⚠️  IMPORTANT: User needs to sign out and sign back in for changes to take effect!');
    
    return true;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`✗ User with email "${email}" not found in Firebase Authentication`);
    } else {
      console.error('✗ Error removing admin claim:', error.message);
    }
    return false;
  }
}

async function checkAdminStatus(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    const claims = user.customClaims || {};
    
    console.log(`\nUser: ${user.email}`);
    console.log(`UID: ${user.uid}`);
    console.log(`Admin Status: ${claims.admin === true ? '✅ Admin' : '❌ Not Admin'}`);
    console.log(`Custom Claims:`, JSON.stringify(claims, null, 2));
    
    return claims.admin === true;
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`✗ User with email "${email}" not found`);
    } else {
      console.error('✗ Error checking admin status:', error.message);
    }
    return false;
  }
}

async function main() {
  console.log('🔐 Firebase Admin Claim Manager');
  console.log('='.repeat(50));
  
  // Check command line arguments
  const args = process.argv.slice(2);
  const command = args[0]; // 'set', 'remove', or 'check'
  const email = args[1] || ADMIN_USER_EMAIL;
  
  if (!email || email === 'admin@example.com') {
    console.error('\n✗ Error: No email provided');
    console.log('\nUsage:');
    console.log('  node scripts/set-admin.js set <email>     # Make user admin');
    console.log('  node scripts/set-admin.js remove <email>  # Remove admin status');
    console.log('  node scripts/set-admin.js check <email>   # Check admin status');
    console.log('\nOr update ADMIN_USER_EMAIL in the script file.\n');
    process.exit(1);
  }
  
  // Initialize Firebase Admin
  if (!initializeAdmin()) {
    process.exit(1);
  }
  
  // Execute command
  try {
    switch (command) {
      case 'set':
        await setAdminClaim(email);
        break;
      case 'remove':
        await removeAdminClaim(email);
        break;
      case 'check':
        await checkAdminStatus(email);
        break;
      default:
        // Default to 'set' if no command provided
        await setAdminClaim(email);
        break;
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Operation failed:', error.message);
    process.exit(1);
  }
}

// Run script
main();

