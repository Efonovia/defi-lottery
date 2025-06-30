// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

contract Lottery is VRFConsumerBaseV2Plus { //todo: check if contract has security flaws and come up with a better name
    //VRF VARIABLES
    uint256 immutable s_subscriptionId;
    bytes32 immutable s_keyHash;
    uint32 constant CALLBACK_GAS_LIMIT = 100000;
    uint16 constant REQUEST_CONFIRMATIONS = 3;
    uint32 constant NUM_WORDS = 2;
    uint256[] public s_randomWords;
    uint256 public s_requestId;
    event ReturnedRandomness(uint256[] randomWords);


    address public deployer;
    address public winner;
    uint256 public constant lotteryGoal = 1_000 ether; //highest possible is 1109.5
    uint256 public constant maxContribution = 100 ether;
    uint256 public constant minContribution = 0.5 ether;
    uint256 public constant fee = 5 ether;
    address[] public contributors;
    uint256 public totalContribution;
    bool public isActive = true;
    mapping(address => uint256) public contributions;

    event Contribution(address contributor, uint256 amount);
    event WinnerSelection(address winner);

    constructor(uint256 subscriptionId, address vrfCoordinator, bytes32 keyHash) VRFConsumerBaseV2Plus(vrfCoordinator) {
        s_keyHash = keyHash;
        s_subscriptionId = subscriptionId;
        deployer = payable(msg.sender);
    }

    modifier onlyDeployer() {
        require(msg.sender == deployer);
        _;
    }

    function makeContribution() public payable {
        require(isActive, "Lottery is closed");
        require(msg.value >= minContribution, "Minimum stake is 0.5 ETH");
        require(msg.value <= maxContribution, "Maximum stake is 100 ETH");

        if (msg.value + totalContribution >= lotteryGoal) {
            isActive = false;
        }

        totalContribution = totalContribution + msg.value;
        if(contributions[msg.sender] == 0) {
            contributors.push(msg.sender);
        }
        contributions[msg.sender] = contributions[msg.sender] + msg.value;
        emit Contribution(msg.sender, msg.value);
    }

    function requestRandomWords() external onlyDeployer {
        // Will revert if subscription is not set and funded.
        s_requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: s_keyHash,
                subId: s_subscriptionId,
                requestConfirmations: REQUEST_CONFIRMATIONS,
                callbackGasLimit: CALLBACK_GAS_LIMIT,
                numWords: NUM_WORDS,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    // Set nativePayment to true to pay for VRF requests with Sepolia ETH instead of LINK
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );
    }

    function decideWinner() public onlyDeployer { //should only run once
        require(!isActive, "Lottery isn't over");
        require(winner == address(0), "Winner has already been decided");
        require(s_randomWords.length > 0, "Randomness not fulfilled yet");
        uint256 randNo = s_randomWords[0]%100;
        uint256 probability = 0;

        for (uint256 index = 0; index < contributors.length; index++) {
            uint256 chance = (contributions[contributors[index]] * 100) / totalContribution;
            probability = probability + chance;
            if(randNo < probability) {
                winner = contributors[index];
                break;
            }
        }

        if (winner == address(0)) {
            winner = contributors[contributors.length - 1];
        }
        // Clear random words after use
        delete s_randomWords;
        emit WinnerSelection(winner);
    }

    function withdrawWinnings() external payable {
        require(winner != address(0), "Winner hasn't been decided");
        require(winner == msg.sender, "You are not the winner");

        (bool success, ) = payable(winner).call{value: address(this).balance-fee}("");
        require(success, "Lottery: ETH transfer failed, try again");
    }

    function withdrawContractFees() external payable onlyDeployer {
        require(winner != address(0), "Winner hasn't been decided");

        (bool success, ) = payable(deployer).call{value: fee}("");
        require(success, "Lottery: ETH transfer failed, try again");
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        uint256 min = 0;
        uint256 max = 100;
        uint256 range = max - min + 1;
        uint256 maxAcceptable = type(uint256).max - (type(uint256).max % range);
        for (uint256 i = 0; i < randomWords.length; i++) {
            if (randomWords[i] > maxAcceptable) {
                // discard and request a new randomWord
            } else {
                uint256 randomInRange = (randomWords[i] % range) + min;
                s_randomWords.push(randomInRange);
            }
        }
        emit ReturnedRandomness(s_randomWords);
    }
}