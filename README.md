# Time Organizer: setup

Three parts: a Google Sheet (permanent record), a web address for the app, and your phone.

## 1. Google Sheet (use a NEW blank sheet)
Use a new spreadsheet, not the one your ESP32 timer logs to. The ESP32 expects different tabs and columns.

1. sheets.new, name it "Time Organizer".
2. Extensions > Apps Script. Delete everything, paste all of `apps-script/Code.gs`, save.
3. In the function dropdown pick **setup**, press **Run**, approve the permissions
   (Advanced > Go to project (unsafe) is normal for your own script).
   The Log, Projects and Steps tabs appear in the sheet.
4. Deploy > New deployment > gear icon > **Web app**.
   Execute as: **Me**. Who has access: **Anyone**. Deploy.
5. Copy the Web app URL (ends in `/exec`).

Tabs:
- **Log**: Timestamp | Type | Project | Step | Minutes | Focus | Step done | Description | Notes | ID
- **Projects**: Project | Type | Status (active / paused / done)
- **Steps**: Type | Step | Project (blank = every project of that type)

You can edit Projects and Steps right in the sheet (add a step, set a project to done) and the app picks it up on its next sync.

## 2. Host the app (GitHub Pages)
1. github.com > New repository, e.g. `time-organizer`, Public.
2. Add file > Upload files: `index.html`, `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`. (Not `apps-script/` and not this README.)
3. Settings > Pages > Source: Deploy from a branch > `main` / root > Save.
4. After about a minute: `https://<your-username>.github.io/time-organizer/`

Your Apps Script URL is not in the repo. You paste it into the app on your phone.

## 3. Phone
1. Open the GitHub Pages address in Safari > Share > **Add to Home Screen**.
2. Open the app from the new icon (not Safari), Settings > paste the `/exec` URL > **Sync now**.
3. Bring over your old data: in the old app Settings > Copy backup. In the new app Settings > paste into "Restore backup" > Merge into app. Old sessions land under type "General". Do this inside the home-screen app, because Safari and the home-screen icon keep separate data on iPhone.

## Updating the app later
Replace `index.html` in the repo and bump `VERSION` in `sw.js` (e.g. `tod-v4`).
After changing Code.gs: Deploy > Manage deployments > pencil > New version > Deploy.

## Good to know
- Log and Stats show sessions recorded on this device. The sheet holds everything from every device.
- Removing or renaming a type, step or project in the app does not change the sheet. Delete or edit the row there as well.
- If the sheet doesn't confirm an upload, the session stays marked pending and retries automatically.
