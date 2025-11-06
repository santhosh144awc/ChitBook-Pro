/**
 * Deploy Firestore Security Rules using Service Account
 * 
 * This script deploys firestore.rules to Firebase using the service account.
 * 
 * USAGE:
 * node scripts/deploy-rules.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const RULES_FILE_PATH = path.join(__dirname, '..', 'firestore.rules');

function initializeApp() {
  try {
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      throw new Error(`Service account file not found: ${SERVICE_ACCOUNT_PATH}`);
    }
    
    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log('✓ Firebase Admin initialized successfully');
    return admin;
  } catch (error) {
    console.error('✗ Error initializing Firebase Admin:', error.message);
    process.exit(1);
  }
}

async function deployRules() {
  try {
    console.log('🚀 Deploying Firestore security rules...\n');
    
    // Read the rules file
    if (!fs.existsSync(RULES_FILE_PATH)) {
      throw new Error(`Rules file not found: ${RULES_FILE_PATH}`);
    }
    
    const rulesContent = fs.readFileSync(RULES_FILE_PATH, 'utf8');
    console.log('✓ Rules file loaded');
    
    // Note: Firebase Admin SDK doesn't have a direct method to deploy rules
    // We need to use the REST API or gcloud CLI
    // For now, we'll use the gcloud CLI if available
    
    console.log('\n⚠️  Firebase Admin SDK cannot deploy rules directly.');
    console.log('   Please use one of these methods:\n');
    console.log('   Method 1: Firebase Console (Easiest)');
    console.log('   1. Go to https://console.firebase.google.com');
    console.log('   2. Select your project');
    console.log('   3. Go to Firestore Database → Rules');
    console.log('   4. Copy and paste the rules from firestore.rules');
    console.log('   5. Click Publish\n');
    console.log('   Method 2: Firebase CLI');
    console.log('   1. Run: firebase login');
    console.log('   2. Run: firebase deploy --only firestore:rules\n');
    console.log('   Method 3: gcloud CLI');
    console.log('   1. Install Google Cloud SDK');
    console.log('   2. Run: gcloud firestore rules deploy firestore.rules\n');
    
    // Display the rules content for easy copying
    console.log('📋 Rules content (copy this to Firebase Console):\n');
    console.log('─'.repeat(60));
    console.log(rulesContent);
    console.log('─'.repeat(60));
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  }
}

// Run deployment
if (require.main === module) {
  initializeApp();
  deployRules()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { deployRules };

