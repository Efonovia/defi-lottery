const { ethers } = require("hardhat");

async function main() {
	console.log("Starting deployment...");

	// Get the deployer account
	const [deployer] = await ethers.getSigners();
	console.log("Deploying contracts with account:", deployer.address);
	console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

	// Sepolia VRF Coordinator address (corrected checksum)
	const VRF_COORDINATOR_SEPOLIA = "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625";

	// Sepolia key hash (this is the default for Sepolia)
	const KEY_HASH_SEPOLIA = "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c";

	// You'll need to create a subscription on Chainlink VRF
	// Go to https://vrf.chain.link/sepolia and create a subscription
	// Then fund it with at least 0.1 LINK
	const SUBSCRIPTION_ID = process.env.VRF_SUBSCRIPTION_ID;

	if (!SUBSCRIPTION_ID) {
		console.error("❌ VRF_SUBSCRIPTION_ID not found in environment variables!");
		console.log("Please:");
		console.log("1. Go to https://vrf.chain.link/sepolia");
		console.log("2. Create a new subscription");
		console.log("3. Fund it with at least 0.1 LINK");
		console.log("4. Add the subscription ID to your .env file");
		process.exit(1);
	}

	console.log("Using VRF Subscription ID:", SUBSCRIPTION_ID);

	// Deploy the Lottery contract
	const Lottery = await ethers.getContractFactory("Lottery");
	const lottery = await Lottery.deploy(
		SUBSCRIPTION_ID,
		VRF_COORDINATOR_SEPOLIA,
		KEY_HASH_SEPOLIA
	);
	console.log("contract sent for deployment")
	console.log("waiting for deployment")
	await lottery.waitForDeployment();
	const lotteryAddress = await lottery.getAddress();

	console.log("✅ Lottery deployed to:", lotteryAddress);

	// Add the lottery contract as a consumer to the VRF subscription
	console.log("Adding lottery contract as VRF consumer...");

	// You'll need to manually add the consumer in the Chainlink VRF dashboard
	// Go to your subscription and add this address as a consumer:
	console.log("🔗 Please add this address as a consumer in your VRF subscription:");
	console.log("Consumer Address:", lotteryAddress);

	console.log("\n🎉 Deployment completed successfully!");
	console.log("Contract Address:", lotteryAddress);
	console.log("Deployer Address:", deployer.address);
	console.log("\n📋 Next steps:");
	console.log("1. Add the lottery contract as a consumer in your VRF subscription");
	console.log("2. Fund your subscription with LINK tokens");
	console.log("3. Test the contract on Sepolia");
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("❌ Deployment failed:", error);
		process.exit(1);
	});