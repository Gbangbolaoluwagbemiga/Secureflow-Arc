#!/bin/bash
# SecureFlow — Foundry deployment script for Arc EVM Testnet
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "SecureFlow — Arc EVM Deployment"
echo "================================"
echo ""

# --- Load environment ---
if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -o allexport; source .env; set +o allexport
fi

CONTRACT_DIR="contracts/solidity"

# --- Validate prerequisites ---
if ! command -v forge &>/dev/null; then
  echo -e "${RED}❌  'forge' not found. Install Foundry: https://getfoundry.sh${NC}"
  exit 1
fi

if [ -z "$PRIVATE_KEY" ]; then
  echo -e "${RED}❌  PRIVATE_KEY is not set. Export it or add it to .env${NC}"
  exit 1
fi

if [ -z "$ARC_RPC_URL" ]; then
  ARC_RPC_URL="https://rpc.drpc.testnet.arc.network"
  echo -e "${YELLOW}⚠️  ARC_RPC_URL not set — using default Arc Testnet RPC${NC}"
fi

# --- Optional: fee collector address (defaults to deployer) ---
FEE_COLLECTOR="${FEE_COLLECTOR_ADDRESS:-}"
PLATFORM_FEE_BP="${PLATFORM_FEE_BP:-250}"  # 2.5%

echo -e "${YELLOW}📡 Target RPC : ${ARC_RPC_URL}${NC}"
echo -e "${YELLOW}💸 Platform fee: ${PLATFORM_FEE_BP} bp ($(echo "scale=1; $PLATFORM_FEE_BP/100" | bc)%)${NC}"
echo ""

# --- Build contracts ---
echo -e "${YELLOW}🔨 Building contracts…${NC}"
(cd "$CONTRACT_DIR" && forge build)
echo -e "${GREEN}✅ Build successful${NC}"
echo ""

# --- Deploy ---
echo -e "${YELLOW}🚀 Deploying SecureFlow to Arc Testnet…${NC}"
DEPLOY_OUTPUT=$(
  cd "$CONTRACT_DIR" && forge script script/Deploy.s.sol:DeployScript \
    --rpc-url "$ARC_RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --broadcast \
    --legacy \
    2>&1
)

echo "$DEPLOY_OUTPUT"

# --- Extract deployed address ---
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP '(?<=SecureFlow deployed to: )0x[0-9a-fA-F]{40}')

if [ -z "$CONTRACT_ADDRESS" ]; then
  echo -e "${RED}❌  Could not extract deployed contract address from output.${NC}"
  echo "Check the output above for errors."
  exit 1
fi

echo ""
echo -e "${GREEN}✅ SecureFlow deployed!${NC}"
echo -e "${GREEN}📝 Contract address: ${CONTRACT_ADDRESS}${NC}"
echo ""

# Save address to file
echo "$CONTRACT_ADDRESS" > .contract-address
echo "Address saved to .contract-address"

echo ""
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Add to your frontend .env:"
echo "   VITE_SECUREFLOW_CONTRACT_ADDRESS=${CONTRACT_ADDRESS}"
echo ""
echo "2. Whitelist tokens via AdminPage or directly:"
echo "   forge script ... -- whitelistToken <TOKEN_ADDRESS>"
echo ""
echo "3. (Optional) Authorize arbiters via AdminPage"
echo ""
echo "4. Rebuild frontend:"
echo "   npm run build"
echo ""
echo -e "${GREEN}✨ Deployment complete!${NC}"
