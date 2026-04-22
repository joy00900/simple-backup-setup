const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { execSync } = require('child_process');
const archiver = require('archiver');

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
    const host = process.env.DB_HOST || 'localhost';
    const user = process.env.DB_USER || 'postgres';
    const database = process.env.DB_NAME || 'testdb';
    
    // Try using pg_dump directly first
    let backupCommand;
    try {
      // Check if pg_dump is available
      execSync('pg_dump --version', { stdio: 'ignore' });
      // If available, use it directly
      backupCommand = `pg_dump -h ${host} -U ${user} -d ${database} > "${dbBackupFile}"`;
    } catch (e) {
      // Fall back to Docker's pg_dump
      console.log(`[${new Date().toISOString()}] pg_dump not found locally, using Docker container...`);
      backupCommand = `docker exec postgres_db pg_dump -h localhost -U ${user} -d ${database} > "${dbBackupFile}"`;
    }
    
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
  console.log(`[${new Date().toISOString()}] BACKUP PROCESS STARTED (LOCAL MODE)`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    // Step 1: Backup database
    const dbBackupFile = await backupDatabase();
    
    // Step 2: Create archive with db + uploads
    const archiveFile = await createBackupArchive(dbBackupFile);
    
    // Step 3: Cleanup old backups
    await cleanupOldBackups();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    // Display summary
    const fileSize = fs.statSync(archiveFile).size;
    const fileSizeFormatted = formatFileSize(fileSize);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${new Date().toISOString()}] BACKUP COMPLETED SUCCESSFULLY (${duration}s)`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📁 Backup File: ${path.basename(archiveFile)}`);
    console.log(`📊 File Size: ${fileSizeFormatted}`);
    console.log(`💾 Location: ${BACKUP_DIR}`);
    console.log(`${'='.repeat(60)}\n`);
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.error(`\n${'='.repeat(60)}`);
    console.error(`[${new Date().toISOString()}] BACKUP FAILED (${duration}s)`);
    console.error(`Error: ${error.message}`);
    console.error(`${'='.repeat(60)}\n`);
    process.exit(1);
  }
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Run backup if called directly
if (require.main === module) {
  performBackup().catch(err => {
    console.error('Backup failed:', err);
    process.exit(1);
  });
}

module.exports = { performBackup };
