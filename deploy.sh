#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# checkout-store — AWS Deployment Script
# Deploys: ECR → RDS → ECS Fargate (backend) → S3 + CloudFront (frontend)
# =============================================================================

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()     { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC}   $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Banner ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     checkout-store AWS Deployment        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── Prerequisites check ──────────────────────────────────────────────────────
log "Checking prerequisites..."
command -v aws    >/dev/null 2>&1 || error "AWS CLI not found. Install: https://aws.amazon.com/cli/"
command -v docker >/dev/null 2>&1 || error "Docker not found. Install Docker Desktop."
command -v node   >/dev/null 2>&1 || error "Node.js not found."
success "All prerequisites found."

# ── Configuration ────────────────────────────────────────────────────────────
echo ""
log "Loading configuration..."

AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text 2>/dev/null) \
  || error "AWS credentials not configured. Run: aws configure"

APP_NAME="checkout-store"
ECR_REPO="${APP_NAME}-backend"
ECS_CLUSTER="${APP_NAME}-cluster"
ECS_SERVICE="${APP_NAME}-backend-svc"
TASK_FAMILY="${APP_NAME}-backend"
ALB_NAME="${APP_NAME}-alb"
TG_NAME="${APP_NAME}-tg"
S3_BUCKET="${APP_NAME}-frontend-${AWS_ACCOUNT_ID}"
LOG_GROUP="/ecs/${APP_NAME}-backend"

# Payment gateway (sandbox)
PAYMENT_GATEWAY_URL="https://api-sandbox.co.uat.wompi.dev/v1"
PAYMENT_PUBLIC_KEY="pub_stagtest_g2u0HQd3ZMh05hsSgTS2lUV8t3s4mOt7"
PAYMENT_PRIVATE_KEY="prv_stagtest_5i0ZGIGiFcDQifYsXxvsny7Y37tKqFWg"
PAYMENT_EVENTS_KEY="stagtest_events_2PDUmhMywUkvb1LvxYnayFbmofT7w39N"
PAYMENT_INTEGRITY_KEY="stagtest_integrity_nAIBuqayW70XpUqJS4qf4STYiISd89Fp"

# Prompt for RDS password if not set
if [ -z "${DB_PASSWORD:-}" ]; then
  echo -n "Enter a password for the RDS database: "
  read -rs DB_PASSWORD
  echo ""
  [ -z "$DB_PASSWORD" ] && error "DB_PASSWORD cannot be empty."
fi

echo ""
echo -e "  ${YELLOW}Account ID:${NC}  $AWS_ACCOUNT_ID"
echo -e "  ${YELLOW}Region:${NC}      $AWS_REGION"
echo -e "  ${YELLOW}App name:${NC}    $APP_NAME"
echo ""
echo -n "Proceed with deployment? [y/N] "
read -r CONFIRM
[[ "$CONFIRM" =~ ^[Yy]$ ]] || { warn "Deployment cancelled."; exit 0; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# =============================================================================
# STEP 1 — ECR: Build & push backend image
# =============================================================================
echo ""
echo -e "${BLUE}━━━ Step 1/8 — ECR: Build & push backend image ━━━${NC}"

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"

# Create repo if not exists
if ! aws ecr describe-repositories --repository-names "$ECR_REPO" --region "$AWS_REGION" >/dev/null 2>&1; then
  log "Creating ECR repository: $ECR_REPO"
  aws ecr create-repository --repository-name "$ECR_REPO" --region "$AWS_REGION" >/dev/null
fi

log "Logging in to ECR..."
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

log "Building backend Docker image..."
docker build -t "$ECR_REPO" "$SCRIPT_DIR/backend"

log "Pushing image to ECR..."
docker tag "${ECR_REPO}:latest" "${ECR_URI}:latest"
docker push "${ECR_URI}:latest"
success "Backend image pushed: ${ECR_URI}:latest"

# =============================================================================
# STEP 2 — RDS: Create PostgreSQL instance
# =============================================================================
echo ""
echo -e "${BLUE}━━━ Step 2/8 — RDS: Create PostgreSQL database ━━━${NC}"

DB_IDENTIFIER="${APP_NAME}-db"

if aws rds describe-db-instances --db-instance-identifier "$DB_IDENTIFIER" --region "$AWS_REGION" >/dev/null 2>&1; then
  warn "RDS instance '$DB_IDENTIFIER' already exists, skipping creation."
else
  log "Creating RDS PostgreSQL instance (this takes ~5 minutes)..."
  aws rds create-db-instance \
    --db-instance-identifier "$DB_IDENTIFIER" \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 16 \
    --master-username postgres \
    --master-user-password "$DB_PASSWORD" \
    --allocated-storage 20 \
    --db-name checkout_store \
    --backup-retention-period 7 \
    --no-multi-az \
    --no-publicly-accessible \
    --region "$AWS_REGION" >/dev/null

  log "Waiting for RDS instance to be available..."
  aws rds wait db-instance-available \
    --db-instance-identifier "$DB_IDENTIFIER" \
    --region "$AWS_REGION"
fi

DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_IDENTIFIER" \
  --region "$AWS_REGION" \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

success "RDS endpoint: $DB_ENDPOINT"

# =============================================================================
# STEP 3 — IAM: Ensure ECS Task Execution Role exists
# =============================================================================
echo ""
echo -e "${BLUE}━━━ Step 3/8 — IAM: ECS Task Execution Role ━━━${NC}"

ROLE_NAME="ecsTaskExecutionRole"

if ! aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  log "Creating IAM role: $ROLE_NAME"
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document '{
      "Version":"2012-10-17",
      "Statement":[{
        "Effect":"Allow",
        "Principal":{"Service":"ecs-tasks.amazonaws.com"},
        "Action":"sts:AssumeRole"
      }]
    }' >/dev/null

  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
  success "IAM role created."
