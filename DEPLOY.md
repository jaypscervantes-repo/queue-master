# Deploy Queue Master — Cloud DB + Render or Fly.io

End result: a public URL like `https://queue-master.onrender.com`, free, with a cloud MySQL database that survives redeploys.

---

## Part 1 — Set up a free cloud MySQL database

You have two solid free options. **Aiven** is easier to set up, **TiDB Cloud** has a more generous free tier.

### Option A: TiDB Cloud (Recommended — free forever, 5GB)

TiDB is MySQL-compatible — Prisma talks to it the same way as MySQL.

1. Go to https://tidbcloud.com → sign up (free, no credit card)
2. Click **Create Cluster** → choose **Serverless** (the free tier)
3. Pick a region close to you, give it a name like `queue-master`
4. Click **Create** — takes ~30 seconds
5. Once ready, click **Connect** (top right)
   - Endpoint type: **Public**
   - Connect with: **General**
   - Click **Create password** → save the password somewhere safe
6. You'll see a connection string. Build your `DATABASE_URL` like this:

   ```
   mysql://USERNAME:PASSWORD@HOST:4000/test?sslaccept=strict
   ```

   - Username: from the dialog (looks like `xxxxxxx.root`)
   - Password: the one you just created
   - Host: from the dialog (looks like `gateway01.us-west-2.prod.aws.tidbcloud.com`)
   - Port: **4000** (not 3306!)
   - Database name: `test` (default — you can create a new one if you want)
   - Add `?sslaccept=strict` at the end (TiDB requires SSL)

   **Example final URL:**
   ```
   mysql://4Xa9hQzZeYR3xyz.root:MyPass123@gateway01.us-west-2.prod.aws.tidbcloud.com:4000/test?sslaccept=strict
   ```

7. **Test the connection locally** before deploying:
   ```powershell
   cd C:\Users\Jayps\Claude\badminton-queue
   # Edit .env and replace DATABASE_URL with the TiDB URL
   npm run prisma:push
   npm run prisma:seed
   ```

   If it succeeds, your cloud DB is ready. Skip to **Part 2**.

### Option B: Aiven (1 month free trial, then ~$15/mo)

Use this only if TiDB Cloud doesn't work in your region.

1. Go to https://aiven.io → sign up
2. **Create service** → **MySQL** → **Free trial plan** → pick a region → **Create**
3. Wait ~3 minutes for the service to provision
4. On the service page, find the **Connection URI** — copy it
5. Append `?sslaccept=strict` if it's not already there

---

## Part 2 — Push code to GitHub

If you haven't already:

```powershell
cd C:\Users\Jayps\Claude\badminton-queue

git init
git add .
git commit -m "Queue Master initial commit"
```

Create an empty repo on https://github.com/new — name it `queue-master`, **don't** check "add README".

Then:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/queue-master.git
git branch -M main
git push -u origin main
```

---

## Part 3 — Deploy

Pick one:

### 🟢 Option A: Render (Easiest)

1. Sign up at https://render.com using GitHub (free)
2. Click **New +** → **Blueprint**
3. Connect your `queue-master` repo → Render reads `render.yaml` automatically
4. It'll ask for environment variables:
   - `DATABASE_URL` → paste your TiDB/Aiven connection string from Part 1
   - `NEXT_PUBLIC_APP_URL` → leave blank for now, you'll fill it after
5. Click **Apply** — Render builds and deploys (5-8 minutes the first time)
6. When done, you'll see your URL at the top: `https://queue-master-xxxx.onrender.com`
7. Go back to **Environment** → set `NEXT_PUBLIC_APP_URL` to that URL → **Save** (triggers a redeploy)

**Free tier caveat:** The service sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds to wake up. After that it's instant. To keep it always-on, upgrade to the $7/mo Starter plan.

### 🔵 Option B: Fly.io (No sleep, more setup)

1. Install Fly CLI:
   ```powershell
   iwr https://fly.io/install.ps1 -useb | iex
   ```
   Then close and reopen your terminal.

2. Sign up & log in:
   ```powershell
   fly auth signup    # or `fly auth login` if you have an account
   ```

3. From the project folder:
   ```powershell
   cd C:\Users\Jayps\Claude\badminton-queue

   # Launch — accept the existing fly.toml when prompted, say "no" to creating Postgres
   fly launch --no-deploy

   # Set environment variables
   fly secrets set DATABASE_URL="mysql://...your TiDB URL..."
   fly secrets set NEXT_PUBLIC_APP_URL="https://queue-master.fly.dev"

   # Deploy
   fly deploy
   ```

4. When complete: `fly open` opens your live site.

Fly.io free tier gives you 3 small VMs free forever — enough for Queue Master to never sleep.

---

## Part 4 — Seed sample data (optional)

Already done if you ran `npm run prisma:seed` in Part 1 against the cloud DB. Otherwise, just start adding players through the UI — works fine empty.

---

## Updating later

```powershell
git add .
git commit -m "what changed"
git push
```

Both Render and Fly.io auto-redeploy on push (Render automatically, Fly.io if you've set up GitHub Actions — otherwise run `fly deploy` manually).

---

## Cost summary

| Service | Free tier | Notes |
|---------|-----------|-------|
| TiDB Cloud | Free forever | 5GB storage, MySQL-compatible |
| Aiven MySQL | Free for 1 month | Then ~$15/mo |
| Render web service | Free | Sleeps after 15 min idle |
| Fly.io | Free | 3 small VMs, no sleep |
| GitHub | Free | Unlimited public repos |

**Recommended free setup:** TiDB Cloud + Fly.io = always-on, free, professional-grade.

**Easiest setup:** TiDB Cloud + Render = 10 minutes to live URL, but sleeps when idle.

---

## Custom domain

Both hosts let you add a custom domain for free if you own one:

- **Render** → Service → **Settings** → **Custom Domain** → enter `queue.yourname.com` → add the CNAME they show at your registrar
- **Fly.io** → `fly certs create queue.yourname.com` → follow the DNS instructions
