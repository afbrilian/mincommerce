#!/bin/bash

# MinCommerce Docker Setup Script
# This script helps you set up and run the MinCommerce application with Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Function to build all images
build_images() {
    print_status "Building Docker images..."
    docker compose build --parallel
    print_success "All images built successfully"
}

# Function to start development environment
start_dev() {
    print_status "Starting development environment..."
    docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
    print_success "Development environment started"
    print_status "Services available at:"
    echo "  - Frontend (Dev): http://localhost:3000"
    echo "  - API: http://localhost:3001"
    echo "  - Nginx: http://localhost:80"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - Redis: localhost:6379"
}

# Function to start production environment
start_prod() {
    print_status "Starting production environment..."
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    print_success "Production environment started"
    print_status "Services available at:"
    echo "  - Frontend (Prod): http://localhost:80"
    echo "  - API: http://localhost:3001"
    echo "  - PostgreSQL: localhost:5432"
    echo "  - Redis: localhost:6379"
}

# Function to start infrastructure only
start_infra() {
    print_status "Starting infrastructure services only..."
    docker compose up -d postgres redis
    print_success "Infrastructure services started"
    print_status "You can now run the API and frontend locally:"
    echo "  - Backend: cd mincommerce-rest && npm run dev"
    echo "  - Frontend: cd mincommerce-app && npm run dev"
}

# Function to stop all services
stop_all() {
    print_status "Stopping all services..."
    docker compose down
    print_success "All services stopped"
}

# Function to show logs
show_logs() {
    local service=${1:-""}
    if [ -n "$service" ]; then
        print_status "Showing logs for $service..."
        docker compose logs -f "$service"
    else
        print_status "Showing logs for all services..."
        docker compose logs -f
    fi
}

# Function to run database migrations
run_migrations() {
    print_status "Running database migrations..."
    docker compose exec api npm run migrate
    print_success "Database migrations completed"
}

# Function to seed database
seed_database() {
    print_status "Seeding database..."
    docker compose exec api npm run seed
    print_success "Database seeded"
}

# Function to show status
show_status() {
    print_status "Service status:"
    docker compose ps
}

# Function to clean up
cleanup() {
    print_warning "This will remove all containers, volumes, and images. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up..."
        docker compose down -v --rmi all
        docker system prune -f
        print_success "Cleanup completed"
    else
        print_status "Cleanup cancelled"
    fi
}

# Function to show help
show_help() {
    echo "MinCommerce Docker Setup Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev         Start development environment (default)"
    echo "  prod        Start production environment"
    echo "  infra       Start infrastructure only (postgres, redis)"
    echo "  build       Build all Docker images"
    echo "  stop        Stop all services"
    echo "  logs [svc]  Show logs (optionally for specific service)"
    echo "  migrate     Run database migrations"
    echo "  seed        Seed the database"
    echo "  status      Show service status"
    echo "  cleanup     Remove all containers, volumes, and images"
    echo "  help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 dev              # Start development environment"
    echo "  $0 logs api         # Show API logs"
    echo "  $0 migrate          # Run migrations"
    echo "  $0 cleanup          # Clean up everything"
}

# Main script logic
main() {
    check_docker
    
    case "${1:-dev}" in
        "dev")
            build_images
            start_dev
            ;;
        "prod")
            build_images
            start_prod
            ;;
        "infra")
            start_infra
            ;;
        "build")
            build_images
            ;;
        "stop")
            stop_all
            ;;
        "logs")
            show_logs "$2"
            ;;
        "migrate")
            run_migrations
            ;;
        "seed")
            seed_database
            ;;
        "status")
            show_status
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
