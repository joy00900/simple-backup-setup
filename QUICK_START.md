# Quick Start - Local Backup System

## ✅ Everything is Working!

Your backup system is ready to use locally without any additional setup.

### Two Backup Modes Available

#### 1. **Local-Only Backup** (Recommended to start)
Works without Google Drive, Gmail, or Teams configuration.

```bash
cd d:\projects\simple
npm run backup-local
```

**Features:**
- ✅ Database backup
- ✅ Uploads folder backup  
- ✅ Automatic compression (ZIP)
- ✅ Local storage only
- ✅ 7-day retention (automatic cleanup)

**Output:**
- Files stored in: `d:\projects\simple\backups\`
- Includes database SQL dump + uploads

---

#### 2. **Full Backup** (With Google Drive/Gmail/Teams)
Requires configuration of optional services.

```bash
cd d:\projects\simple
npm run backup
```

**Additional Features (requires setup):**
- 📤 Upload to Google Drive
- 📧 Gmail alerts on success/failure
- 💬 Microsoft Teams notifications

**Setup Guide:** See [BACKUP_SETUP.md](BACKUP_SETUP.md)

---

## 📋 Current Status

| Feature | Status | Action |
|---------|--------|--------|
| Database Backup | ✅ Working | Ready to use |
| Local Storage | ✅ Working | Ready to use |
| 7-Day Retention | ✅ Working | Ready to use |
| Google Drive | ⏳ Optional | See BACKUP_SETUP.md |
| Gmail Alerts | ⏳ Optional | See BACKUP_SETUP.md |
| Teams Alerts | ⏳ Optional | See BACKUP_SETUP.md |

---

## 🚀 Schedule Automated Backups

### Option 1: Windows Task Scheduler (Easiest)

Create 3 tasks for automatic backups at 12 AM, 8 AM, and 4 PM:

**Task Settings:**
- Program: `node.exe` (full path: `C:\Program Files\nodejs\node.exe`)
- Arguments: `npm run backup-local`
- Start in: `D:\projects\simple`
- Trigger: Daily at specified time

See [LOCAL_SETUP.md](LOCAL_SETUP.md) for detailed step-by-step.

### Option 2: Keep Running in Background

Create a local scheduler that runs 24/7:

```javascript
// local-scheduler.js
const cron = require('node-cron');
const { performBackup } = require('./scripts/backup-local');

// 12:00 AM
cron.schedule('0 0 * * *', () => performBackup());

// 8:00 AM
cron.schedule('0 8 * * *', () => performBackup());

// 4:00 PM
cron.schedule('0 16 * * *', () => performBackup());

console.log('Backup scheduler running...');
```

Run with: `node local-scheduler.js`

---

## 💾 Backup Files

Each backup contains:
```
backup-2026-04-22T05-03-37.zip
├── db-backup-2026-04-22T05-03-37.sql    (Database dump)
└── uploads/
    ├── file1.png
    ├── file2.jpg
    └── ...
```

**Size Examples:**
- Empty database: ~2 KB
- Full archive: 150-200 KB (depends on uploads)
- 7 days of backups: ~1-1.5 MB

---

## 📊 Test Results

Latest backup completed successfully:
```
Backup File: backup-2026-04-22T05-03-37.zip
File Size: 153 KB
Duration: 0.51s
```

---

## 🎯 Next Steps

1. **Test Backup:** Run `npm run backup-local` ✅ (Already done!)
2. **Schedule Backups:** Set up Windows Task Scheduler or local-scheduler.js
3. **Monitor Backups:** Check `backups/` folder periodically
4. **Optional - Add Gmail Alerts:** See [BACKUP_SETUP.md](BACKUP_SETUP.md)
5. **Optional - Add Teams Alerts:** See [BACKUP_SETUP.md](BACKUP_SETUP.md)
6. **Optional - Add Google Drive:** See [BACKUP_SETUP.md](BACKUP_SETUP.md)

---

## ⚠️ Important Notes

- **PostgreSQL Database:** Must be running (currently running in Docker)
- **Disk Space:** Keep at least 1 GB free for backups
- **Backup Location:** All backups stored in `d:\projects\simple\backups\`
- **Retention:** Automatically keeps 21 backups (7 days × 3 per day)
- **Encryption:** None by default (add via ZIP password if needed)

---

## 🔧 Troubleshooting

### Backup won't run
```bash
# Check if in correct directory
cd d:\projects\simple

# Check Node.js is installed
node --version

# Check .env exists and has correct values
type .env
```

### Database connection failed
```bash
# Check PostgreSQL container is running
docker ps | find "postgres"

# Start if needed
docker-compose up -d db
```

### Backup file empty or too small
- Check database has data: `docker-compose exec db psql -U postgres -d testdb -c "SELECT * FROM items;"`
- Check uploads folder has files: `dir d:\projects\simple\uploads`

---

## 📞 Support

- **Database Backup Issues:** Check database is running and credentials in `.env`
- **Storage Issues:** Ensure `d:\projects\simple\backups\` folder exists and is writable
- **Optional Features:** See [BACKUP_SETUP.md](BACKUP_SETUP.md) for Gmail/Teams/Google Drive setup

---

## 🎓 Learn More

- [LOCAL_SETUP.md](LOCAL_SETUP.md) - Detailed local system setup
- [BACKUP_SETUP.md](BACKUP_SETUP.md) - Google Drive, Gmail, Teams configuration
- [GitHub Repository](https://github.com/joy00900/simple-backup-setup) - Source code
