const fs = require('fs');
const path = require('path');

function checkEnvironmentVariables() {
	console.log("🔍 Checking environment variables...");

	const requiredVars = [
		'PRIVATE_KEY',
		'SEPOLIA_RPC_URL',
		'ETHERSCAN_API_KEY',
		'VRF_SUBSCRIPTION_ID'
	];

	const missingVars = [];

	for (const varName of requiredVars) {
		if (!process.env[varName]) {
			missingVars.push(varName);
		}
	}

	if (missingVars.length > 0) {
		console.log("❌ Missing environment variables:");
		missingVars.forEach(varName => console.log(`   - ${varName}`));
		console.log("\n📝 Please create a .env file with the following variables:");
		console.log("   PRIVATE_KEY=your_private_key_here");
		console.log("   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_project_id");
		console.log("   ETHERSCAN_API_KEY=your_etherscan_api_key");
		console.log("   VRF_SUBSCRIPTION_ID=your_vrf_subscription_id");
		console.log("\n📖 See DEPLOYMENT.md for detailed instructions");
		return false;
	}

	console.log("✅ All environment variables are set!");
	return true;
}

function checkEnvFile() {
	const envPath = path.join(__dirname, '..', '.env');

	if (!fs.existsSync(envPath)) {
		console.log("❌ .env file not found!");
		console.log("📝 Please create a .env file based on env.example");
		return false;
	}

	console.log("✅ .env file found!");
	return true;
}

async function main() {
	console.log("🚀 DeFi Lottery - Setup Check\n");

	const envFileExists = checkEnvFile();
	if (!envFileExists) {
		process.exit(1);
	}

	const envVarsSet = checkEnvironmentVariables();
	if (!envVarsSet) {
		process.exit(1);
	}

	console.log("\n🎉 Setup check completed successfully!");
	console.log("You're ready to deploy to Sepolia!");
	console.log("\nNext steps:");
	console.log("1. Make sure you have Sepolia ETH and LINK");
	console.log("2. Run: npm run deploy:sepolia");
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error("❌ Setup check failed:", error);
		process.exit(1);
	}); 