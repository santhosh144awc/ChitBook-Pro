/**
 * Deploy Firestore Security Rules using Firebase REST API
 * 
 * This script deploys firestore.rules to Firebase using the REST API.
 * 
 * USAGE:
 * node scripts/deploy-rules-api.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const https = require('https');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const RULES_FILE_PATH = path.join(__dirname, '..', 'firestore.rules');

let projectId;
let accessToken;

function initializeApp() {
  try {
    if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      throw new Error(`Service account file not found: ${SERVICE_ACCOUNT_PATH}`);
    }
    
    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    projectId = serviceAccount.project_id;
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    console.log('✓ Firebase Admin initialized');
    console.log(`✓ Project ID: ${projectId}`);
    return admin;
  } catch (error) {
    console.error('✗ Error initializing Firebase Admin:', error.message);
    process.exit(1);
  }
}

async function getAccessToken() {
  try {
    const serviceAccount = require(SERVICE_ACCOUNT_PATH);
    const jwt = require('jsonwebtoken');
    
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      {
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
        scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore'
      },
      serviceAccount.private_key,
      { algorithm: 'RS256' }
    );
    
    return new Promise((resolve, reject) => {
      const postData = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(token)}`;
      
      const options = {
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': postData.length
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response.access_token) {
              resolve(response.access_token);
            } else {
              reject(new Error('Failed to get access token: ' + JSON.stringify(response)));
            }
          } catch (e) {
            reject(e);
          }
        });
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  } catch (error) {
    throw new Error('Failed to get access token: ' + error.message);
  }
}

async function deployRules() {
  try {
    console.log('\n🚀 Deploying Firestore security rules via REST API...\n');
    
    // Read the rules file
    if (!fs.existsSync(RULES_FILE_PATH)) {
      throw new Error(`Rules file not found: ${RULES_FILE_PATH}`);
    }
    
    const rulesContent = fs.readFileSync(RULES_FILE_PATH, 'utf8');
    console.log('✓ Rules file loaded');
    
    // Get access token
    console.log('📡 Getting access token...');
    accessToken = await getAccessToken();
    console.log('✓ Access token obtained');
    
    // Deploy rules using Firebase Management API
    const url = `https://firebaserules.googleapis.com/v1/projects/${projectId}/releases`;
    
    // First, get the ruleset name
    const rulesetName = await createRuleset();
    
    // Then create a release
    await createRelease(rulesetName);
    
    console.log('\n✅ Rules deployed successfully!');
    console.log('\n⚠️  Note: It may take a few seconds for the rules to take effect.');
    console.log('   Refresh your application to see the changes.');
    
  } catch (error) {
    console.error('\n✗ Error deploying rules:', error.message);
    console.error('\n💡 Alternative: Deploy manually via Firebase Console:');
    console.error('   1. Go to https://console.firebase.google.com');
    console.error('   2. Select your project');
    console.error('   3. Go to Firestore Database → Rules');
    console.error('   4. Copy rules from firestore.rules');
    console.error('   5. Click Publish');
    process.exit(1);
  }
}

async function createRuleset() {
  return new Promise((resolve, reject) => {
    const rulesContent = fs.readFileSync(RULES_FILE_PATH, 'utf8');
    const postData = JSON.stringify({
      source: {
        files: [{
          content: rulesContent
        }]
      }
    });
    
    const options = {
      hostname: 'firebaserules.googleapis.com',
      path: `/v1/projects/${projectId}/rulesets`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          const response = JSON.parse(data);
          console.log('✓ Ruleset created');
          resolve(response.name);
        } else {
          reject(new Error(`Failed to create ruleset: ${res.statusCode} - ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function createRelease(rulesetName) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      name: `projects/${projectId}/releases/cloud.firestore`,
      rulesetName: rulesetName
    });
    
    const options = {
      hostname: 'firebaserules.googleapis.com',
      path: `/v1/projects/${projectId}/releases`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': postData.length
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log('✓ Release created');
          resolve();
        } else {
          reject(new Error(`Failed to create release: ${res.statusCode} - ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Run deployment
if (require.main === module) {
  initializeApp();
  deployRules()
    .then(() => {
      console.log('\n✅ Deployment completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Deployment failed:', error);
      process.exit(1);
    });
}

module.exports = { deployRules };

