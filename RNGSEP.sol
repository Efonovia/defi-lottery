// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { VRFCoordinatorV2_5 } from "@chainlink/contracts/src/v0.8/vrf/dev/VRFCoordinatorV2_5.sol";
import { VRFConsumerBaseV2_5 } from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2_5.sol";

// Simple contract to generate a random number using Chainlink VRF v2.5
contract RandomNumberGenerator is VRFConsumerBaseV2_5 {
    VRFCoordinatorV2_5 private immutable vrfCoordinator;
    uint64 private immutable subscriptionId;
    bytes32 private immutable keyHash;
    uint32 private constant CALLBACK_GAS_LIMIT = 100000;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    uint256 public randomNumber;
    address public owner;
    uint256 public requestId;

    event RandomNumberRequested(uint256 indexed requestId, address indexed requester);
    event RandomNumberReceived(uint256 indexed requestId, uint256 randomNumber);

    // Constructor initializes Chainlink VRF parameters
    constructor(
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash
    ) VRFConsumerBaseV2_5(_vrfCoordinator) {
        vrfCoordinator = VRFCoordinatorV2_5(_vrfCoordinator);
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        owner = msg.sender;
    }

    // Function to request a random number
    function requestRandomNumber() external {
        require(msg.sender == owner, "Only owner can request random number");
        
        requestId = vrfCoordinator.requestRandomWords(
            keyHash,
            subscriptionId,
            REQUEST_CONFIRMATIONS,
            CALLBACK_GAS_LIMIT,
            NUM_WORDS
        );

        emit RandomNumberRequested(requestId, msg.sender);
    }

    // Callback function used by VRF Coordinator to return the random number
    function fulfillRandomWords(uint256 _requestId, uint256[] memory _randomWords) internal override {
        randomNumber = _randomWords[0];
        emit RandomNumberReceived(_requestId, randomNumber);
    }

    // Function to get the stored random number
    function getRandomNumber() external view returns (uint256) {
        return randomNumber;
    }
}