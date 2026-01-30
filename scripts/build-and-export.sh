#!/bin/bash
# ========================================
# BoX2 Docker Image Build & Export Script
# 外部ストレージにDockerイメージを保存
# ========================================

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
IMAGE_NAME="box2-nextjs"
IMAGE_TAG="latest"
EXPORT_PATH="${1:-./box2-images}"
BUILD_RAG="${2:-no}"  # "yes" to build AI RAG backend

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}BoX2 Docker Image Build & Export${NC}"
echo -e "${GREEN}========================================${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Create export directory
mkdir -p "$EXPORT_PATH"

# Step 1: Build the Next.js image
echo -e "\n${YELLOW}Step 1: Building Next.js image...${NC}"
docker build \
    --platform linux/amd64 \
    -t ${IMAGE_NAME}:${IMAGE_TAG} \
    -f Dockerfile \
    .

# Step 2: Export Next.js image
echo -e "\n${YELLOW}Step 2: Exporting Next.js image...${NC}"
echo "Saving ${IMAGE_NAME}:${IMAGE_TAG}..."
docker save ${IMAGE_NAME}:${IMAGE_TAG} | gzip > "${EXPORT_PATH}/${IMAGE_NAME}-${IMAGE_TAG}.tar.gz"

# Step 3: Save PostgreSQL image
echo -e "\n${YELLOW}Step 3: Pulling and saving PostgreSQL image...${NC}"
docker pull --platform linux/amd64 postgres:16-alpine
docker save postgres:16-alpine | gzip > "${EXPORT_PATH}/postgres-16-alpine.tar.gz"

# Step 4 (Optional): Build AI RAG Backend
if [ "$BUILD_RAG" = "yes" ]; then
    echo -e "\n${YELLOW}Step 4: Building AI RAG Backend image (CPU only)...${NC}"
    docker build \
        --platform linux/amd64 \
        -t box2-airag:${IMAGE_TAG} \
        -f backend/Dockerfile \
        backend/

    echo "Saving box2-airag:${IMAGE_TAG}..."
    docker save box2-airag:${IMAGE_TAG} | gzip > "${EXPORT_PATH}/box2-airag-${IMAGE_TAG}.tar.gz"
else
    echo -e "\n${YELLOW}Step 4: Skipping AI RAG Backend (use BUILD_RAG=yes to include)${NC}"
fi

# Step 5: Copy docker-compose and .env template
echo -e "\n${YELLOW}Step 5: Copying deployment files...${NC}"
cp docker-compose.yml "${EXPORT_PATH}/"

cat > "${EXPORT_PATH}/.env.template" << 'EOF'
# BoX2 Environment Variables
# このファイルを .env にリネームして値を設定してください

# Auth Secret (以下のコマンドで生成)
# openssl rand -base64 32
AUTH_SECRET=your-auth-secret-here

# LLM Backend URL (LM Studio等)
LLM_BASE_URL=http://host.docker.internal:8080

# Module Configuration
NEXT_PUBLIC_ENABLE_HR_EVALUATION=true
NEXT_PUBLIC_ENABLE_BACKOFFICE=true
EOF

# Step 6: Create docker-compose without RAG
cat > "${EXPORT_PATH}/docker-compose.yml" << 'EOF'
# ========================================
# BoX2 Production Docker Compose
# ポート8888でBoX1と同居
# ========================================

name: box2

services:
  # ----------------------------------------
  # Next.js Application
  # ----------------------------------------
  nextjs:
    image: box2-nextjs:latest
    container_name: box2-nextjs
    restart: unless-stopped
    ports:
      - "8888:3000"
    environment:
      # Database
      DATABASE_URL: postgresql://box2:box2password@postgres:5432/box2?schema=public

      # Auth
      AUTH_SECRET: ${AUTH_SECRET}
      AUTH_URL: http://172.16.2.222:8888
      AUTH_TRUST_HOST: "true"

      # AI Services (LM Studio on host)
      LLM_BASE_URL: ${LLM_BASE_URL:-http://host.docker.internal:8080}

      # Module Configuration
      NEXT_PUBLIC_ENABLE_HR_EVALUATION: ${NEXT_PUBLIC_ENABLE_HR_EVALUATION:-true}
      NEXT_PUBLIC_ENABLE_BACKOFFICE: ${NEXT_PUBLIC_ENABLE_BACKOFFICE:-true}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - box2-network
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # ----------------------------------------
  # PostgreSQL Database (BoX2専用)
  # ----------------------------------------
  postgres:
    image: postgres:16-alpine
    container_name: box2-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: box2
      POSTGRES_PASSWORD: box2password
      POSTGRES_DB: box2
    volumes:
      - box2_postgres_data:/var/lib/postgresql/data
    networks:
      - box2-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U box2"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  box2-network:
    driver: bridge

volumes:
  box2_postgres_data:
EOF

# Step 7: Create load script for Mac Studio
cat > "${EXPORT_PATH}/load-images.sh" << 'EOF'
#!/bin/bash
# ========================================
# BoX2 Docker Image Load Script
# MacStudioでイメージをロードする
# ========================================

set -e

echo "Loading Docker images..."

# Load images
echo "Loading box2-nextjs..."
gunzip -c box2-nextjs-latest.tar.gz | docker load

echo "Loading postgres..."
gunzip -c postgres-16-alpine.tar.gz | docker load

# Optional: Load AI RAG if exists
if [ -f "box2-airag-latest.tar.gz" ]; then
    echo "Loading box2-airag..."
    gunzip -c box2-airag-latest.tar.gz | docker load
fi

echo ""
echo "========================================="
echo "Images loaded successfully!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Copy .env.template to .env and configure:"
echo "   cp .env.template .env"
echo "   # Generate AUTH_SECRET:"
echo "   openssl rand -base64 32"
echo ""
echo "2. Start the containers:"
echo "   docker-compose up -d"
echo ""
echo "3. Access the application:"
echo "   http://172.16.2.222:8888"
echo ""
echo "Initial login:"
echo "  Email: admin@example.com"
echo "  Password: password"
echo ""
echo "========================================="
EOF
chmod +x "${EXPORT_PATH}/load-images.sh"

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Build & Export Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Exported to: ${YELLOW}${EXPORT_PATH}${NC}"
echo ""
ls -lh "${EXPORT_PATH}"
echo ""
echo -e "${YELLOW}次の手順:${NC}"
echo "1. ${EXPORT_PATH} フォルダを外部ストレージにコピー（既にコピー済みなら不要）"
echo "2. MacStudioで外部ストレージをマウント"
echo "3. cd <外部ストレージのパス>/box2-images"
echo "4. ./load-images.sh"
echo "5. cp .env.template .env && openssl rand -base64 32 でAUTH_SECRETを設定"
echo "6. docker-compose up -d"
echo ""
echo -e "アクセスURL: ${GREEN}http://172.16.2.222:8888${NC}"
