# 🗂 JiraHub — Project Management App

A **Jira-inspired** project management application built with **Node.js**, **Express.js**, **MongoDB**, **Docker**, and **Kubernetes**.

---

## ✨ Features

- 🔐 **JWT Authentication** — Register & Login
- 📋 **Projects** — Create, view, manage projects with unique keys
- 🐛 **Issues** — Bug / Task / Story / Epic with priority, status, assignee
- 🗂 **Kanban Board** — Drag & drop issues across columns (To Do → In Progress → In Review → Done)
- 📊 **Dashboard Stats** — Issue counts by status and priority
- 🔍 **Filters** — Filter issues by type, priority, and assignee
- 🐳 **Dockerized** — Single command startup
- ☸️ **Kubernetes Ready** — Full K8s manifests

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js 20, Express.js 4 |
| Database | MongoDB 7, Mongoose 8 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Frontend | Vanilla HTML / CSS / JavaScript |
| Web Server | Nginx (Alpine) |
| Containerization | Docker + Docker Compose |
| Orchestration | Kubernetes (K8s) |

---

## 📁 Project Structure

```
jirahub/
├── backend/
│   ├── src/
│   │   ├── config/db.js          # MongoDB connection
│   │   ├── controllers/          # Route handlers
│   │   ├── middleware/auth.js    # JWT middleware
│   │   ├── models/               # Mongoose schemas
│   │   ├── routes/               # Express routers
│   │   └── app.js                # Entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── css/style.css             # Dark theme design system
│   ├── js/                       # api.js, auth.js, dashboard.js, board.js
│   ├── index.html                # Login / Register
│   ├── dashboard.html            # Projects dashboard
│   ├── board.html                # Kanban board
│   ├── nginx.conf                # Nginx reverse proxy config
│   └── Dockerfile
├── k8s/
│   ├── namespace.yaml
│   ├── mongodb-deployment.yaml   # MongoDB + PVC
│   ├── backend-deployment.yaml   # API + ConfigMap + Secret
│   ├── frontend-deployment.yaml  # Nginx frontend
│   └── ingress.yaml              # Ingress routing
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone or navigate to the project
cd jirahub

# Copy env example (optional, compose has defaults)
cp backend/.env.example backend/.env

# Start all services
docker-compose up --build

# App will be available at:
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# MongoDB: localhost:27017
```

### Option 2: Local Development

**Prerequisites:** Node.js 18+, MongoDB running locally

```bash
# Install backend dependencies
cd backend
npm install

# Create .env file
cp .env.example .env
# Edit .env: set MONGO_URI=mongodb://localhost:27017/jirahub

# Start backend
npm run dev

# Open frontend directly in browser
# Open frontend/index.html (note: API calls go to /api, use a local server)
# Use a simple server like: npx serve frontend -p 3000
```

---

## ☸️ Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (Minikube / kind / cloud)
- `kubectl` configured
- Docker images built and available

### Step 1: Build Docker Images

```bash
# Build backend image
docker build -t jirahub-backend:latest ./backend

# Build frontend image
docker build -t jirahub-frontend:latest ./frontend

# For Minikube: load images into cluster
minikube image load jirahub-backend:latest
minikube image load jirahub-frontend:latest
```

### Step 2: Apply K8s Manifests

```bash
# Create namespace first
kubectl apply -f k8s/namespace.yaml

# Deploy MongoDB
kubectl apply -f k8s/mongodb-deployment.yaml

# Deploy Backend
kubectl apply -f k8s/backend-deployment.yaml

# Deploy Frontend
kubectl apply -f k8s/frontend-deployment.yaml

# Apply Ingress (optional, requires ingress-nginx)
kubectl apply -f k8s/ingress.yaml
```

### Step 3: Verify

```bash
# Check all pods are running
kubectl get pods -n jirahub

# Check services
kubectl get services -n jirahub

# Access via NodePort (Minikube)
minikube service frontend -n jirahub

# Or port-forward
kubectl port-forward svc/frontend 3000:80 -n jirahub
kubectl port-forward svc/backend 5000:5000 -n jirahub
```

### Step 4: Ingress Setup (Optional)

```bash
# Enable Nginx ingress controller in Minikube
minikube addons enable ingress

# Add to /etc/hosts (or C:\Windows\System32\drivers\etc\hosts on Windows)
# <minikube-ip>  jirahub.local

# Get minikube IP
minikube ip

# Then access: http://jirahub.local
```

---

## 📡 API Reference

### Auth
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/register` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login, returns JWT |
| GET | `/api/auth/me` | Private | Get current user |

### Projects
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/projects` | Private | List my projects |
| POST | `/api/projects` | Private | Create project |
| GET | `/api/projects/:id` | Private | Get project |
| PUT | `/api/projects/:id` | Private (owner) | Update project |
| DELETE | `/api/projects/:id` | Private (owner) | Delete project |
| POST | `/api/projects/:id/members` | Private (owner) | Add member |
| GET | `/api/projects/:id/issues` | Private | List issues |
| POST | `/api/projects/:id/issues` | Private | Create issue |
| GET | `/api/projects/:id/stats` | Private | Get issue stats |

### Issues
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/issues/:id` | Private | Get issue |
| PUT | `/api/issues/:id` | Private | Update issue |
| DELETE | `/api/issues/:id` | Private | Delete issue |

### Users
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/users` | Private | List all users |
| GET | `/api/users/me` | Private | Get my profile |
| PUT | `/api/users/me` | Private | Update my profile |

---

## 🔒 Security Notes

- **Change JWT_SECRET** before deploying to production
- The K8s `Secret` uses `stringData` for convenience — encode with base64 in real deployments
- MongoDB has no auth in dev mode — add authentication for production

---

## 📦 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Backend server port |
| `MONGO_URI` | `mongodb://localhost:27017/jirahub` | MongoDB connection string |
| `JWT_SECRET` | *(required)* | Secret key for JWT signing |
| `JWT_EXPIRE` | `7d` | JWT expiry duration |
| `NODE_ENV` | `development` | Environment mode |

---

## 🧹 Cleanup

```bash
# Docker Compose
docker-compose down -v  # -v removes volumes (data)

# Kubernetes
kubectl delete namespace jirahub
```
