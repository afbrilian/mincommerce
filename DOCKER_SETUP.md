# 🐳 Docker Setup Guide

This guide explains how to run the MinCommerce application using Docker and Docker Compose.

## 🚀 Quick Start

### Prerequisites
- Docker Desktop (or Docker Engine + Docker Compose)
- Git

### 1. Clone and Setup
```bash
git clone <your-repo>
cd mincommerce
```

### 2. Start Development Environment
```bash
# Using the setup script (recommended)
./docker-setup.sh dev

# Or manually
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### 3. Access the Application
- **Frontend (Development)**: http://localhost:3000
- **API**: http://localhost:3001
- **Nginx Load Balancer**: http://localhost:80
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 📋 Available Commands

### Using the Setup Script
```bash
./docker-setup.sh [COMMAND]
```

**Commands:**
- `dev` - Start development environment (default)
- `prod` - Start production environment
- `infra` - Start infrastructure only (postgres, redis)
- `build` - Build all Docker images
- `stop` - Stop all services
- `logs [service]` - Show logs (optionally for specific service)
- `migrate` - Run database migrations
- `seed` - Seed the database
- `status` - Show service status
- `cleanup` - Remove all containers, volumes, and images
- `help` - Show help message

### Manual Docker Compose Commands
```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Infrastructure only
docker-compose up -d postgres redis

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service-name]

# Build images
docker-compose build
```

## 🏗️ Architecture

### Services Overview
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Nginx LB      │    │   Frontend Dev   │    │   Frontend Prod │
│   (Port 80)     │───▶│   (Port 3000)    │    │   (Port 3001)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Express API   │    │   PostgreSQL     │    │   Redis Cache   │
│   (Port 3001)   │───▶│   (Port 5432)    │    │   (Port 6379)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Service Details

#### **Frontend Services**
- **frontend-dev**: Development React app with hot reload
- **frontend-prod**: Production React app with Nginx

#### **Backend Services**
- **api**: Express.js API server
- **postgres**: PostgreSQL database
- **redis**: Redis cache and queue

#### **Infrastructure**
- **nginx**: Load balancer and reverse proxy

## 🔧 Environment Configuration

### Development Environment
```yaml
# docker-compose.dev.yml
services:
  frontend-dev:
    environment:
      NODE_ENV: development
      VITE_API_URL: http://localhost:3001
      VITE_DEBUG: true
```

### Production Environment
```yaml
# docker-compose.prod.yml
services:
  frontend-prod:
    environment:
      NODE_ENV: production
      VITE_API_URL: http://localhost:3001
      VITE_DEBUG: false
```

## 📊 Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Nginx | 80 | Load balancer (routes to frontend/API) |
| Frontend Dev | 3000 | Development React app |
| Frontend Prod | 3001 | Production React app |
| API | 3001 | Express.js API server |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache and queue |

## 🗄️ Database Setup

### Run Migrations
```bash
# Using setup script
./docker-setup.sh migrate

# Or manually
docker-compose exec api npm run migrate
```

### Seed Database
```bash
# Using setup script
./docker-setup.sh seed

# Or manually
docker-compose exec api npm run seed
```

## 🔍 Monitoring and Debugging

### View Logs
```bash
# All services
./docker-setup.sh logs

# Specific service
./docker-setup.sh logs api
./docker-setup.sh logs frontend-dev
./docker-setup.sh logs postgres
```

### Service Status
```bash
./docker-setup.sh status
```

### Access Service Shells
```bash
# API container
docker-compose exec api bash

# Frontend container
docker-compose exec frontend-dev bash

# Database
docker-compose exec postgres psql -U mincommerce_user -d mincommerce
```

## 🚀 Development Workflow

### 1. Start Development Environment
```bash
./docker-setup.sh dev
```

### 2. Make Changes
- Frontend changes are hot-reloaded automatically
- Backend changes require container restart

### 3. Run Tests
```bash
# Frontend tests
docker-compose exec frontend-dev npm test

# Backend tests
docker-compose exec api npm test
```

### 4. View Application
- Open http://localhost:3000 for frontend
- Open http://localhost:3001/api/health for API health check

## 🏭 Production Deployment

### 1. Build Production Images
```bash
./docker-setup.sh build
```

### 2. Start Production Environment
```bash
./docker-setup.sh prod
```

### 3. Access Production App
- Open http://localhost:80 for production frontend

## 🧹 Cleanup

### Stop Services
```bash
./docker-setup.sh stop
```

### Complete Cleanup
```bash
./docker-setup.sh cleanup
```

This will remove:
- All containers
- All volumes (including database data)
- All images
- Unused Docker resources

## 🔧 Troubleshooting

### Common Issues

#### **Port Already in Use**
```bash
# Check what's using the port
lsof -i :3000
lsof -i :3001
lsof -i :80

# Stop conflicting services or change ports in docker-compose.yml
```

#### **Database Connection Issues**
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres
```

#### **Frontend Not Loading**
```bash
# Check frontend logs
docker-compose logs frontend-dev

# Rebuild frontend
docker-compose build frontend-dev
docker-compose up -d frontend-dev
```

#### **API Not Responding**
```bash
# Check API logs
docker-compose logs api

# Check if API is healthy
curl http://localhost:3001/api/health

# Restart API
docker-compose restart api
```

### Reset Everything
```bash
# Stop and remove everything
docker-compose down -v

# Remove all images
docker system prune -a

# Start fresh
./docker-setup.sh dev
```

## 📈 Performance Tips

### For Development
- Use `frontend-dev` for hot reload
- Mount volumes for live code changes
- Use `infra` mode to run API/frontend locally

### For Production
- Use `frontend-prod` for optimized builds
- Don't mount volumes in production
- Use production environment variables

## 🔒 Security Notes

- Default passwords are used for development
- Change all passwords for production
- Use environment variables for secrets
- Enable HTTPS in production

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)
