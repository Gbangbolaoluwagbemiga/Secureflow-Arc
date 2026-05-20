#!/bin/bash

# SecureFlow New Features Deployment Script
# This script deploys the updated smart contract and updates all configurations

set -e  # Exit on error

echo "🚀 SecureFlow New Features Deployment"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Must run from project root directory${NC}"
    exit 1
fi

# Step 1: Deploy Smart Contract
echo -e "${YELLOW}Step 1: Deploying Smart Contract...${NC}"
cd contracts/solidity

if [ ! -f ".env" ]; then
    echo -e "${RED}Error: contracts/solidity/.env not found${NC}"
    exit 1
fi

forge build

echo "Deploying to Arc Testnet..."
DEPLOY_OUTPUT=$(forge script script/Deploy.s.sol:Deploy --rpc-url $ARC_RPC_URL --broadcast 2>&1)

# Extract contract address from deployment output
# This is a simplified extraction - adjust based on your actual output format
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oE "0x[a-fA-F0-9]{40}" | head -1)

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo -e "${RED}Error: Could not extract contract address from deployment${NC}"
    echo "Please manually extract the address and update .env files"
    exit 1
fi

echo -e "${GREEN}✓ Contract deployed at: $CONTRACT_ADDRESS${NC}"
cd ../..

# Step 2: Update .env files
echo -e "${YELLOW}Step 2: Updating .env files...${NC}"

# Update root .env
if grep -q "VITE_SECUREFLOW_CONTRACT_ADDRESS" .env; then
    sed -i.bak "s/VITE_SECUREFLOW_CONTRACT_ADDRESS=.*/VITE_SECUREFLOW_CONTRACT_ADDRESS=$CONTRACT_ADDRESS/" .env
else
    echo "VITE_SECUREFLOW_CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> .env
fi
echo -e "${GREEN}✓ Updated root .env${NC}"

# Update backend .env
if grep -q "CONTRACT_ADDRESS" backend/.env; then
    sed -i.bak "s/CONTRACT_ADDRESS=.*/CONTRACT_ADDRESS=$CONTRACT_ADDRESS/" backend/.env
else
    echo "CONTRACT_ADDRESS=$CONTRACT_ADDRESS" >> backend/.env
fi
echo -e "${GREEN}✓ Updated backend/.env${NC}"

# Step 3: Update subgraph config
echo -e "${YELLOW}Step 3: Updating subgraph configuration...${NC}"
echo -e "${YELLOW}⚠️  Please manually update subgraph/subgraph.yaml with:${NC}"
echo "   - address: $CONTRACT_ADDRESS"
echo "   - startBlock: [deployment block number]"
echo ""
read -p "Press enter when you've updated subgraph.yaml..."

# Step 4: Build Backend
echo -e "${YELLOW}Step 4: Building backend...${NC}"
cd backend
npm run build
echo -e "${GREEN}✓ Backend built${NC}"
cd ..

# Step 5: Build Subgraph
echo -e "${YELLOW}Step 5: Building subgraph...${NC}"
cd subgraph
npm run codegen
npm run build
echo -e "${GREEN}✓ Subgraph built${NC}"
cd ..

# Step 6: Build Frontend
echo -e "${YELLOW}Step 6: Building frontend...${NC}"
npm run build
echo -e "${GREEN}✓ Frontend built${NC}"

echo ""
echo -e "${GREEN}======================================"
echo "✅ Deployment Complete!"
echo "======================================${NC}"
echo ""
echo "📝 Next Steps:"
echo "1. Deploy subgraph: cd subgraph && npm run deploy"
echo "2. Start backend: cd backend && npm start"
echo "3. Deploy frontend: vercel --prod (or your deployment method)"
echo ""
echo "📋 New Contract Address: $CONTRACT_ADDRESS"
echo ""
echo "⚠️  Remember to:"
echo "   - Update any hardcoded addresses in your code"
echo "   - Test all new features on testnet"
echo "   - Update documentation with new contract address"
echo ""
