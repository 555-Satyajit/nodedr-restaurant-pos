# Multi-Tenant Cloud Deployment Guide (KitchFlow)

This document provides the operational guide for deploying and running **KitchFlow** for multiple restaurant clients on a single Linux VPS (e.g. Hostinger KVM 2: 2 vCPU, 8 GB RAM, 100 GB NVMe).

---

## 1. Architecture Overview: Isolated 3-Container Pods

Rather than running complex multi-tenant routing code or sharing databases across competitors, each restaurant client is provisioned as an isolated **3-container stack** behind a shared **Caddy reverse proxy**:

```
                              [ Incoming HTTPS Traffic ]
                                          │
                                 ┌────────▼────────┐
                                 │      Caddy      │ (Automatic SSL / Reverse Proxy)
                                 │ (Ports 80, 443) │
                                 └────────┬────────┘
                                          │ (Docker Network: kitchflow-gateway)
            ┌─────────────────────────────┼─────────────────────────────┐
            ▼                             ▼                             ▼
┌───────────────────────┐     ┌───────────────────────┐     ┌───────────────────────┐
│ Client 1: royalbiryani│     │  Client 2: chaishai   │     │ Client 3: pizzahouse  │
│ • Web (Next.js)       │     │ • Web (Next.js)       │     │ • Web (Next.js)       │
│ • Backend (NestJS)    │     │ • Backend (NestJS)    │     │ • Backend (NestJS)    │
│ • Postgres (Dedicated)│     │ • Postgres (Dedicated)│     │ • Postgres (Dedicated)│
└───────────────────────┘     └───────────────────────┘     └───────────────────────┘
```

### Why This Architecture?
1. **Low Resource Footprint:** Each 3-container stack consumes only ~230 MB of RAM total (PostgreSQL: ~30 MB, Backend: ~90 MB, Web: ~110 MB).
2. **High Capacity on KVM 2:** An 8 GB VPS comfortably supports **15 to 25 full client stacks** with ample headroom for dinner-rush traffic spikes.
3. **Zero Cross-Data Leaks:** Separate database instances guarantee that one restaurant can never see another's orders, revenue, or customer data.
4. **Instant Client Suspension:** If an invoice is unpaid, suspend that client in 1 second (`docker compose -f clients/client1/docker-compose.yml stop`) without affecting any other restaurant.
5. **Zero Host Port Clashes:** Containers communicate over internal Docker networks. No host ports (like `1995:3000`) need to be mapped.

---

## 2. Server Setup (Run Once on VPS)

### 2.1 Enable NVMe Swap (Safety buffer for traffic spikes)
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2.2 Install Docker & Caddy
```bash
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

### 2.3 Create Shared Gateway Network
```bash
docker network create kitchflow-gateway
```

### 2.4 Recommended VPS Directory Structure
```text
/home/kitchflow/
├── caddy/
│   └── Caddyfile
├── clients/
│   ├── client-template/
│   │   ├── .env.example
│   │   └── docker-compose.yml
│   ├── client1/
│   │   ├── .env
│   │   └── docker-compose.yml
│   └── client2/
│       ├── .env
│       └── docker-compose.yml
├── scripts/
│   ├── provision-client.sh
│   └── backup-all.sh
```

---

## 3. Client Template Configuration

### 3.1 Client Template `docker-compose.yml`
Save at `/home/kitchflow/clients/client-template/docker-compose.yml`:

```yaml
version: "3.8"

networks:
  kitchflow-gateway:
    external: true
  internal:
    driver: bridge

volumes:
  pg_data:
  uploads_data:

services:
  postgres:
    image: postgres:16-alpine
    container_name: ${CLIENT_ID}-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: kitchflow
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: kitchflow_${CLIENT_ID}
    volumes:
      - pg_data:/var/lib/postgresql/data
    networks:
      - internal
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kitchflow"]
      interval: 5s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: "0.40"
          memory: 200M

  backend:
    image: ghcr.io/raktim94/nodedr-restaurant-pos-backend:1.0.0
    container_name: ${CLIENT_ID}-backend
    restart: unless-stopped
    environment:
      DATABASE_URL: "postgresql://kitchflow:${POSTGRES_PASSWORD}@postgres:5432/kitchflow_${CLIENT_ID}"
      JWT_SECRET: ${JWT_SECRET}
      PORT: "4000"
      CORS_ORIGIN: "https://${DOMAIN}"
      COOKIE_SECURE: "true"
      UPLOADS_DIR: "/data/uploads"
    volumes:
      - uploads_data:/data/uploads
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - internal
      - kitchflow-gateway
    deploy:
      resources:
        limits:
          cpus: "0.35"
          memory: 250M

  web:
    image: ghcr.io/raktim94/nodedr-restaurant-pos-web:1.0.0
    container_name: ${CLIENT_ID}-web
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: "3000"
    depends_on:
      - backend
    networks:
      - internal
      - kitchflow-gateway
    deploy:
      resources:
        limits:
          cpus: "0.25"
          memory: 200M
