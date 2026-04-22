const https = require('https');
const url = require('url');

async function sendSuccessNotification(backupInfo) {
  if (!process.env.MS_TEAMS_WEBHOOK_URL) {
    return false;
  }
  
  try {
    const message = {
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      "summary": "✅ Backup Successful",
      "themeColor": "28a745",
      "sections": [
        {
          "activityTitle": "✅ Backup Completed Successfully",
          "activitySubtitle": new Date().toISOString(),
          "facts": [
            {
              "name": "Backup File:",
              "value": backupInfo.fileName
            },
            {
              "name": "File Size:",
              "value": formatFileSize(backupInfo.fileSize)
            },
            {
              "name": "Duration:",
              "value": `${backupInfo.duration}s`
            },
            {
              "name": "Database:",
              "value": process.env.DB_NAME
            },
            {
              "name": "Google Drive ID:",
              "value": backupInfo.googleDriveId
            }
          ],
          "markdown": true
        },
        {
          "activityTitle": "📂 Backup Contents",
          "text": "• Database dump (SQL)\n• Uploads folder"
        },
        {
          "activityTitle": "🔗 Google Drive Link",
          "text": `[View backup on Google Drive](${backupInfo.googleDriveLink})`
        }
      ]
    };
    
    const result = await sendTeamsMessage(message);
    if (result) {
      console.log(`[${new Date().toISOString()}] Success notification sent to Microsoft Teams`);
    }
    return result;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to send Teams success notification:`, error.message);
    return false;
  }
}

async function sendFailureNotification(error) {
  if (!process.env.MS_TEAMS_WEBHOOK_URL) {
    return false;
  }
  
  try {
    const message = {
      "@type": "MessageCard",
      "@context": "https://schema.org/extensions",
      "summary": "❌ Backup Failed",
      "themeColor": "dc3545",
      "sections": [
        {
          "activityTitle": "❌ Backup Failed",
          "activitySubtitle": new Date().toISOString(),
          "facts": [
            {
              "name": "Error:",
              "value": String(error).substring(0, 200)
            },
            {
              "name": "Database:",
              "value": process.env.DB_NAME
            }
          ],
          "markdown": true
        },
        {
          "activityTitle": "⚠️ Action Required",
          "text": "**Please investigate:**\n• Check the backup system logs\n• Verify database connectivity\n• Check Google Drive credentials\n• Ensure sufficient disk space"
        }
      ]
    };
    
    const result = await sendTeamsMessage(message);
    if (result) {
      console.log(`[${new Date().toISOString()}] Failure notification sent to Microsoft Teams`);
    }
    return result;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to send Teams failure notification:`, error.message);
    return false;
  }
}

function sendTeamsMessage(message) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new url.URL(process.env.MS_TEAMS_WEBHOOK_URL);
      const postData = JSON.stringify(message);
      
      const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(true);
          } else {
            console.error(`Teams API returned status ${res.statusCode}`);
            resolve(false);
          }
        });
      });
      
      req.on('error', (err) => {
        console.error('Request error:', err.message);
        resolve(false);
      });
      
      req.write(postData);
      req.end();
    } catch (error) {
      console.error('Error sending Teams message:', error.message);
      resolve(false);
    }
  });
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

module.exports = { sendSuccessNotification, sendFailureNotification };
