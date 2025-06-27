// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;


contract Lottery { //todo: check if contract has security flaws and come up with a better name

    address public owner;
    address public winner;
    uint256 public constant lotteryGoal = 1_000 ether; //highest possible is 1109.5
    uint256 public constant maxContribution = 100 ether;
    uint256 public constant minContribution = 0.5 ether;
    uint256 public constant fee = 5 ether;
    address[] public contributors;
    uint256 public totalContribution;
    bool public isActive = true;
    mapping(address => uint) public contributions;

    event Contribution(address contributor, uint amount);
    event WinnerSelection(address winner);

    constructor() {
        owner = payable(msg.sender);
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
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

    function decideWinner() private { //should only run once
        // require(!isActive, "Lottery isn't over");
        // require(winner == address(0), "Winner has already been decided");
    }

    function withdrawWinnings() external payable {
        require(winner != address(0), "Winner hasn't been decided");
        require(winner == msg.sender, "You are not the winner");

        (bool success, ) = payable(winner).call{value: address(this).balance-fee}("");
        require(success, "Lottery: ETH transfer failed, try again");
    }

    function withdrawContractFees() external payable onlyOwner {
        require(winner != address(0), "Winner hasn't been decided");

        (bool success, ) = payable(owner).call{value: fee}("");
        require(success, "Lottery: ETH transfer failed, try again");
    }
}