else
  success "IAM role '$ROLE_NAME' already exists."
fi

EXECUTION_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${ROLE_NAME}"

# =============================================================================
# STEP 4 — ECS Cluster
# =============================================================================
echo ""
echo -e "${BLUE}━━━ Step 4/8 — ECS: Create cluster ━━━${NC}"

if ! aws ecs describe-clusters --clusters "$ECS_CLUSTER" --region "$AWS_REGION" \
    --query 'clusters[?status==`ACTIVE`]' --output text | grep -q "$ECS_CLUSTER" 2>/dev/null; then
  log "Creating ECS cluster: $ECS_CLUSTER"
  aws ecs create-cluster --cluster-name "$ECS_CLUSTER" --region "$AWS_REGION" >/dev/null
fi
success "ECS cluster ready: $ECS_CLUSTER"

# ── Networking: default VPC, public subnets ──────────────────────────────────
VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text --region "$AWS_REGION")

SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=${VPC_ID}" "Name=defaultForAz,Values=true" \
  --query 'Subnets[*].SubnetId' \
  --output text --region "$AWS_REGION" | tr '\t' ',')

log "VPC: $VPC_ID | Subnets: $SUBNET_IDS"

# ── Security Groups ──────────────────────────────────────────────────────────
# ALB security group
ALB_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=${APP_NAME}-alb-sg" "Name=vpc-id,Values=${VPC_ID}" \
  --query 'SecurityGroups[0].GroupId' \
  --output text --region "$AWS_REGION" 2>/dev/null || echo "None")

if [ "$ALB_SG_ID" = "None" ] || [ -z "$ALB_SG_ID" ]; then
  log "Creating ALB security group..."
  ALB_SG_ID=$(aws ec2 create-security-group \
    --group-name "${APP_NAME}-alb-sg" \
    --description "ALB security group for ${APP_NAME}" \
    --vpc-id "$VPC_ID" \
    --region "$AWS_REGION" \
    --query 'GroupId' --output text)
  aws ec2 authorize-security-group-ingress \
    --group-id "$ALB_SG_ID" \
    --protocol tcp --port 80 --cidr 0.0.0.0/0 \
    --region "$AWS_REGION" >/dev/null
fi

# ECS security group
ECS_SG_ID=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=${APP_NAME}-ecs-sg" "Name=vpc-id,Values=${VPC_ID}" \
  --query 'SecurityGroups[0].GroupId' \
  --output text --region "$AWS_REGION" 2>/dev/null || echo "None")

