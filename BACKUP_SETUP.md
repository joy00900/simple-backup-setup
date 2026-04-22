# Backup System Setup Guide

This guide will help you set up automated database and uploads backups to Google Drive.

## Features

- ✅ Automatic backups 3 times daily (12 AM, 8 AM, 4 PM UTC)
- ✅ Database and uploads folder compressed into ZIP archives
- ✅ Automatic upload to Google Drive
- ✅ Local backup retention (keeps 7 days = 21 backups)
- ✅ Automatic cleanup of old backups
- ✅ **Gmail alerts** on success/failure
- ✅ **Microsoft Teams notifications** on success/failure

## Prerequisites

1. Google Cloud Project with Google Drive API enabled
2. OAuth 2.0 Desktop credentials

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Drive API:
   - Click "APIs & Services" → "Library"
   - Search for "Google Drive API"
   - Click it and press "Enable"

## Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Desktop Application"
3. Download the JSON file
4. Rename it to `.google-drive-credentials.json` and place in the project root

**Important:** Add `http://localhost:8888/callback` as an authorized redirect URI in the OAuth consent screen.

## Step 3: Set Up Environment Variables

Copy `.env.example` to `.env` and update:

```bash
ENABLE_BACKUP=true
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here
```

### Find Your Google Drive Folder ID

1. Go to your Google Drive and create a folder for backups (or use existing)
2. Right-click the folder → "Get link"
3. The URL will look like: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
4. Copy the `FOLDER_ID_HERE` part

## Step 4: Authenticate with Google Drive

Run the backup script to set up authentication:

```bash
npm install
npm run backup
```

This will:
1. Prompt you with an authentication URL
2. Open the URL in your browser to authorize
3. Get an authorization code
4. Store the token in `.google-drive-token.json`

## Step 5: Configure Gmail Alerts (Optional)

Gmail alerts send detailed backup success/failure notifications to your email.

### Prerequisites
1. Gmail account with 2-Factor Authentication enabled
2. Google App Password (NOT your regular Gmail password)

### Generate Google App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Select "Mail" and "Windows Computer"
5. Google will generate a 16-character password
6. Copy this password (without spaces)

### Configure in .env

```bash
# Gmail configuration
GMAIL_EMAIL=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx  # Paste the 16-character password
ALERT_EMAIL_TO=recipient@example.com    # Where to send alerts (optional)
```

**Note:** You can use a different email for `ALERT_EMAIL_TO` than the Gmail account used for sending. If empty, alerts go to `GMAIL_EMAIL`.

### Alert Email Format

Success emails include:
- ✅ Backup completion status
- 📊 Backup file size and duration
- 🔗 Direct Google Drive link
- Database name and timestamp

Failure emails include:
- ❌ Error details
- 🔧 Troubleshooting steps
- ⚠️ Action items

## Step 6: Configure Microsoft Teams Alerts (Optional)

Microsoft Teams alerts send backup notifications directly to your team channel.

### Set Up Incoming Webhook

1. Open **Microsoft Teams**
2. Navigate to the channel where you want backup alerts
3. Click **⋯ (More options)** at the top right
4. Select **Connectors**
5. Search for **"Incoming Webhook"**
6. Click **Configure**
7. Give it a name: `Backup Alerts`
8. Optionally upload an image/icon
9. Click **Create**
10. Copy the webhook URL

### Configure in .env

```bash
# Microsoft Teams webhook
MS_TEAMS_WEBHOOK_URL=https://outlook.webhook.office.com/webhookb2/xxxxx/IncomingWebhook/xxxxx
```

### Alert Notifications

Success messages:
- ✅ Green themed card
- File size, duration, database name
- Direct Google Drive link
- Timestamp

Failure messages:
- ❌ Red themed card
- Error details
- Troubleshooting actions
- Timestamp

## Step 7: Deploy with Docker

Update your `.env` file and rebuild the Docker image:

```bash
docker-compose down
docker-compose up --build
```

The backup scheduler will start automatically and create backups:
- **12:00 AM UTC** - First daily backup
- **08:00 AM UTC** - Second daily backup
- **04:00 PM UTC** - Third daily backup

## Monitoring Backups

Check the application logs to see backup progress:

```bash
docker-compose logs -f app
```

You should see output like:

```
============================================================
[2026-04-21T12:00:00.000Z] BACKUP PROCESS STARTED
============================================================

[2026-04-21T12:00:00.123Z] Starting database backup...
[2026-04-21T12:00:01.456Z] Database backup completed: backups/db-backup-2026-04-21T12-00-00.sql
[2026-04-21T12:00:01.789Z] Creating backup archive...
[2026-04-21T12:00:02.012Z] Archive created: backups/backup-2026-04-21T12-00-00.zip (5242880 bytes)
[2026-04-21T12:00:10.345Z] Uploading to Google Drive...
[2026-04-21T12:00:15.678Z] Successfully uploaded to Google Drive:
  File ID: 1a2b3c4d5e6f7g8h9i0j
  Name: backup-2026-04-21T12-00-00.zip
  Link: https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view

============================================================
[2026-04-21T12:00:15.678Z] BACKUP PROCESS COMPLETED (15.68s)
============================================================
```

