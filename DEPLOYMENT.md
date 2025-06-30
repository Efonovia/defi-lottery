# DeFi Lottery - Sepolia Deployment Guide

## Prerequisites

1. **Sepolia ETH**: You need Sepolia testnet ETH for gas fees
   - Get it from: https://sepoliafaucet.com/ or https://faucet.sepolia.dev/

2. **LINK Tokens**: For VRF (Chainlink's Verifiable Random Function)
   - Get Sepolia LINK from: https://faucets.chain.link/sepolia

3. **Infura/Alchemy Account**: For RPC endpoint
   - Sign up at: https://infura.io/ or https://alchemy.com/

4. **Etherscan API Key**: For contract verification
   - Get it from: https://etherscan.io/apis

## Step-by-Step Deployment

### 1. Set up Environment Variables

Create a `.env` file in your project root:

```bash
# Copy the example file
cp env.example .env
```

Edit `.env` with your actual values:

```env
# Your private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Sepolia RPC URL (from Infura, Alchemy, etc.)
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_project_id

# Etherscan API key for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key

# VRF Subscription ID from Chainlink (you'll get this in step 3)
VRF_SUBSCRIPTION_ID=your_vrf_subscription_id
```

### 2. Get Sepolia ETH and LINK

1. Visit https://sepoliafaucet.com/ to get Sepolia ETH
2. Visit https://faucets.chain.link/sepolia to get Sepolia LINK

### 3. Set up Chainlink VRF Subscription

1. Go to https://vrf.chain.link/sepolia
2. Connect your wallet
3. Click "Create Subscription"
4. Fund your subscription with at least 0.1 LINK
5. Copy your Subscription ID and add it to your `.env` file

### 4. Deploy the Contract

```bash
# Compile the contracts
npm run compile

# Deploy to Sepolia
npm run deploy:sepolia
```

The deployment script will:
- Deploy the Lottery contract
- Show you the contract address
- Tell you to add the contract as a VRF consumer

### 5. Add Contract as VRF Consumer

1. Go back to https://vrf.chain.link/sepolia
2. Click on your subscription
3. Click "Add Consumer"
4. Paste the contract address from the deployment output
5. Confirm the transaction

### 6. Verify the Contract

After deployment, add the contract address to your `.env`:

```env
CONTRACT_ADDRESS=your_deployed_contract_address
```

Then verify:

```bash
npm run verify:sepolia
```

## Testing Your Deployment

### 1. Make Contributions

You can test the contract by making contributions:

```javascript
// Using ethers.js or web3.js
const lottery = await ethers.getContractAt("Lottery", contractAddress);
await lottery.makeContribution({ value: ethers.parseEther("1") });
```

### 2. Request Random Words

```javascript
await lottery.requestRandomWords();
```

### 3. Decide Winner

```javascript
await lottery.decideWinner();
```

## Important Notes

⚠️ **Security Warning**: This is a testnet deployment. The contract has known security issues that should be fixed before mainnet deployment.

🔗 **VRF Requirements**: 
- Your subscription must be funded with LINK
- The contract must be added as a consumer
- Random words are fulfilled automatically by Chainlink

💰 **Gas Costs**: 
- Deployment: ~2-3 million gas
- Each contribution: ~50-100k gas
- Random word request: ~200k gas
- Winner selection: ~100k gas

## Troubleshooting

### Common Issues

1. **"Insufficient funds"**: Make sure you have enough Sepolia ETH
2. **"Subscription not found"**: Check your VRF subscription ID
3. **"Consumer not authorized"**: Add the contract as a consumer in VRF dashboard
4. **"Randomness not fulfilled"**: Wait for Chainlink to fulfill the request (usually 1-2 minutes)

### Getting Help

- Check the Chainlink VRF documentation: https://docs.chain.link/vrf/v2/introduction
- Join the Chainlink Discord: https://discord.gg/chainlink
- Check your transaction on Sepolia Etherscan: https://sepolia.etherscan.io/ 