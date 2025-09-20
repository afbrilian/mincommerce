#!/bin/bash

echo "🚀 Starting MinCommerce Flash Sale System..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"

# Start infrastructure services
echo "🐳 Starting PostgreSQL and Redis..."
docker compose up postgres redis -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if services are healthy
echo "🔍 Checking service health..."
if docker compose ps | grep -q "healthy"; then
    echo "✅ Services are healthy"
else
    echo "⚠️  Services may still be starting up..."
fi

echo ""
echo "🎉 Infrastructure is ready!"
echo ""
echo "📋 Next steps:"
echo "   1. Install dependencies:"
echo "      cd mincommerce-rest && npm install"
echo ""
echo "   2. Run database migrations:"
echo "      npm run migrate"
echo ""
echo "   3. Seed sample data:"
echo "      npm run seed"
echo ""
echo "   4. Start the API server:"
echo "      npm run dev"
echo ""
echo "   5. Access the application:"
echo "      - API: http://localhost:3001/api/health"
echo "      - Frontend: http://localhost:3000 (when implemented)"
echo ""
echo "🔧 Useful commands:"
echo "   - View logs: docker compose logs -f"
echo "   - Stop services: docker compose down"
echo "   - Restart services: docker compose restart"
echo ""
echo "✨ Happy coding!"