if [ "$ECS_SG_ID" = "None" ] || [ -z "$ECS_SG_ID" ]; then
  log "Creating ECS security group..."
  ECS_SG_ID=$(aws ec2 create-security-group \
    --group-name "${APP_NAME}-ecs-sg" \
    --description "ECS security group for ${APP_NAME}" \
    --vpc-id "$VPC_ID" \
    --region "$AWS_REGION" \
    --query 'GroupId' --output text)
  aws ec2 authorize-security-group-ingress \
    --group-id "$ECS_SG_ID" \
    --protocol tcp --port 3001 \
    --source-group "$ALB_SG_ID" \
    --region "$AWS_REGION" >/dev/null
fi

# RDS security group — allow ECS to connect
RDS_SG_ID=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_IDENTIFIER" \
  --region "$AWS_REGION" \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
  --output text)

aws ec2 authorize-security-group-ingress \
  --group-id "$RDS_SG_ID" \
  --protocol tcp --port 5432 \
  --source-group "$ECS_SG_ID" \
  --region "$AWS_REGION" >/dev/null 2>&1 || true

# =============================================================================
# STEP 5 — ALB: Application Load Balancer
# =============================================================================
echo ""
echo -e "${BLUE}━━━ Step 5/8 — ALB: Create load balancer ━━━${NC}"

ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names "$ALB_NAME" \
  --region "$AWS_REGION" \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text 2>/dev/null || echo "None")

if [ "$ALB_ARN" = "None" ] || [ -z "$ALB_ARN" ]; then
  log "Creating ALB: $ALB_NAME"
  SUBNET_LIST=$(echo "$SUBNET_IDS" | tr ',' ' ')
  ALB_ARN=$(aws elbv2 create-load-balancer \
    --name "$ALB_NAME" \
    --subnets $SUBNET_LIST \
    --security-groups "$ALB_SG_ID" \
    --region "$AWS_REGION" \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text)
fi

ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns "$ALB_ARN" \
  --region "$AWS_REGION" \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Target group
TG_ARN=$(aws elbv2 describe-target-groups \
  --names "$TG_NAME" \
  --region "$AWS_REGION" \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>/dev/null || echo "None")

