# 🚀 PulseLink Production Hosting Guide

This guide outlines step-by-step deployment options for hosting your **URL Shortener + QR Code Studio** live on the internet with a public domain and SSL (HTTPS).

---

## Option 1: Render.com (Recommended Free Hosting)

[Render.com](https://render.com) provides free automatic web application hosting, SSL certificates, and managed databases.

### Steps:
1. Push your code repository to **GitHub** or **GitLab**.
2. Log into [Render.com](https://dashboard.render.com/) and click **New +** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the following parameters:
   - **Environment**: `Node`
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `node backend/server.js`
5. Click **Create Web Service**.
6. Render will assign you a live HTTPS domain (e.g. `https://pulselink.onrender.com`).

---

## Option 2: Instant Public Tunneling (ngrok / Cloudflare Tunnel)

To host directly from your current machine and share a live public link instantly without signing up for cloud hosts:

### Using ngrok:
1. Download [ngrok](https://ngrok.com/download) or install via terminal.
2. Run:
   ```bash
   ngrok http 8000
   ```
3. Copy the public forwarding URL (e.g., `https://a1b2c3d4.ngrok-free.app`).
4. Any user anywhere in the world can open that URL to use your shortener and scan QR codes!

---

## Option 3: Docker & Docker Compose (Self-Hosted VPS)

Deploy on any Cloud Server (AWS EC2, DigitalOcean Droplet, Linode, Hetzner) using Docker:

### Steps:
1. SSH into your VPS.
2. Clone your repository:
   ```bash
   git clone <your-repo-url>
   cd elegant-hubble
   ```
3. Launch all containers (Express App + Redis + PostgreSQL):
   ```bash
   docker-compose up -d --build
   ```
4. Configure NGINX reverse proxy with Certbot for HTTPS SSL encryption.

---

## Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `PORT` | Web server port | `3000` or `8000` |
| `DATABASE_URL` | PostgreSQL connection URI | `postgresql://postgres:postgres@localhost:5432/urlshortener` |
| `REDIS_HOST` | Redis memory cache host | `127.0.0.1` |
| `REDIS_PORT` | Redis memory cache port | `6379` |
| `HOST_URL` | Public production domain | `https://your-domain.com` |
