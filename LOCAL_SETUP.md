# Running Backup System Locally (Without Docker)

## Prerequisites

### 1. Node.js
✅ **Already installed:** v20.17.0

### 2. PostgreSQL Client Tools (pg_dump)

PostgreSQL client tools are required to backup the database. Choose one option:

#### Option A: Install PostgreSQL Full Version (Recommended)
1. Download from https://www.postgresql.org/download/windows/
2. Run the installer
3. During installation, select "PostgreSQL Server" (port 5432) and "Command Line Tools"
4. Complete installation

#### Option B: Install Only PostgreSQL Client Tools
1. Download pgAdmin 4 + Client Tools from: https://www.pgadmin.org/download/pgadmin-4-windows/
2. Run installer
3. Select "PostgreSQL client tools" during installation

#### Verify Installation
```bash
pg_dump --version
```

Should output: `pg_dump (PostgreSQL) 15.x ...`

### 3. Database Connection
Your PostgreSQL database is already running in Docker:
- **Host:** localhost
- **Port:** 5432
- **User:** postgres
- **Password:** postgres
- **Database:** testdb

## Setup Steps

### Step 1: Configure Environment Variables

Edit `.env` file:
```bash
# Database Configuration
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=testdb

# Backup Configuration
ENABLE_BACKUP=true

# Google Drive (see BACKUP_SETUP.md)
GOOGLE_DRIVE_CREDENTIALS_PATH=.google-drive-credentials.json
GOOGLE_DRIVE_FOLDER_ID=your_folder_id

# Gmail (Optional - see BACKUP_SETUP.md)
GMAIL_EMAIL=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Microsoft Teams (Optional - see BACKUP_SETUP.md)
MS_TEAMS_WEBHOOK_URL=https://outlook.webhook.office.com/...
```

### Step 2: Install npm Dependencies

```bash
cd d:\projects\simple
npm install
```

## Running Backups

### Manual Backup (One-time)

Run a single backup immediately:

```bash
npm run backup
```

Output will show:
```
============================================================
[2026-04-22T10:30:00.000Z] BACKUP PROCESS STARTED
============================================================

[2026-04-22T10:30:00.123Z] Starting database backup...
[2026-04-22T10:30:01.456Z] Database backup completed: backups/db-backup-2026-04-22T10-30-00.sql
[2026-04-22T10:30:01.789Z] Creating backup archive...
[2026-04-22T10:30:02.012Z] Archive created: backups/backup-2026-04-22T10-30-00.zip (5242880 bytes)
[2026-04-22T10:30:10.345Z] Uploading to Google Drive...
[2026-04-22T10:30:15.678Z] Successfully uploaded to Google Drive:
  File ID: 1a2b3c4d5e6f7g8h9i0j
  Name: backup-2026-04-22T10-30-00.zip
  Link: https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view

============================================================
[2026-04-22T10:30:15.678Z] BACKUP PROCESS COMPLETED (15.68s)
============================================================
```

### Automated Backups (Windows Task Scheduler)

Schedule automatic backups using Windows Task Scheduler:

#### Create Scheduled Task

1. Open **Task Scheduler** (Press `Win + R`, type `taskschd.msc`)
2. Click **Create Basic Task** in the right panel
3. Configure as follows:

**General Tab:**
- Name: `Node Backup - 12 AM`
- Description: `Automatic backup at 12:00 AM`
- ☑ Run whether user is logged in or not
- ☑ Run with highest privileges

**Trigger Tab:**
- Click **New**
- Select: `Daily`
- Start: `Today`
- Recur every: `1 day`
- Time: `00:00:00` (for 12 AM)
- Click **OK**

**Action Tab:**
- Program/script: `C:\Program Files\nodejs\node.exe`
- Arguments: `npm run backup`
- Start in: `D:\projects\simple`
- Click **OK**

**Repeat for other times:**
- Create another task for **8:00 AM** (`08:00:00`)
- Create another task for **4:00 PM** (`16:00:00`)

#### Alternative: Using Node-Cron Locally

