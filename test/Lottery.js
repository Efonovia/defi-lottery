const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers")
const { expect } = require("chai")
const { ethers } = require("hardhat")
const { generateRandomContributions } = require("../utils.js")

const tokens = n => ethers.parseUnits(n.toString(), 'ether')

const lotteryGoal = tokens(1000);
const maxContribution = tokens(100);
const minContribution = tokens(0.5);


describe('Lottery', () => {
    async function deploymentFixture() {
        let lottery
    
        const [owner, ...players] = await ethers.getSigners()
        const Lottery = await ethers.getContractFactory("Lottery")
        lottery = await Lottery.connect(owner).deploy()

        return { lottery, owner, players }
    }

    async function simulateLotteryFixture(target) {
        const { owner, lottery, players } = await loadFixture(deploymentFixture)
        const contributions = generateRandomContributions(target)
        console.log(contributions)


        for(let i=0; i < contributions.length; i++) {
            const transaction = await lottery.connect(players[i]).makeContribution({ value: tokens(contributions[i]) })
            await transaction.wait()
        }

        return { lottery, owner, players, contributions }
    }

    describe("Deployment", () => {
        it('should set owner', async () => {
            const { lottery, owner } = await loadFixture(deploymentFixture)
            expect(await lottery.owner()).to.equal(owner.address)
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
});
