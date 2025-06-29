const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers")
const { expect } = require("chai")
const { ethers, network } = require("hardhat")
const { generateRandomContributions } = require("../utils.js")
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs.js")

const tokens = n => ethers.parseUnits(n.toString(), 'ether')

const lotteryGoal = tokens(1000);
const maxContribution = tokens(100);
const minContribution = tokens(0.5);

// Network configuration for VRF
const networkConfig = {
    31337: {
        keyHash: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",
        fundAmount: "1000000000000000000", // 1 ETH
    }
}

describe('Lottery', () => {
    async function deploymentFixture() {
        let lottery
    
        const [deployer, ...players] = await ethers.getSigners()

        const BASE_FEE = "1000000000000000" // 0.001 ether as base fee
        const GAS_PRICE = "50000000000" // 50 gwei 
        const WEI_PER_UNIT_LINK = "10000000000000000" // 0.01 ether per LINK
        const chainId = network.config.chainId
        const VRFCoordinatorV2_5MockFactory = await ethers.getContractFactory("VRFCoordinatorV2_5Mock")
        const VRFCoordinatorV2_5Mock = await VRFCoordinatorV2_5MockFactory.deploy(BASE_FEE, GAS_PRICE, WEI_PER_UNIT_LINK)
        await VRFCoordinatorV2_5Mock.waitForDeployment()

        const fundAmount = networkConfig[chainId]["fundAmount"] || "1000000000000000000"
        const transaction = await VRFCoordinatorV2_5Mock.createSubscription()
        // console.log("transaction", transaction)
        const transactionReceipt = await transaction.wait(1)
        // console.log("transactionReceipt", transactionReceipt)
        
        // Get subscription ID from the event logs
        let subscriptionId
        if (transactionReceipt.logs && transactionReceipt.logs.length > 0) {
            // Try to find the subscription created event
            for (let i = 0; i < transactionReceipt.logs.length; i++) {
                const log = transactionReceipt.logs[i]
                // The subscription ID is typically in the first topic after the event signature
                if (log.topics && log.topics.length > 1) {
                    try {
                        // Convert BigInt to string and then to BigNumber-like format
                        subscriptionId = BigInt(log.topics[1])
                        break
                    } catch (error) {
                        console.log("Error parsing subscription ID from topic:", error)
                        continue
                    }
                }
            }
        }
        
        // If we couldn't find it in logs, use a default subscription ID
        if (!subscriptionId) {
            console.log("USING DEFAULT SUBSCRIPTION ID")
            subscriptionId = 1n
        }
        
        await VRFCoordinatorV2_5Mock.fundSubscription(subscriptionId, fundAmount)

        const vrfCoordinatorAddress = await VRFCoordinatorV2_5Mock.getAddress()
        const keyHash = networkConfig[chainId]["keyHash"] || "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc"

        const Lottery = await ethers.getContractFactory("Lottery")
        lottery = await Lottery.connect(deployer).deploy(subscriptionId, vrfCoordinatorAddress, keyHash)
        await lottery.waitForDeployment()
        await VRFCoordinatorV2_5Mock.addConsumer(subscriptionId, await lottery.getAddress())

        return { lottery, owner: deployer, players, VRFCoordinatorV2_5Mock }
    }

    async function simulateLotteryFixture(target) {
        const { owner, lottery, players, VRFCoordinatorV2_5Mock } = await loadFixture(deploymentFixture)
        const contributions = generateRandomContributions(target)
        let chances = {}
        
        for(let i=0; i < contributions.length; i++) {
            const transaction = await lottery.connect(players[i]).makeContribution({ value: tokens(contributions[i]) })
            await transaction.wait()
        }
        
        const total = await lottery.totalContribution()
        for(let i=0; i < contributions.length; i++) {
            const contribution = await lottery.contributions(players[i].address)
            chances[players[i].address] = (Number(contribution)/Number(total))*100 + "%"
        }

        return { lottery, owner, players, contributions, chances, VRFCoordinatorV2_5Mock }
    }

    async function decideWinnerFixture() {
         const { lottery, owner, VRFCoordinatorV2_5Mock, players } = await simulateLotteryFixture(1000)
            await lottery.connect(owner).requestRandomWords()
            const requestId = await lottery.s_requestId()
            await VRFCoordinatorV2_5Mock.fulfillRandomWords(requestId, await lottery.getAddress())
            await lottery.connect(owner).decideWinner()
            const winnerAddress = await lottery.winner()
            
            // Find the winner signer from the players array
            const winner = players.find(player => player.address === winnerAddress)

            return { lottery, owner, VRFCoordinatorV2_5Mock, winner, players }
    }

    describe("Deployment", () => {
        it('should set deployer', async () => {
            const { lottery, owner } = await loadFixture(deploymentFixture)
            expect(await lottery.deployer()).to.equal(owner.address)
        });
        
        it("Should set contract constants", async ()=> {
            const { lottery } = await loadFixture(deploymentFixture)
            expect(await lottery.lotteryGoal()).to.equal(lotteryGoal)
            expect(await lottery.maxContribution()).to.equal(maxContribution)
            expect(await lottery.minContribution()).to.equal(minContribution)
        })
    })

    describe("Making Contributions", () => {
        it("Should revert low contributions", async()=> {
            const { lottery, players } = await loadFixture(deploymentFixture)
            await expect(lottery.connect(players[0]).makeContribution({ value: tokens(0.2) })).to.be.revertedWith("Minimum stake is 0.5 ETH")
        })

        it("Should revert high contributions", async()=> {
            const { lottery, players } = await loadFixture(deploymentFixture)
            await expect(lottery.connect(players[0]).makeContribution({ value: tokens(200) })).to.be.revertedWith("Maximum stake is 100 ETH")
        })

        it("Should revert contribution when lottery is closed", async()=> {
            const { lottery, players } = await simulateLotteryFixture(1000)

            await expect(lottery.connect(players[0]).makeContribution({ value: tokens(50) })).to.be.revertedWith("Lottery is closed")
        })

        it("Should accept normal contribution", async () => {
            const { lottery, players } = await loadFixture(deploymentFixture)
            const contribution = tokens(50)
            const balance = await ethers.provider.getBalance(await lottery.getAddress())
            const transaction = await lottery.connect(players[0]).makeContribution({ value: contribution })
            await transaction.wait()

            expect(await lottery.isActive()).to.equal(true)
            expect(await lottery.contributors(0)).to.equal(players[0].address)
            expect(await lottery.totalContribution()).to.equal(contribution+balance)
            expect(await lottery.contributions(players[0].address)).to.equal(contribution)
            // await expect(lottery.makeContribution()).to.emit(lock, "Withdrawal").withArgs(lockedAmount, anyValue) //! will the function run here too
        })

        it("Should accept contribution overflow", async () => {
            const contribution = tokens(100)
            const { lottery, players } = await simulateLotteryFixture(999)

            const balance = await ethers.provider.getBalance(await lottery.getAddress())

            const overflowTx = await lottery.connect(players[18]).makeContribution({ value: contribution })
            await overflowTx.wait()

            expect(await lottery.isActive()).to.equal(false)
            expect(await lottery.contributors(1)).to.equal(players[1].address)
            expect(await lottery.totalContribution()).to.equal(contribution+balance)
            expect(await lottery.contributions(players[18].address)).to.equal(contribution)
        })
    })

    describe('Deciding the winner', () => {
        it("Should give a random number", async () => {
            const { lottery, VRFCoordinatorV2_5Mock } = await loadFixture(deploymentFixture)
            await lottery.requestRandomWords()
            const requestId = await lottery.s_requestId()

            await expect(VRFCoordinatorV2_5Mock.fulfillRandomWords(requestId, await lottery.getAddress())).to.emit(lottery, "ReturnedRandomness")
            const randNo = await lottery.s_randomWords(0)
            console.log(randNo.toString())
        })

        it('Should choose winner', async () => {
            const { lottery, chances, owner, VRFCoordinatorV2_5Mock } = await simulateLotteryFixture(1000)
            // console.log("chances", chances)
            await lottery.connect(owner).requestRandomWords()
            const requestId = await lottery.s_requestId()
            await VRFCoordinatorV2_5Mock.fulfillRandomWords(requestId, await lottery.getAddress())
            await lottery.connect(owner).decideWinner()
            const winner = await lottery.winner()
            console.log("winner", winner)
            expect(await lottery.isActive()).to.be.false
            expect(Number(await lottery.contributions(winner))).to.not.equal(ethers.ZeroAddress)
        });

        it('should not work without generating randomness first', async () => {
            const { lottery, owner } = await simulateLotteryFixture(1000)
            await expect(lottery.connect(owner).decideWinner()).to.be.revertedWith("Randomness not fulfilled yet")
        });
    })

    describe('Withdrawals', () => {
        describe("withdrawal of winnings", ()=>{
            it('Should only allow winner to withdraw', async () => {
                const { lottery, players } = await decideWinnerFixture()
                const loser = players[players.length-1]
                await expect(lottery.connect(loser).withdrawWinnings()).to.be.revertedWith("You are not the winner")
            });

            it('Should only allow withdrawal when a winner has been decided', async () => {
                const { lottery, players } = await simulateLotteryFixture(1000)
                const loser = players[players.length-1]
                await expect(lottery.connect(loser).withdrawWinnings()).to.be.revertedWith("Winner hasn't been decided")
            });
            
            it("Should withdraw winnings", async () => {
                const { lottery, winner } = await decideWinnerFixture()
                await lottery.connect(winner).withdrawWinnings()
                expect(await ethers.provider.getBalance(await lottery.getAddress())).to.equal(await lottery.fee())
            })
        })

        describe('withdrawal of fees', () => {
            it('should not allow fees withdrawal when a winner has not been decided', async () => {
                const { lottery, owner } = await simulateLotteryFixture(1000)
                await expect(lottery.connect(owner).withdrawContractFees()).to.be.revertedWith("Winner hasn't been decided")
            });
            
            it("Should withdraw fees", async () => {
                const { lottery, owner } = await decideWinnerFixture()
                const totalContribution = await lottery.totalContribution()
                const fee = await lottery.fee()
                await lottery.connect(owner).withdrawContractFees()
                expect(await ethers.provider.getBalance(await lottery.getAddress())).to.equal(totalContribution - fee)
            })
        });
        
    });
    
});