For continuous backup scheduling without Task Scheduler, create `local-scheduler.js`:

```javascript
const cron = require('node-cron');
const { performBackup } = require('./scripts/backup');

console.log('Starting backup scheduler on local system...');

// 12:00 AM
cron.schedule('0 0 * * *', async () => {
  console.log('Running scheduled backup at 12:00 AM');
  await performBackup();
});

// 8:00 AM
cron.schedule('0 8 * * *', async () => {
  console.log('Running scheduled backup at 8:00 AM');
  await performBackup();
});

// 4:00 PM
cron.schedule('0 16 * * *', async () => {
  console.log('Running scheduled backup at 4:00 PM');
  await performBackup();
});

console.log('Backup scheduler is running. Press Ctrl+C to stop.');
console.log('Scheduled times: 12:00 AM, 08:00 AM, 04:00 PM UTC');
```

Then run:
```bash
node local-scheduler.js
```

## Backup Storage

Backups are stored locally in:
- **Location:** `d:\projects\simple\backups\`
- **Format:** ZIP files containing:
  - SQL database dump
  - Complete uploads folder
- **Retention:** 7 days (21 backups)
- **Size:** Depends on database and uploads

## Verify Everything Works

### Test 1: Database Connection
```bash
psql -h localhost -U postgres -d testdb -c "SELECT version();"
```

Should return PostgreSQL version.

### Test 2: Backup Directory
```bash
dir d:\projects\simple\backups
```

Should show backup files or be empty if no backups yet.

### Test 3: Manual Backup
```bash
npm run backup
```

Check for success output with Google Drive link.

## Troubleshooting

### "pg_dump: command not found"
- pg_dump is not installed or not in PATH
- **Solution:** Install PostgreSQL client tools (see Prerequisites)
- **Alternative:** Add PostgreSQL bin to PATH:
  ```bash
  # Add to PATH if PostgreSQL is installed in default location
  setx PATH "%PATH%;C:\Program Files\PostgreSQL\15\bin"
  ```

### "Failed to connect to database"
- PostgreSQL container not running
- **Solution:** 
  ```bash
  docker-compose up -d db
  ```

### "ENOENT: no such file or directory, open '.google-drive-credentials.json'"
- Google Drive credentials file not configured
- **Solution:** Follow BACKUP_SETUP.md to set up Google Drive authentication

### "Gmail credentials not configured"
- Email settings not in .env
- **Solution:** Add GMAIL_EMAIL and GMAIL_APP_PASSWORD to .env

### Backup taking too long
```bash
# Check database size
psql -h localhost -U postgres -d testdb -c "SELECT pg_size_pretty(pg_database_size(current_database()));"

# Check uploads folder size
dir /s d:\projects\simple\uploads | find "Total Files"
```

## System Requirements

- **Disk Space:** Minimum 1GB free (for backups)
- **Network:** Required for Google Drive upload
- **RAM:** 512MB minimum
- **CPU:** Any modern processor

## Performance Estimates

| Operation | Time |
|-----------|------|
| Database dump (10MB) | 2-3 seconds |
| Archive creation | 3-5 seconds |
| Google Drive upload | 5-15 seconds (depends on internet) |
| **Total** | **10-25 seconds** |

## Next Steps

1. Install PostgreSQL client tools
2. Configure `.env` with credentials
3. Set up Google Drive authentication (see BACKUP_SETUP.md)
4. Run manual backup: `npm run backup`
5. Schedule automated backups using Task Scheduler or local-scheduler.js
6. Monitor logs in `backups/` folder

## Keep Running in Background

To keep backup scheduler running while you work:

```bash
# Use npm package 'forever'
npm install -g forever

# Start scheduler
forever start local-scheduler.js

# View running processes
forever list

# Stop scheduler
forever stop local-scheduler.js
```

Or use **Windows batch file** to run in background:

Create `start-backup.bat`:
```batch
@echo off
cd /d D:\projects\simple
start "Backup Scheduler" node local-scheduler.js
```

Run it to start the background process.
