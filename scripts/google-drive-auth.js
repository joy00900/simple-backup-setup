const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const { OAuth2 } = google.auth;

const TOKEN_PATH = path.join(__dirname, '../.google-drive-token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../.google-drive-credentials.json');

async function getGoogleDriveAuth() {
  // Check if credentials file exists
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(`Google Drive credentials not found at ${CREDENTIALS_PATH}`);
  }
  
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;
  
  const oauth2Client = new OAuth2(client_id, client_secret, redirect_uris[0]);
  
  // Try to load existing token
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
    oauth2Client.setCredentials(token);
    
    // Refresh token if expired
    if (token.expiry_date < Date.now()) {
      const { credentials: newCredentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(newCredentials);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(newCredentials, null, 2));
    }
    
    return oauth2Client;
  }
  
  // If no token, generate authorization URL
  console.log('\n⚠️  Google Drive authentication needed');
  console.log('Visit this URL to authorize:', oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive']
  }));
  console.log('\nAfter authorizing, create a .google-drive-token.json file with the access token');
  
  throw new Error('Google Drive token not configured. Please follow the setup instructions.');
}

module.exports = { getGoogleDriveAuth };
