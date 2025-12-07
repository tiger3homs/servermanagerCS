# GitHub Actions Setup Guide

## Configure Secrets for Workflow

The GitHub Actions workflow requires your Supabase credentials to be stored as secrets.

### Steps:

1. **Go to your repository**
   - Navigate to: `Settings` → `Secrets and variables` → `Actions`

2. **Add these secrets:**
   - `SUPABASE_URL`: Your Supabase project URL
     - Get from: Supabase Dashboard → Settings → API → Project URL
   - `SUPABASE_KEY`: Your Supabase anon key
     - Get from: Supabase Dashboard → Settings → API → anon (public) key

### Example values:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Workflow Configuration

The workflow is set to:
- **Schedule**: Run daily at 2 AM UTC
- **Manual trigger**: Run anytime from Actions tab
- **On push**: Run when playlistSync.js or package.json changes

### To change the schedule:

Edit `.github/workflows/playlist-sync.yml` and change the cron expression:

```yaml
schedule:
  # Run every 6 hours
  - cron: '0 */6 * * *'
  
  # Run every Sunday at midnight
  - cron: '0 0 * * 0'
```

### Cron Syntax:
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

Common schedules:
- Every hour: `0 * * * *`
- Every 6 hours: `0 */6 * * *`
- Daily at 2 AM: `0 2 * * *`
- Every Monday: `0 0 * * 1`

## Monitoring

View workflow runs:
1. Go to your repository
2. Click **Actions** tab
3. Select **Playlist Sync to Supabase**
4. Check run history and logs

## Troubleshooting

### Workflow fails with "secret not found"
- Ensure secrets are added to repository (not organization)
- Secret names must match exactly (case-sensitive)
- After adding secrets, the workflow will work on next trigger

### Workflow times out
- Playlist might be too large
- Check internet speed
- Increase timeout in workflow file if needed

### Need to run manually
1. Go to Actions tab
2. Select "Playlist Sync to Supabase"
3. Click "Run workflow" button
4. Choose branch (main)
5. Click "Run workflow"
