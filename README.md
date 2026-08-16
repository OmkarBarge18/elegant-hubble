# 🚀 Elegant Hubble | Fast URL Shortener & QR Code Studio

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/Redis-7.x-DC382D?style=for-the-badge&logo=redis" alt="Redis" />
  <img src="https://img.shields.io/badge/PostgreSQL-16.x-4169E1?style=for-the-badge&logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
</p>

**Elegant Hubble** is a modern, high-performance, single-page URL Shortener & Scannable QR Code Studio built with a dark glassmorphism aesthetic. It features real-time custom slug sanitization, local network (LAN) multi-device access, file-backed database persistence, and vector/raster QR exports.

---

## ✨ Key Features

- ⚡ **Instant HTTP 302 Redirections**: High-speed lookup engine for compact Base62 or custom keyword slugs.
- 📱 **Multi-Device & Local Network (Wi-Fi) Access**: Automatically detects your host computer's Wi-Fi IP address (`http://192.168.1.x:8000`) so smartphones, tablets, and laptops on the same network can access short links and scan QR codes seamlessly.
- 🎨 **Customizable Scannable QR Code Studio**:
  - Live HTML5 Canvas rendering.
  - Custom Foreground & Background color pickers.
  - Quiet Zone margin sliders.
  - One-click Preset Themes (*Classic Dark, Cyber Neon, Emerald, Sunset*).
  - High-Resolution **PNG** and Vector **SVG** downloads.
- 💾 **Persistent Disk Storage (`links_db.json`)**: Automatic file-backed JSON database ensures custom slugs and short links remain active permanently across server restarts.
- 🛡️ **Robust Custom Slug Sanitization**: Smart URL segment parsing handles any user formatting (`my-slug`, `pulse.ly/my-slug`, `/my-slug/`) with case-insensitive 302 matching.
- 📱 **100% Mobile Responsive Design**: Modern UI featuring fluid clamp typography (`clamp()`), glassmorphism cards, and touch-optimized input targets for all devices.
- 🐳 **Docker & Production Ready**: Pre-configured `Dockerfile`, `docker-compose.yml`, and `Procfile` for Render, Railway, Vercel, or cloud VPS deployment.

---

## 📁 Project Structure

```text
elegant-hubble/
├── backend/               # Node.js Express Microservice
│   ├── config/            # PostgreSQL (pg) & Redis (ioredis) Connections
│   ├── controllers/       # URL Shortener, QR & Analytics Controllers
│   ├── database/          # SQL Database Schemas
│   ├── middleware/        # Rate Limiting & Validation
│   ├── package.json
│   └── server.js
├── public/                # Single-Page Frontend Application
│   ├── app.js             # Client Engine & QR Studio Logic
│   ├── index.html         # Glassmorphism HTML5 Layout
│   ├── styles.css         # CSS Tokens, Clamp Typography & Mobile Breakpoints
│   └── qrcode.min.js      # Client-side Canvas QR Generator Engine
├── Dockerfile             # Multi-stage Docker Container Build File
├── docker-compose.yml     # Multi-container Orchestration (Express + Redis + Postgres)
├── links_db.json          # File-backed Persistent Storage Database
├── Procfile               # Platform Hosting Entrypoint
├── server.py              # Lightweight Zero-Dependency Python Server Runner
└── README.md              # Project Documentation
```

---

## 🚀 Quick Start & Local Setup

### Option A: Lightweight Python Runner (Zero Dependencies)

Run the application instantly without installing external packages:

```bash
# Clone the repository
git clone https://github.com/OmkarBarge18/elegant-hubble.git
cd elegant-hubble

# Launch Python Server
python server.py
```

- **Host PC Browser**: [http://localhost:8000](http://localhost:8000)
- **Local Network / Mobile Wi-Fi**: `http://<your-lan-ip>:8000`

---

### Option B: Node.js + Express Backend

Run the full Node.js backend with Express:

```bash
cd backend
npm install
npm start
```

- **Express Server**: [http://localhost:3000](http://localhost:3000)

---

### Option C: Docker Compose (Full Stack)

Orchestrate Node.js Express, Redis LRU Cache, and PostgreSQL in Docker containers:

```bash
docker-compose up -d --build
```

- **Application URL**: [http://localhost:3000](http://localhost:3000)

---

## 📡 API Reference

### 1. Shorten URL Endpoint

**`POST /api/shorten`**

Request Body:

```json
{
  "originalUrl": "https://github.com/expressjs/express",
  "customSlug": "express-repo"
}
```

Response (`201 Created`):

```json
{
  "success": true,
  "data": {
    "id": "u_860",
    "slug": "express-repo",
    "shortUrl": "http://192.168.1.107:8000/express-repo",
    "originalUrl": "https://github.com/expressjs/express",
    "title": "github.com",
    "isCustom": true,
    "createdAt": "2026-08-15"
  }
}
```

---

### 2. Redirection Endpoint

**`GET /:slug`**

Issues an immediate **HTTP 302 Found** redirect to the original target web address.

---

### 3. System Network Info

**`GET /api/system/network-info`**

Response (`200 OK`):

```json
{
  "lanIp": "192.168.1.107",
  "port": 8000,
  "networkUrl": "http://192.168.1.107:8000"
}
```

---

### 4. Health Check

**`GET /api/system/health`**

Response (`200 OK`):

```json
{
  "status": "HEALTHY",
  "uptimeSeconds": 3600,
  "lanIp": "192.168.1.107",
  "services": {
    "server": { "status": "ONLINE", "port": 8000 },
    "redisCache": { "status": "SIMULATED_REDIS_LRU", "hitRatioPercent": 96.4 },
    "postgresDb": { "status": "CONNECTED" }
  }
}
```

---

## ☁️ Cloud Deployment Options

### Deployment to Render.com
1. Push your repository to **GitHub**.
2. Go to [Render Dashboard](https://dashboard.render.com/) -> **New Web Service**.
3. Set Build Command: `cd backend && npm install`
4. Set Start Command: `node backend/server.js`
5. Render will provision your live HTTPS URL.

### Instant Tunneling via ngrok
Share a live public link directly from your machine:

```bash
ngrok http 8000
```

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for details.