if [ "$TG_ARN" = "None" ] || [ -z "$TG_ARN" ]; then
  log "Creating target group: $TG_NAME"
  TG_ARN=$(aws elbv2 create-target-group \
    --name "$TG_NAME" \
    --protocol HTTP \
    --port 3001 \
    --vpc-id "$VPC_ID" \
    --target-type ip \
    --health-check-path "/api/products" \
    --health-check-interval-seconds 30 \
    --healthy-threshold-count 2 \
    --region "$AWS_REGION" \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
fi

# Listener
LISTENER_ARN=$(aws elbv2 describe-listeners \
  --load-balancer-arn "$ALB_ARN" \
  --region "$AWS_REGION" \
  --query 'Listeners[0].ListenerArn' \
  --output text 2>/dev/null || echo "None")

if [ "$LISTENER_ARN" = "None" ] || [ -z "$LISTENER_ARN" ]; then
  aws elbv2 create-listener \
    --load-balancer-arn "$ALB_ARN" \
    --protocol HTTP \
    --port 80 \
    --default-actions "Type=forward,TargetGroupArn=${TG_ARN}" \
    --region "$AWS_REGION" >/dev/null
fi

success "ALB DNS: $ALB_DNS"

# =============================================================================
# STEP 6 — ECS: Task definition & service
# =============================================================================
echo ""
echo -e "${BLUE}━━━ Step 6/8 — ECS: Register task & deploy service ━━━${NC}"

# CloudWatch log group
aws logs create-log-group --log-group-name "$LOG_GROUP" --region "$AWS_REGION" 2>/dev/null || true

TASK_DEF_JSON=$(cat <<EOF
{
  "family": "${TASK_FAMILY}",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "${EXECUTION_ROLE_ARN}",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "${ECR_URI}:latest",
      "portMappings": [{"containerPort": 3001, "protocol": "tcp"}],
      "essential": true,
      "environment": [
        {"name": "NODE_ENV",              "value": "development"},
        {"name": "PORT",                  "value": "3001"},
        {"name": "DB_HOST",               "value": "${DB_ENDPOINT}"},
        {"name": "DB_PORT",               "value": "5432"},
        {"name": "DB_USERNAME",           "value": "postgres"},
        {"name": "DB_PASSWORD",           "value": "${DB_PASSWORD}"},
        {"name": "DB_NAME",               "value": "checkout_store"},
        {"name": "PAYMENT_GATEWAY_URL",   "value": "${PAYMENT_GATEWAY_URL}"},
        {"name": "PAYMENT_PUBLIC_KEY",    "value": "${PAYMENT_PUBLIC_KEY}"},
        {"name": "PAYMENT_PRIVATE_KEY",   "value": "${PAYMENT_PRIVATE_KEY}"},
        {"name": "PAYMENT_EVENTS_KEY",    "value": "${PAYMENT_EVENTS_KEY}"},
        {"name": "PAYMENT_INTEGRITY_KEY", "value": "${PAYMENT_INTEGRITY_KEY}"},
        {"name": "FRONTEND_URL",          "value": "PLACEHOLDER"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "${LOG_GROUP}",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF
)

log "Registering ECS task definition..."
aws ecs register-task-definition \
  --cli-input-json "$TASK_DEF_JSON" \
  --region "$AWS_REGION" >/dev/null

# Create or update ECS service
SERVICE_EXISTS=$(aws ecs describe-services \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_SERVICE" \
  --region "$AWS_REGION" \
  --query 'services[?status==`ACTIVE`].serviceName' \
  --output text 2>/dev/null || echo "")

if [ -z "$SERVICE_EXISTS" ]; then
  log "Creating ECS service: $ECS_SERVICE"
  aws ecs create-service \
    --cluster "$ECS_CLUSTER" \
    --service-name "$ECS_SERVICE" \
    --task-definition "$TASK_FAMILY" \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${ECS_SG_ID}],assignPublicIp=ENABLED}" \
    --load-balancers "targetGroupArn=${TG_ARN},containerName=backend,containerPort=3001" \
    --region "$AWS_REGION" >/dev/null
else
  log "Updating ECS service: $ECS_SERVICE"
  aws ecs update-service \
    --cluster "$ECS_CLUSTER" \
    --service "$ECS_SERVICE" \
    --task-definition "$TASK_FAMILY" \
    --force-new-deployment \
    --region "$AWS_REGION" >/dev/null
fi

success "ECS service deployed. Backend: http://${ALB_DNS}/api/products"

# =============================================================================
# STEP 7 — S3 + CloudFront: Frontend
# =============================================================================
echo ""
echo -e "${BLUE}━━━ Step 7/8 — S3 + CloudFront: Deploy frontend ━━━${NC}"

# Create S3 bucket
if ! aws s3api head-bucket --bucket "$S3_BUCKET" --region "$AWS_REGION" 2>/dev/null; then
  log "Creating S3 bucket: $S3_BUCKET"
  if [ "$AWS_REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$S3_BUCKET" --region "$AWS_REGION" >/dev/null
  else
    aws s3api create-bucket \
      --bucket "$S3_BUCKET" \
      --region "$AWS_REGION" \
      --create-bucket-configuration "LocationConstraint=${AWS_REGION}" >/dev/null
  fi
fi

# Disable block public access
aws s3api put-public-access-block \
  --bucket "$S3_BUCKET" \
  --public-access-block-configuration \
    "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" \
  --region "$AWS_REGION"

# Bucket policy
aws s3api put-bucket-policy \
  --bucket "$S3_BUCKET" \
  --policy "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Sid\": \"PublicReadGetObject\",
      \"Effect\": \"Allow\",
      \"Principal\": \"*\",
      \"Action\": \"s3:GetObject\",
      \"Resource\": \"arn:aws:s3:::${S3_BUCKET}/*\"
    }]
  }" --region "$AWS_REGION"

# Static website hosting
aws s3 website "s3://${S3_BUCKET}" \
  --index-document index.html \
  --error-document index.html \
  --region "$AWS_REGION"

# Build frontend
log "Building frontend with ALB API URL..."
cd "$SCRIPT_DIR/frontend"
VITE_API_URL="http://${ALB_DNS}/api" npm run build

# Upload to S3
log "Uploading frontend to S3..."
aws s3 sync dist/ "s3://${S3_BUCKET}" --delete --region "$AWS_REGION"

# CloudFront distribution
CF_DIST_ID=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Origins.Items[0].DomainName=='${S3_BUCKET}.s3-website-${AWS_REGION}.amazonaws.com'].Id" \
  --output text 2>/dev/null || echo "")

