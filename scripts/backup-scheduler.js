const cron = require('node-cron');
const { performBackup } = require('./backup');

// Schedule backup at 12:00 AM, 8:00 AM, and 4:00 PM UTC
// Cron format: minute hour day month dayOfWeek
const BACKUP_TIMES = [
  '0 0 * * *',   // 12:00 AM
  '0 8 * * *',   // 8:00 AM
  '0 16 * * *'   // 4:00 PM
];

function initializeBackupScheduler() {
  console.log('Initializing backup scheduler...');
  
  BACKUP_TIMES.forEach((cronPattern, index) => {
    const task = cron.schedule(cronPattern, async () => {
      console.log(`\nScheduled backup #${index + 1} triggered at ${new Date().toISOString()}`);
      try {
        await performBackup();
      } catch (error) {
        console.error('Scheduled backup failed:', error.message);
      }
    });
    
    const times = ['00:00 UTC', '08:00 UTC', '16:00 UTC'];
    console.log(`✓ Backup #${index + 1} scheduled at ${times[index]}`);
  });
  
  console.log('Backup scheduler ready!\n');
}

module.exports = { initializeBackupScheduler };
