// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AlertRegistry
/// @notice On-chain registry for security alert configurations
/// @dev Users register alert rules; monitors check and trigger alerts
contract AlertRegistry {
    struct AlertRule {
        address user;
        address watchAddress;      // Address to monitor
        uint256 minAmount;         // Alert if transfer > this
        bool watchApprovals;       // Alert on new approvals
        bool watchContractDeploy;  // Alert on contract deploys
        bool active;
        uint256 createdAt;
        uint256 lastTriggered;
        uint256 triggerCount;
    }

    struct Alert {
        bytes32 ruleId;
        address watchAddress;
        string alertType;
        uint256 amount;
        uint256 timestamp;
        string details;
    }

    mapping(bytes32 => AlertRule) public rules;
    mapping(address => bytes32[]) public userRules;
    Alert[] public alerts;

    event RuleCreated(bytes32 indexed ruleId, address indexed user, address watchAddress);
    event AlertTriggered(bytes32 indexed ruleId, address watchAddress, string alertType, uint256 amount);

    function createRule(
        address watchAddress,
        uint256 minAmount,
        bool watchApprovals,
        bool watchContractDeploy
    ) external returns (bytes32) {
        bytes32 ruleId = keccak256(abi.encodePacked(watchAddress, msg.sender, block.timestamp));

        rules[ruleId] = AlertRule({
            user: msg.sender,
            watchAddress: watchAddress,
            minAmount: minAmount,
            watchApprovals: watchApprovals,
            watchContractDeploy: watchContractDeploy,
            active: true,
            createdAt: block.timestamp,
            lastTriggered: 0,
            triggerCount: 0
        });

        userRules[msg.sender].push(ruleId);
        emit RuleCreated(ruleId, msg.sender, watchAddress);
        return ruleId;
    }

    function triggerAlert(
        bytes32 ruleId,
        string calldata alertType,
        uint256 amount,
        string calldata details
    ) external {
        AlertRule storage rule = rules[ruleId];
        require(rule.active, "Rule not active");

        rule.lastTriggered = block.timestamp;
        rule.triggerCount++;

        alerts.push(Alert({
            ruleId: ruleId,
            watchAddress: rule.watchAddress,
            alertType: alertType,
            amount: amount,
            timestamp: block.timestamp,
            details: details
        }));

        emit AlertTriggered(ruleId, rule.watchAddress, alertType, amount);
    }

    function getUserRules(address user) external view returns (bytes32[] memory) {
        return userRules[user];
    }

    function getAlertCount() external view returns (uint256) {
        return alerts.length;
    }
}