if [ -z "$CF_DIST_ID" ]; then
  log "Creating CloudFront distribution..."
  S3_WEBSITE_ORIGIN="${S3_BUCKET}.s3-website-${AWS_REGION}.amazonaws.com"

  CF_DIST_ID=$(aws cloudfront create-distribution \
    --distribution-config "{
      \"CallerReference\": \"${APP_NAME}-$(date +%s)\",
      \"Comment\": \"${APP_NAME} frontend\",
      \"DefaultRootObject\": \"index.html\",
      \"Origins\": {
        \"Quantity\": 1,
        \"Items\": [{
          \"Id\": \"S3-${S3_BUCKET}\",
          \"DomainName\": \"${S3_WEBSITE_ORIGIN}\",
          \"CustomOriginConfig\": {
            \"HTTPPort\": 80,
            \"HTTPSPort\": 443,
            \"OriginProtocolPolicy\": \"http-only\"
          }
        }]
      },
      \"DefaultCacheBehavior\": {
        \"TargetOriginId\": \"S3-${S3_BUCKET}\",
        \"ViewerProtocolPolicy\": \"redirect-to-https\",
        \"CachePolicyId\": \"658327ea-f89d-4fab-a63d-7e88639e58f6\",
        \"Compress\": true,
        \"AllowedMethods\": {
          \"Quantity\": 2,
          \"Items\": [\"GET\",\"HEAD\"]
        }
      },
      \"CustomErrorResponses\": {
        \"Quantity\": 2,
        \"Items\": [
          {\"ErrorCode\": 403, \"ResponsePagePath\": \"/index.html\", \"ResponseCode\": \"200\", \"ErrorCachingMinTTL\": 10},
          {\"ErrorCode\": 404, \"ResponsePagePath\": \"/index.html\", \"ResponseCode\": \"200\", \"ErrorCachingMinTTL\": 10}
        ]
      },
      \"Enabled\": true,
      \"HttpVersion\": \"http2\"
    }" \
    --query 'Distribution.Id' \
    --output text)
fi

CF_DOMAIN=$(aws cloudfront get-distribution \
  --id "$CF_DIST_ID" \
  --query 'Distribution.DomainName' \
  --output text)

success "CloudFront domain: https://${CF_DOMAIN}"

# =============================================================================
# STEP 8 — Update backend CORS with CloudFront URL
# =============================================================================
echo ""
echo -e "${BLUE}━━━ Step 8/8 — Update backend CORS & redeploy ━━━${NC}"

UPDATED_TASK_DEF=$(echo "$TASK_DEF_JSON" | sed "s|PLACEHOLDER|https://${CF_DOMAIN}|g")

aws ecs register-task-definition \
  --cli-input-json "$UPDATED_TASK_DEF" \
  --region "$AWS_REGION" >/dev/null

aws ecs update-service \
  --cluster "$ECS_CLUSTER" \
  --service "$ECS_SERVICE" \
  --task-definition "$TASK_FAMILY" \
  --force-new-deployment \
  --region "$AWS_REGION" >/dev/null

log "Waiting for ECS service to stabilize (~2 min)..."
aws ecs wait services-stable \
  --cluster "$ECS_CLUSTER" \
  --services "$ECS_SERVICE" \
  --region "$AWS_REGION"

# =============================================================================
# Summary
# =============================================================================
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              Deployment Complete!                        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${YELLOW}Frontend:${NC}    https://${CF_DOMAIN}"
echo -e "  ${YELLOW}Backend API:${NC} http://${ALB_DNS}/api/products"
echo -e "  ${YELLOW}ECS Cluster:${NC} ${ECS_CLUSTER}"
echo -e "  ${YELLOW}RDS:${NC}         ${DB_ENDPOINT}"
echo -e "  ${YELLOW}S3 Bucket:${NC}   ${S3_BUCKET}"
echo ""
echo -e "  ${YELLOW}Note:${NC} CloudFront may take 5-10 min to fully propagate."
echo ""
