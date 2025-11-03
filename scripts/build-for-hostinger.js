/**
 * Build Script for Hostinger Deployment
 * 
 * This script helps prepare your Next.js app for deployment to Hostinger.
 * It creates a build with embedded Firebase configuration.
 * 
 * USAGE:
 *   1. Update FIREBASE_CONFIG below with your Firebase values
 *   2. Run: node scripts/build-for-hostinger.js
 *   3. Upload the 'out' folder to Hostinger
 */

const fs = require('fs');
const path = require('path');

// ⚠️ UPDATE THESE VALUES WITH YOUR FIREBASE CONFIG
const FIREBASE_CONFIG = {
  apiKey: 'YOUR_API_KEY_HERE',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

const CONFIG_FILE_PATH = path.join(__dirname, '..', 'public', 'firebase-config.js');
const OUT_FOLDER = path.join(__dirname, '..', 'out');

console.log('🚀 Hostinger Build Preparation Script');
console.log('='.repeat(50));

// Check if Firebase config is provided
const hasConfig = FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== 'YOUR_API_KEY_HERE';

if (!hasConfig) {
  console.log('\n⚠️  WARNING: Firebase config not provided!');
  console.log('   Update FIREBASE_CONFIG in this script with your Firebase values.');
  console.log('   Or set environment variables and use: npm run build\n');
} else {
  console.log('\n✓ Firebase config provided');
}

console.log('\n📝 Next Steps:');
console.log('1. Make sure you have set up your Firebase config');
console.log('2. Run: npm run build');
console.log('3. Upload the "out" folder contents to Hostinger public_html');
console.log('4. Make sure .htaccess file is included\n');

if (hasConfig) {
  // Create public directory if it doesn't exist
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Create Firebase config file for static export
  const configJs = `
// Firebase Configuration (Embedded for Hostinger static hosting)
window.FIREBASE_CONFIG = ${JSON.stringify(FIREBASE_CONFIG, null, 2)};
`;

  fs.writeFileSync(CONFIG_FILE_PATH, configJs);
  console.log('✓ Created firebase-config.js in public folder');
  console.log('  This will be available at /firebase-config.js\n');
}

console.log('✅ Build preparation complete!\n');

