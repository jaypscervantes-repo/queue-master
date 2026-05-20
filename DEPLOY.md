# Deploy Queue Master to Railway

You'll get a public URL like `https://queue-master-production.up.railway.app` that works on any device.

**Free tier:** $5 of usage credit/month — easily enough for this app.

---

## Prerequisites

1. A **GitHub account** (free)
2. A **Railway account** (free) — sign up at https://railway.app with GitHub
3. **Git** installed on your machine: https://git-scm.com/download/win

---

## Step 1 — Push code to GitHub

Open PowerShell in the project folder:

```powershell
cd C:\Users\Jayps\Claude\badminton-queue

git init
git add .
git commit -m "Initial Queue Master commit"
```

Then create a new empty repo on GitHub (https://github.com/new), name it `queue-master`, **don't** add a README. Copy the commands GitHub shows you — they'll look like:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/queue-master.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Deploy on Railway

1. Go to https://railway.app/new
2. Click **Deploy from GitHub repo** → authorize Railway → pick `queue-master`
3. Railway will start building. It will fail the first time because there's no database yet — that's fine.

---

## Step 3 — Add MySQL database

In your Railway project dashboard:

1. Click **+ New** (top right) → **Database** → **Add MySQL**
2. Wait ~30 seconds for it to provision
3. Click your **app service** (not the MySQL one) → **Variables** tab
4. Click **+ New Variable** → **Add Reference** → pick the MySQL service → choose `DATABASE_URL`
   - This auto-links the app to the database

5. Add these additional variables manually:
   ```
   NODE_ENV = production
   NEXT_PUBLIC_APP_URL = https://${{RAILWAY_PUBLIC_DOMAIN}}
   ```

---

## Step 4 — Generate a public URL

1. Still in your app service → **Settings** tab
2. Under **Networking** → click **Generate Domain**
3. Railway gives you a URL like `https://queue-master-production-abc123.up.railway.app`
4. Trigger a rebuild: **Deployments** → click the **⋮** menu on the latest deployment → **Redeploy**

---

## Step 5 — Seed the database (optional)

Once the app is running, open your Railway project → **MySQL service** → **Data** tab. You'll see empty tables.

To add sample data, in your local terminal:

```powershell
# Get the DATABASE_URL from Railway (Variables tab → click eye icon)
# Put it in a temporary .env.production file:
echo 'DATABASE_URL="mysql://..."' > .env.production

# Run the seed against production
$env:DATABASE_URL = "mysql://..."   # paste real URL
npm run prisma:seed
```

Or just start adding players through the UI — that works too.

---

## Step 6 — Share the URL

Your app is live at the URL from Step 4. Share it with anyone:

- **Admin dashboard:** `https://YOUR-URL.up.railway.app/admin`
- **Player join (QR code points here):** `https://YOUR-URL.up.railway.app/join`

The QR code button in the admin header will auto-update to use your live URL.

---

## Custom domain (optional)

In Railway → Settings → Networking → **Custom Domain** → enter `queuemaster.com` (or whatever you own). Railway gives you a CNAME record to add at your domain registrar.

---

## Updating the app later

Any time you change code locally:

```powershell
git add .
git commit -m "what you changed"
git push
```

Railway automatically detects the push and redeploys. Takes ~2 minutes.

---

## Troubleshooting

**Build fails with "Cannot find module @prisma/client":**
The `postinstall` script handles this — make sure your push includes the latest `package.json`.

**"Internal server error" after deploy:**
Check **Deployments → View Logs**. Usually means `DATABASE_URL` isn't linked. Re-do Step 3.

**Socket.IO not connecting:**
Railway supports websockets by default. If logs show 502s on `/socket.io`, redeploy — the proxy sometimes needs a kick.

**Out of free credit:**
Railway charges ~$5/month for a small app like this. Upgrade to the Hobby plan ($5/month) for unlimited.
