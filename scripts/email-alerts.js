const nodemailer = require('nodemailer');

let transporter = null;

async function initializeEmailTransporter() {
  if (transporter) return transporter;
  
  if (!process.env.GMAIL_EMAIL || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('Gmail credentials not configured. Email notifications disabled.');
    return null;
  }
  
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_EMAIL,
      pass: process.env.GMAIL_APP_PASSWORD // Use App Password, not regular password
    }
  });
  
  // Verify connection
  try {
    await transporter.verify();
    console.log('Gmail connection verified');
    return transporter;
  } catch (error) {
    console.error('Gmail verification failed:', error.message);
    transporter = null;
    return null;
  }
}

async function sendSuccessEmail(backupInfo) {
  const mailer = await initializeEmailTransporter();
  if (!mailer) return false;
  
  try {
    const mailOptions = {
      from: process.env.GMAIL_EMAIL,
      to: process.env.ALERT_EMAIL_TO || process.env.GMAIL_EMAIL,
      subject: `✅ Backup Successful - ${new Date().toLocaleDateString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #28a745;">✅ Backup Completed Successfully</h2>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p><strong>Backup File:</strong> ${backupInfo.fileName}</p>
            <p><strong>File Size:</strong> ${formatFileSize(backupInfo.fileSize)}</p>
            <p><strong>Duration:</strong> ${backupInfo.duration}s</p>
            <p><strong>Database:</strong> ${process.env.DB_NAME}</p>
          </div>
          
          <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2196F3;">
            <h3 style="color: #0056b3; margin-top: 0;">Google Drive Details</h3>
            <p><strong>File ID:</strong> ${backupInfo.googleDriveId}</p>
            <p><strong>File Name:</strong> ${backupInfo.googleDriveName}</p>
            <p><strong>Link:</strong> <a href="${backupInfo.googleDriveLink}">${backupInfo.googleDriveLink}</a></p>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>📊 Backup Contents:</strong></p>
            <ul>
              <li>Database dump (SQL)</li>
              <li>Uploads folder</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated message from your backup system.</p>
        </div>
      `
    };
    
    await mailer.sendMail(mailOptions);
    console.log(`[${new Date().toISOString()}] Success email sent to ${process.env.ALERT_EMAIL_TO || process.env.GMAIL_EMAIL}`);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to send success email:`, error.message);
    return false;
  }
}

async function sendFailureEmail(error) {
  const mailer = await initializeEmailTransporter();
  if (!mailer) return false;
  
  try {
    const mailOptions = {
      from: process.env.GMAIL_EMAIL,
      to: process.env.ALERT_EMAIL_TO || process.env.GMAIL_EMAIL,
      subject: `❌ Backup Failed - ${new Date().toLocaleDateString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #dc3545;">❌ Backup Failed</h2>
          
          <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
            <h3 style="color: #721c24; margin-top: 0;">Error Details</h3>
            <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
            <p><strong>Error Message:</strong></p>
            <pre style="background-color: #fff3cd; padding: 10px; border-radius: 3px; overflow-x: auto;">
${error}</pre>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #856404; margin-top: 0;">⚠️ Action Required</h3>
            <ul>
              <li>Check the backup system logs</li>
              <li>Verify database connectivity</li>
              <li>Check Google Drive credentials</li>
              <li>Ensure sufficient disk space</li>
            </ul>
          </div>
          
          <p style="color: #666; font-size: 12px; margin-top: 30px;">This is an automated alert from your backup system. Please investigate and resolve the issue.</p>
        </div>
      `
    };
    
    await mailer.sendMail(mailOptions);
    console.log(`[${new Date().toISOString()}] Failure email sent to ${process.env.ALERT_EMAIL_TO || process.env.GMAIL_EMAIL}`);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to send failure email:`, error.message);
    return false;
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

module.exports = { sendSuccessEmail, sendFailureEmail };
