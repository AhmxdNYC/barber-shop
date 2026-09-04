# Self-hosting on Vultr

One small VPS runs everything: the Next.js app, Postgres, and a reverse proxy
that handles HTTPS on its own. Cheaper than managed hosting, and unlike
Vercel's free tier there is no restriction on commercial use.

## What it costs

| Item | Cost |
|---|---|
| Vultr Cloud Compute, 1 vCPU / 2 GB | ~$12/mo |
| Vultr Cloud Compute, 1 vCPU / 1 GB | ~$6/mo (needs swap, see below) |
| Postgres | $0 — runs on the same box |
| HTTPS certificates | $0 — Caddy and Let's Encrypt |
| Domain | ~$12/yr |
| **Total** | **~$6–12/mo** |

Compare: Vercel Pro is $20/mo, and its free Hobby tier forbids commercial
use once the shop takes real bookings.

**On the 1 GB box:** Next.js builds are memory-hungry and will be killed
mid-build on 1 GB. Two ways round it — add swap (below), or let GitHub
Actions build the image and have the server only pull and run it. Swap is
simpler; if builds still fail, take the 2 GB plan. The extra $6/mo is worth
less than an evening of debugging an OOM.

## Costs this does *not* remove

Be honest about the trade. Managed hosting charges more because it does
these for you:

- **You patch the server.** Unattended-upgrades helps, but it is yours now.
- **You own the backups.** A barbershop losing its appointment history is
  real damage to a real business. `scripts/backup-db.sh` is not optional.
- **If the box dies, the site is down** until you notice and fix it. No
  automatic failover.
- **No preview deployments** per branch.

## One-time server setup

### 1. Create the instance

Vultr → Deploy → Cloud Compute → Ubuntu 24.04, 2 GB. Add your SSH key during
creation rather than using a root password.

### 2. Point DNS at it

At your registrar, two A records to the instance's IPv4:

    @      ->  <server ip>
    www    ->  <server ip>

Wait for propagation before starting Caddy — it needs the domain resolving to
issue a certificate.

### 3. Harden and install Docker

```bash
ssh root@<server-ip>

adduser deploy && usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Password logins off, root login off.
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/'               /etc/ssh/sshd_config
systemctl restart ssh

ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable

curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy

apt update && apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

### 4. Swap, if you took the 1 GB plan

```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile
mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 5. Clone and configure

```bash
ssh deploy@<server-ip>
sudo mkdir -p /opt/barbershop && sudo chown deploy:deploy /opt/barbershop
git clone https://github.com/AhmxdNYC/barber-shop.git /opt/barbershop
cd /opt/barbershop

cp .env.example .env
openssl rand -base64 32          # AUTH_SECRET
openssl rand -base64 24          # POSTGRES_PASSWORD
nano .env                        # fill in both, plus SITE_DOMAIN
```

`.env` is gitignored and must never be committed — it holds the database
password and the session signing secret.

### 6. Start it

```bash
docker compose up -d --build
docker compose run --rm app npx prisma migrate deploy
docker compose logs -f caddy     # watch the certificate get issued
```

### 7. Nightly backups

```bash
sudo crontab -e
# 15 3 * * * /opt/barbershop/scripts/backup-db.sh >> /var/log/db-backup.log 2>&1
```

Then **test the restore**, because a backup nobody has restored is a guess:

```bash
docker compose exec -T db pg_restore -U barbershop -d barbershop_test \
  --clean --if-exists < backups/<file>.dump
```

## Automatic deploys

`.github/workflows/deploy.yml` runs lint, tests and the QR check, then
deploys over SSH only if they pass. Add three repository secrets under
Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `VULTR_HOST` | the server's IP |
| `VULTR_USER` | `deploy` |
| `VULTR_SSH_KEY` | a private key whose public half is in `deploy`'s `authorized_keys` |

Generate a deploy-specific key rather than reusing your personal one:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/barbershop_deploy -C "github-actions"
ssh-copy-id -i ~/.ssh/barbershop_deploy.pub deploy@<server-ip>
cat ~/.ssh/barbershop_deploy      # this is VULTR_SSH_KEY
```

## Migrations

`prisma migrate deploy` runs against the live database after the new image is
built. Migrations must therefore be backward compatible with the currently
running container — add columns before writing to them, and drop them in a
later release, never in the same one.

## Everyday commands

```bash
docker compose logs -f app          # tail the app
docker compose restart app          # restart just the app
docker compose exec db psql -U barbershop   # open a shell on the database
docker compose down                 # stop everything (data survives)
df -h && free -h                    # disk and memory
```

## Rolling back

```bash
cd /opt/barbershop
git log --oneline -5
git checkout <previous-sha>
docker compose up -d --build
```

If a migration is the problem, restore the most recent dump first — schema
changes are not undone by checking out old code.
