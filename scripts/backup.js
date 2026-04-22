const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');
const { google } = require('googleapis');
const { getGoogleDriveAuth } = require('./google-drive-auth');
const { sendSuccessEmail, sendFailureEmail } = require('./email-alerts');
const { sendSuccessNotification, sendFailureNotification } = require('./teams-alerts');

const BACKUP_DIR = path.join(__dirname, '../backups');
const UPLOADS_DIR = path.join(__dirname, '../uploads');

// Ensure backups directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function backupDatabase() {
  console.log(`[${new Date().toISOString()}] Starting database backup...`);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const dbBackupFile = path.join(BACKUP_DIR, `db-backup-${timestamp}.sql`);
  
  try {
    const backupCommand = `pg_dump -h ${process.env.DB_HOST || 'db'} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} > "${dbBackupFile}"`;
    
    execSync(backupCommand, {
      env: {
        ...process.env,
        PGPASSWORD: process.env.DB_PASSWORD
      }
    });
    
    console.log(`[${new Date().toISOString()}] Database backup completed: ${dbBackupFile}`);
    return dbBackupFile;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Database backup failed:`, error.message);
    throw error;
  }
}

async function createBackupArchive(dbBackupFile) {
  console.log(`[${new Date().toISOString()}] Creating backup archive...`);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const archiveFile = path.join(BACKUP_DIR, `backup-${timestamp}.zip`);
  
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(archiveFile);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      console.log(`[${new Date().toISOString()}] Archive created: ${archiveFile} (${archive.pointer()} bytes)`);
      resolve(archiveFile);
    });
    
    output.on('error', (err) => {
      console.error(`[${new Date().toISOString()}] Archive error:`, err.message);
      reject(err);
    });
    
    archive.on('error', (err) => {
      console.error(`[${new Date().toISOString()}] Archiver error:`, err.message);
      reject(err);
    });
    
    archive.pipe(output);
    
    // Add database backup
    if (fs.existsSync(dbBackupFile)) {
      archive.file(dbBackupFile, { name: path.basename(dbBackupFile) });
    }
    
    // Add uploads folder
    if (fs.existsSync(UPLOADS_DIR)) {
      archive.directory(UPLOADS_DIR, 'uploads');
    }
    
    archive.finalize();
  });
}

async function uploadToGoogleDrive(filePath) {
  console.log(`[${new Date().toISOString()}] Uploading to Google Drive...`);
  
  try {
    const auth = await getGoogleDriveAuth();
    const drive = google.drive({ version: 'v3', auth });
    
    const fileMetadata = {
      name: path.basename(filePath),
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID || 'root']
    };
    
    const media = {
      mimeType: 'application/zip',
      body: fs.createReadStream(filePath)
    };
    
    const res = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink'
    });
    
    console.log(`[${new Date().toISOString()}] Successfully uploaded to Google Drive:`);
    console.log(`  File ID: ${res.data.id}`);
    console.log(`  Name: ${res.data.name}`);
    console.log(`  Link: ${res.data.webViewLink}`);
    
    return res.data;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Google Drive upload failed:`, error.message);
    throw error;
  }
}

async function cleanupOldBackups() {
  console.log(`[${new Date().toISOString()}] Cleaning up backups older than 7 days...`);
  
  try {
    const MAX_LOCAL_BACKUPS = 21; // Keep 7 days of backups (3 per day × 7 days)
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.endsWith('.zip') || f.endsWith('.sql'))
      .sort()
      .reverse();
    
    if (files.length > MAX_LOCAL_BACKUPS) {
      const filesToDelete = files.slice(MAX_LOCAL_BACKUPS);
      filesToDelete.forEach(file => {
        const filePath = path.join(BACKUP_DIR, file);
        fs.unlinkSync(filePath);
        console.log(`[${new Date().toISOString()}] Deleted old backup: ${file}`);
      });
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Cleanup failed:`, error.message);
  }
}

async function performBackup() {
  const startTime = Date.now();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${new Date().toISOString()}] BACKUP PROCESS STARTED`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    // Step 1: Backup database
    const dbBackupFile = await backupDatabase();
    
    // Step 2: Create archive with db + uploads
    const archiveFile = await createBackupArchive(dbBackupFile);
    
    // Step 3: Upload to Google Drive
    const googleDriveInfo = await uploadToGoogleDrive(archiveFile);
    
    // Step 4: Cleanup old backups
    await cleanupOldBackups();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Prepare backup info for alerts
    const backupInfo = {
      fileName: path.basename(archiveFile),
      fileSize: fs.statSync(archiveFile).size,
      duration: duration,
      googleDriveId: googleDriveInfo.id,
      googleDriveName: googleDriveInfo.name,
      googleDriveLink: googleDriveInfo.webViewLink
    };
    
    // Send success alerts
    await Promise.all([
      sendSuccessEmail(backupInfo),
      sendSuccessNotification(backupInfo)
    ]);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${new Date().toISOString()}] BACKUP PROCESS COMPLETED (${duration}s)`);
    console.log(`${'='.repeat(60)}\n`);
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Send failure alerts
    await Promise.all([
      sendFailureEmail(error.message || String(error)),
      sendFailureNotification(error.message || String(error))
    ]);
    
    console.error(`\n${'='.repeat(60)}`);
    console.error(`[${new Date().toISOString()}] BACKUP PROCESS FAILED (${duration}s)`);
    console.error(`Error: ${error.message}`);
    console.error(`${'='.repeat(60)}\n`);
    process.exit(1);
  }
}

// Run backup if called directly
if (require.main === module) {
  performBackup().catch(err => {
    console.error('Backup failed:', err);
    process.exit(1);
  });
}

module.exports = { performBackup };