```

### 3.2 Client Template `.env.example`
Save at `/home/kitchflow/clients/client-template/.env.example`:

```env
CLIENT_ID=clientname
DOMAIN=clientname.kitchflow.in
POSTGRES_PASSWORD=kitchflow_db_pass_random_secure
JWT_SECRET=kitchflow_jwt_secret_random_secure
```

---

## 4. Central Caddy Configuration (`/etc/caddy/Caddyfile`)

Caddy automatically handles Let's Encrypt TLS certificates:

```caddyfile
# Client 1: Royal Biryani
royalbiryani.kitchflow.in {
    reverse_proxy royalbiryani-web:3000
}

# Client 2: Chai Shai
chaishai.kitchflow.in {
    reverse_proxy chaishai-web:3000
}
```

After updating `/etc/caddy/Caddyfile`:
```bash
sudo systemctl reload caddy
```

---

## 5. Automated 30-Second Client Provisioning Script

Create `/home/kitchflow/scripts/provision-client.sh`:

```bash
#!/bin/bash
set -e

CLIENT_ID=$1
DOMAIN=$2

if [ -z "$CLIENT_ID" ] || [ -z "$DOMAIN" ]; then
  echo "Usage: ./provision-client.sh <client-slug> <domain>"
  echo "Example: ./provision-client.sh royalbiryani royalbiryani.kitchflow.in"
  exit 1
fi

CLIENT_DIR="/home/kitchflow/clients/${CLIENT_ID}"

if [ -d "$CLIENT_DIR" ]; then
  echo "Error: Client directory already exists: $CLIENT_DIR"
  exit 1
fi

echo "==> Creating client directory: $CLIENT_DIR"
cp -r /home/kitchflow/clients/client-template "$CLIENT_DIR"

DB_PASS=$(openssl rand -hex 16)
JWT_SEC=$(openssl rand -hex 32)

cat << EOF > "$CLIENT_DIR/.env"
CLIENT_ID=${CLIENT_ID}
DOMAIN=${DOMAIN}
POSTGRES_PASSWORD=${DB_PASS}
JWT_SECRET=${JWT_SEC}
EOF

echo "==> Starting client containers..."
docker compose -f "$CLIENT_DIR/docker-compose.yml" up -d

echo "==> Adding Caddy routing..."
cat << EOF >> /etc/caddy/Caddyfile

${DOMAIN} {
    reverse_proxy ${CLIENT_ID}-web:3000
}
EOF

sudo systemctl reload caddy

echo "==> Successfully provisioned ${CLIENT_ID} at https://${DOMAIN}"
```
Make executable:
```bash
chmod +x /home/kitchflow/scripts/provision-client.sh
```

---

## 6. Billing & Subscription Enforcement (Operational SOP)

### When a Client Pays:
```bash
./scripts/provision-client.sh clientname clientname.kitchflow.in
```

### When an Invoice is Overdue (Immediate Lockout):
```bash
docker compose -f /home/kitchflow/clients/clientname/docker-compose.yml stop web backend
```
*Visiting their URL will show a connection error or a Caddy 502 Bad Gateway page.*

### When the Client Renews:
```bash
docker compose -f /home/kitchflow/clients/clientname/docker-compose.yml start
```
*Everything is back online in 2 seconds with all data preserved.*

### When a Client Leaves / Offboarding:
1. Export their final database:
   ```bash
   docker exec -t clientname-postgres pg_dump -U kitchflow kitchflow_clientname | gzip > /home/kitchflow/backups/clientname-final.sql.gz
   ```
2. Remove their stack:
   ```bash
   docker compose -f /home/kitchflow/clients/clientname/docker-compose.yml down -v
   rm -rf /home/kitchflow/clients/clientname
   ```
3. Remove their block from `/etc/caddy/Caddyfile` and run `sudo systemctl reload caddy`.
