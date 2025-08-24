#!/bin/bash
set -e

# GovDoc Scanner API - Docker Build and Deploy Script
# This script helps build, test, and deploy the API using Docker

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
}

# Function to check if required files exist
check_requirements() {
    local missing_files=()
    
    if [[ ! -f "package.json" ]]; then
        missing_files+=("package.json")
    fi
    
    if [[ ! -f "Dockerfile" ]]; then
        missing_files+=("Dockerfile")
    fi
    
    if [[ ! -f "docker-compose.yml" ]]; then
        missing_files+=("docker-compose.yml")
    fi
    
    if [[ ! -d "src" ]]; then
        missing_files+=("src directory")
    fi
    
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        print_error "Missing required files/directories:"
        for file in "${missing_files[@]}"; do
            echo "  - $file"
        done
        exit 1
    fi
}

# Function to create .env file from template
setup_env() {
    if [[ ! -f ".env" ]]; then
        if [[ -f ".env.template" ]]; then
            print_status "Creating .env file from template..."
            cp .env.template .env
            print_warning "Please edit .env file with your actual configuration values"
            print_warning "Important: Update API_KEY and OPENSEARCH_PASSWORD with secure values"
        else
            print_error ".env.template file not found. Cannot create .env file."
            exit 1
        fi
    else
        print_status ".env file already exists"
    fi
}

# Function to build the Docker image
build_image() {
    local env_type=${1:-development}
    
    print_status "Building Docker image for $env_type..."
    
    # Change to parent directory for build context
    cd ..
    
    if [[ "$env_type" == "production" ]]; then
        docker build -t govdoc-scanner-api:latest \
                     -t govdoc-scanner-api:$(date +%Y%m%d-%H%M%S) \
                     --target production \
                     -f api/Dockerfile \
                     .
    else
        docker build -t govdoc-scanner-api:dev \
                     --target production \
                     -f api/Dockerfile \
                     .
    fi
    
    # Return to api directory
    cd api
    
    if [[ $? -eq 0 ]]; then
        print_success "Docker image built successfully"
    else
        print_error "Failed to build Docker image"
        exit 1
    fi
}

# Function to run tests (if available)
run_tests() {
    if [[ -f "package.json" ]] && grep -q '"test"' package.json; then
        print_status "Running tests in container..."
        docker run --rm \
                   --name govdoc-api-test \
                   -v "$(pwd):/usr/src/app" \
                   -w /usr/src/app \
                   node:22-alpine \
                   npm test
    else
        print_warning "No test script found in package.json, skipping tests"
    fi
}

# Function to start services
start_services() {
    local env_type=${1:-development}
    
    if [[ "$env_type" == "production" ]]; then
        print_status "Starting production services..."
        docker compose -f docker-compose.prod.yml up -d
    else
        print_status "Starting development services..."
        docker compose up -d
    fi
    
    if [[ $? -eq 0 ]]; then
        print_success "Services started successfully"
        print_status "API should be available at http://localhost:${API_PORT:-8080}"
        print_status "Health check: http://localhost:${API_PORT:-8080}/health"
        print_status "API documentation: http://localhost:${API_PORT:-8080}/docs"
    else
        print_error "Failed to start services"
        exit 1
    fi
}

# Function to stop services
stop_services() {
    local env_type=${1:-development}
    
    if [[ "$env_type" == "production" ]]; then
        print_status "Stopping production services..."
        docker compose -f docker-compose.prod.yml down
    else
        print_status "Stopping development services..."
        docker compose down
    fi
    
    print_success "Services stopped"
}

# Function to show service status
show_status() {
    local env_type=${1:-development}
    
    if [[ "$env_type" == "production" ]]; then
        docker compose -f docker-compose.prod.yml ps
    else
        docker compose ps
    fi
}

# Function to show logs
show_logs() {
    local env_type=${1:-development}
    local follow_flag=""
    
    if [[ "$2" == "--follow" || "$2" == "-f" ]]; then
        follow_flag="-f"
    fi
    
    if [[ "$env_type" == "production" ]]; then
        docker compose -f docker-compose.prod.yml logs $follow_flag api
    else
        docker compose logs $follow_flag api
    fi
}

# Function to clean up Docker resources
cleanup() {
    print_status "Cleaning up Docker resources..."
    
    # Stop and remove containers
    docker compose down --remove-orphans
    docker compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
    
    # Remove dangling images
    docker image prune -f
    
    print_success "Cleanup completed"
}

# Function to display usage
usage() {
    echo "GovDoc Scanner API - Docker Management Script"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  setup                 - Set up .env file from template"
    echo "  build [dev|prod]      - Build Docker image (default: dev)"
    echo "  test                  - Run tests in container"
    echo "  start [dev|prod]      - Start services (default: dev)"
    echo "  stop [dev|prod]       - Stop services (default: dev)"
    echo "  restart [dev|prod]    - Restart services (default: dev)"
    echo "  status [dev|prod]     - Show service status (default: dev)"
    echo "  logs [dev|prod] [-f]  - Show logs (default: dev, -f to follow)"
    echo "  cleanup               - Clean up Docker resources"
    echo "  deploy                - Full deployment (build + start production)"
    echo ""
    echo "Examples:"
    echo "  $0 setup              - Create .env file from template"
    echo "  $0 build prod         - Build production image"
    echo "  $0 start dev          - Start development services"
    echo "  $0 logs prod -f       - Follow production logs"
    echo "  $0 deploy             - Deploy to production"
}

# Main script logic
main() {
    case "${1:-}" in
        "setup")
            check_docker
            setup_env
            ;;
        "build")
            check_docker
            check_requirements
            build_image "${2:-development}"
            ;;
        "test")
            check_docker
            run_tests
            ;;
        "start")
            check_docker
            check_requirements
            setup_env
            start_services "${2:-development}"
            ;;
        "stop")
            check_docker
            stop_services "${2:-development}"
            ;;
        "restart")
            check_docker
            check_requirements
            stop_services "${2:-development}"
            sleep 2
            start_services "${2:-development}"
            ;;
        "status")
            check_docker
            show_status "${2:-development}"
            ;;
        "logs")
            check_docker
            show_logs "${2:-development}" "${3:-}"
            ;;
        "cleanup")
            check_docker
            cleanup
            ;;
        "deploy")
            check_docker
            check_requirements
            setup_env
            build_image "production"
            start_services "production"
            ;;
        "help"|"-h"|"--help"|"")
            usage
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
