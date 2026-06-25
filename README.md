# Cantilever Replacement Tracker

Cantilever Replacement Tracker is a mobile-first Progressive Web App for warehouse and distribution center maintenance teams. It helps associates record damaged cantilever racking arms, monitor questionable locations, document completed replacements, and review repeat damage patterns by location, aisle, reason, month, quarter, and year.

The app is designed as a field tool: fast to open from a web link, installable on a phone home screen, readable in dark mode, and simple enough to use while walking racking aisles.

## What The App Does

- Tracks damaged cantilever arms that need replacement
- Tracks locations that should be monitored but are not replaced yet
- Records completed replacements with repair date, repaired by, and action taken
- Stores full rack locations such as `2H-108-50`
- Allows optional aisle, section/bay, and level fields for better filtering
- Shows open damaged arms, monitored locations, and replacement totals
- Highlights repeat damage locations and high-repeat attention items
- Provides search and history for old problem locations
- Exports all records to CSV
- Imports backup CSV files
- Runs as a PWA with offline app shell support

## Cantilever Tracking Workflow

1. An associate walks the racking aisles.
2. The associate finds a damaged, bent, impacted, or questionable cantilever arm.
3. The associate opens the app and taps **New Entry**.
4. The associate enters the full location, such as `2H-108-50`.
5. If available, the associate also enters aisle, section/bay, level, side, reason, priority, notes, and a photo.
6. If the arm needs work, the status stays **Damaged**.
7. If the arm should only be watched, the status is set to **Monitor**.
8. Damaged and Monitor records stay in **Open / Monitor Items**.
9. When the arm is replaced, the associate uses **Mark Replaced** or edits the entry.
10. The associate enters Date Repaired, Repaired By, and Repair Action Taken.
11. Replaced records move to **Completed Replacements**.
12. Supervisors can review repeat locations, repeat aisles, top reasons, and replacement trends in **Analytics**.

## Local Storage Warning

Version 1 saves records in browser `localStorage`.

This means data is saved only on the device and browser being used. It does not automatically sync between associates, phones, tablets, computers, or browsers. Clearing browser data, using a different browser, losing the device, or resetting the phone may remove the local records.

Use CSV export regularly if Version 1 is used for testing or pilot tracking.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the local app:

```bash
npm run dev
```

Open the local URL shown in the terminal, usually:

```text
http://localhost:5173
```

## Build

Create a production build:

```bash
npm run build
```

The production files are created in:

```text
dist/
```

## Deploy To Netlify

1. Push this project to a Git repository.
2. Sign in to Netlify.
3. Choose **Add new site**.
4. Choose **Import an existing project**.
5. Connect the repository.
6. Set the build command:

```bash
npm run build
```

7. Set the publish directory:

```text
dist
```

8. Deploy the site.
9. Open the Netlify URL on a phone or desktop browser.

Use HTTPS so service worker and PWA install features work correctly.

## Deploy To GitHub Pages

1. Push this project to GitHub.
2. Run the production build:

```bash
npm run build
```

3. Publish the `dist/` folder using GitHub Pages or a GitHub Actions Pages workflow.
4. For best PWA behavior, host the app at the root of the Pages site.

If the app must run under a subpath, update the absolute paths for `/assets`, `/manifest.json`, and `/service-worker.js` before publishing.

## Install On iPhone

1. Open the hosted app URL in Safari.
2. Tap the Share button.
3. Tap **Add to Home Screen**.
4. Confirm the app name.
5. Tap **Add**.

The app will appear on the iPhone home screen like an installed app.

## Install On Android

1. Open the hosted app URL in Chrome.
2. Tap the browser menu.
3. Tap **Install app** or **Add to Home screen**.
4. Confirm the install.

The app will appear on the Android home screen or app drawer.

## Export Cantilever Records

1. Open **Settings**.
2. Tap **Export CSV**.
3. The app downloads a CSV file containing all cantilever tracking records.
4. Store the CSV in an approved backup location if company policy allows it.

CSV export is important in Version 1 because localStorage does not sync between devices.

## Import Backup CSV Files

1. Open **Settings**.
2. Tap **Import CSV**.
3. Select a previously exported CSV file.
4. The imported records are added to the current browser data.

Before importing, confirm that the CSV came from a trusted source and is allowed under company data handling rules.

## Future Microsoft Integration

The app is structured with a separate data service layer in `src/data/storageService.ts`. Version 1 uses localStorage, but a future approved version could replace that service with Microsoft or Azure services.

Possible future integrations:

- **Microsoft Lists**: store shared cantilever replacement records in a central list with fields for location, aisle, condition, reason, priority, repair date, repaired by, and notes.
- **SharePoint**: host shared maintenance records, app documentation, or site-level permissions.
- **OneDrive or SharePoint document libraries**: store uploaded photos as files instead of local browser data.
- **Power Automate**: send alerts for Critical entries, repeat damage thresholds, approvals, or shift handoff workflows.
- **Microsoft Teams**: post notifications to a maintenance channel when high-priority damage is reported or a repeat location needs attention.
- **Azure**: provide a more advanced backend with authentication, role-based access, APIs, reporting, and long-term storage.

## Company Approval Considerations

Before using real internal work data, confirm approval with the appropriate company teams. Depending on workplace policy, this may include:

- Maintenance leadership
- Warehouse or operations leadership
- IT
- Cybersecurity
- Data governance
- Safety or compliance
- Records retention owners

Approval may be needed for:

- Storing real rack damage records
- Uploading or storing workplace photos
- Using associate names
- Exporting records to CSV
- Saving files to personal devices
- Hosting the app on an external service such as Netlify or GitHub Pages
- Connecting to Microsoft 365, SharePoint, Teams, Power Automate, or Azure

For production use, a shared approved backend is recommended so records are backed up, access-controlled, and available to the whole maintenance team.
