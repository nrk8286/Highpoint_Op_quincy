#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const querystring = require('querystring');
const jwt = require('jsonwebtoken');
const { HttpsProxyAgent } = require('https-proxy-agent');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const rulesPath = path.join(__dirname, 'firestore.rules');

async function getAccessToken(serviceAccount) {
  return new Promise((resolve, reject) => {
    // Create JWT
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      {
        iss: serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/cloud-platform',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
      },
      serviceAccount.private_key,
      { algorithm: 'RS256' }
    );

    // Exchange JWT for access token
    const data = querystring.stringify({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token
    });

    const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
    const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

    const options = {
      hostname: 'oauth2.googleapis.com',
      port: 443,
      path: '/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length
      },
      agent: agent
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error(`Token error: ${response.error} - ${response.error_description}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function deployRules() {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');
    const projectId = serviceAccount.project_id;

    console.log('Getting access token...');
    const accessToken = await getAccessToken(serviceAccount);
    console.log('✓ Access token obtained');

    // Create ruleset
    console.log('Creating ruleset...');
    const rulesetPayload = JSON.stringify({
      source: {
        files: [
          {
            name: 'firestore.rules',
            content: rulesContent
          }
        ]
      }
    });

    const rulesetId = await new Promise((resolve, reject) => {
      const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
      const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

      const options = {
        hostname: 'firebaserules.googleapis.com',
        port: 443,
        path: `/v1/projects/${projectId}/rulesets`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': rulesetPayload.length
        },
        agent: agent
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            if (response.name) {
              resolve(response.name.split('/').pop());
            } else {
              reject(new Error(`Ruleset error: ${JSON.stringify(response)}`));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(rulesetPayload);
      req.end();
    });

    console.log(`✓ Ruleset created: ${rulesetId}`);

    // Release the ruleset - create a new release for cloud.firestore
    console.log('Creating release for cloud.firestore...');
    const releasePayload = JSON.stringify({
      release: {
        name: `projects/${projectId}/releases/cloud.firestore`,
        rulesetId: rulesetId
      }
    });

    await new Promise((resolve, reject) => {
      const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
      const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

      // Try creating a release with POST
      const options = {
        hostname: 'firebaserules.googleapis.com',
        port: 443,
        path: `/v1/projects/${projectId}/releases`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Content-Length': releasePayload.length
        },
        agent: agent
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const response = JSON.parse(body);
            if (response.name || response.createTime) {
              console.log(`✓ Ruleset released: ${response.name || 'cloud.firestore'}`);
              resolve();
            } else {
              reject(new Error(`Release error: ${JSON.stringify(response)}`));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.write(releasePayload);
      req.end();
    });

    console.log('✅ Firestore rules deployed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deployRules();