## Manual Backup

Run a backup anytime:

```bash
docker-compose exec app npm run backup
```

Or locally (if outside Docker):

```bash
npm run backup
```

## Backup File Structure

Each backup contains:

```
backup-2026-04-21T12-00-00.zip
├── db-backup-2026-04-21T12-00-00.sql    # PostgreSQL database dump
└── uploads/                               # All uploaded files
    ├── file1.png
    ├── file2.jpg
    └── ...
```

## Disabling Backups

To disable automatic backups:

```bash
# In .env file
ENABLE_BACKUP=false
```

Then rebuild:

```bash
docker-compose down
docker-compose up --build
```

## Troubleshooting

### "Google Drive credentials not found"
- Ensure `.google-drive-credentials.json` is in the project root
- Run `npm run backup` to generate the token

### "Failed to connect to database"
- Ensure PostgreSQL container is running
- Check `docker-compose logs db`

### "Upload to Google Drive failed"
- Verify `.google-drive-token.json` exists
- Check that Google Drive API is enabled
- Re-authenticate by running `npm run backup`

### Backup taking too long
- Check database size: `docker-compose exec db du -sh /var/lib/postgresql/data`
- Check uploads folder size: `du -sh ./uploads`

### Gmail Alerts Not Sending

**"Gmail credentials not configured. Email notifications disabled."**
- Ensure `GMAIL_EMAIL` is set in `.env`
- Ensure `GMAIL_APP_PASSWORD` is set correctly (16-character app password, not your regular password)
- Check Gmail account has 2-Factor Authentication enabled

**"Gmail verification failed"**
- Verify the app password is correct
- Ensure Gmail SMTP access is enabled
- Check firewall/network if emails still don't send
- Test connection: `docker-compose logs app | grep Gmail`

**"Failed to send success/failure email"**
- Check `.env` file for typos in email addresses
- Verify SMTP credentials are correct
- Check email account hasn't disabled less secure apps
- Review logs: `docker-compose logs app | grep -i email`

### Microsoft Teams Alerts Not Sending

**"Failed to send Teams message"**
- Verify `MS_TEAMS_WEBHOOK_URL` is complete and correct
- Check the webhook hasn't expired (webhooks can expire if unused for 6 months)
- Test webhook manually with curl:
  ```bash
  curl -X POST -H 'Content-Type: application/json' \
    -d '{"text":"Test message"}' \
    YOUR_WEBHOOK_URL
  ```
- Check firewall allows outbound HTTPS to `outlook.webhook.office.com`

**Webhook URL validation**
- Webhook should start with: `https://outlook.webhook.office.com/webhookb2/`
- Should contain `/IncomingWebhook/`
- Should be a complete URL without truncation

### Testing Alerts Manually

Test Gmail alerts:
```bash
# Inside the container
docker-compose exec app node -e "
const { sendSuccessEmail } = require('./scripts/email-alerts');
sendSuccessEmail({
  fileName: 'test-backup.zip',
  fileSize: 1048576,
  duration: '5.23',
  googleDriveId: 'test-id',
  googleDriveName: 'test-backup.zip',
  googleDriveLink: 'https://drive.google.com/file/d/test-id'
});
"
```

Test Teams webhook:
```bash
# Outside the container
curl -X POST \
  -H 'Content-Type: application/json' \
  -d '{
    "@type":"MessageCard",
    "@context":"https://schema.org/extensions",
    "summary":"Test Alert",
    "themeColor":"28a745",
    "sections":[{"activityTitle":"Test Backup Alert","text":"This is a test notification"}]
  }' \
  YOUR_WEBHOOK_URL
```

## Best Practices

1. **Verify backups**: Check Google Drive regularly to ensure backups are being uploaded
2. **Test restore**: Periodically test restoring from backup to ensure data integrity
3. **Monitor space**: Google Drive free tier has 15GB limit
4. **Check logs**: Review logs after each backup to catch any issues early
5. **Update credentials**: Refresh Google Drive credentials periodically
6. **Monitor alerts**: Set up email filters for backup alerts
   - Create Gmail filter: from:`GMAIL_EMAIL` label "Backups"
   - Check Teams channel notifications are enabled
7. **Alert testing**: After setup, manually trigger a backup to test alerts:
   ```bash
   docker-compose exec app npm run backup
   ```
8. **Credential rotation**: Periodically update Google App Passwords and Teams webhooks

## API for Detailed Logs

Check Docker container logs:

```bash
# Last 100 lines
docker-compose logs --tail=100 app

# Follow logs in real-time
docker-compose logs -f app

# Export logs to file
docker-compose logs app > backup-logs.txt
```
