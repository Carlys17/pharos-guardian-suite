// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title PaywallRegistry
/// @notice On-chain registry for x402 paywall-enabled skill endpoints
/// @dev Skills register their endpoints with pricing; agents pay to access
contract PaywallRegistry {
    struct SkillEndpoint {
        address provider;
        string endpointUrl;
        uint256 priceUSDC;       // Price in USDC (6 decimals)
        string description;
        bool active;
        uint256 totalEarnings;
        uint256 totalCalls;
    }

    mapping(bytes32 => SkillEndpoint) public endpoints;
    mapping(address => uint256) public providerBalance;

    bytes32[] public endpointIds;

    event SkillRegistered(bytes32 indexed endpointId, address indexed provider, string endpointUrl, uint256 priceUSDC);
    event PaymentMade(bytes32 indexed endpointId, address indexed caller, uint256 amount);
    event Withdrawal(address indexed provider, uint256 amount);

    function registerSkill(
        string calldata endpointUrl,
        uint256 priceUSDC,
        string calldata description
    ) external returns (bytes32) {
        bytes32 endpointId = keccak256(abi.encodePacked(endpointUrl, msg.sender));
        require(endpoints[endpointId].provider == address(0), "Already registered");

        endpoints[endpointId] = SkillEndpoint({
            provider: msg.sender,
            endpointUrl: endpointUrl,
            priceUSDC: priceUSDC,
            description: description,
            active: true,
            totalEarnings: 0,
            totalCalls: 0
        });

        endpointIds.push(endpointId);
        emit SkillRegistered(endpointId, msg.sender, endpointUrl, priceUSDC);
        return endpointId;
    }

    function payForAccess(bytes32 endpointId) external {
        SkillEndpoint storage ep = endpoints[endpointId];
        require(ep.active, "Endpoint not active");

        ep.totalEarnings += ep.priceUSDC;
        ep.totalCalls++;
        providerBalance[ep.provider] += ep.priceUSDC;

        emit PaymentMade(endpointId, msg.sender, ep.priceUSDC);
    }

    function withdraw() external {
        uint256 balance = providerBalance[msg.sender];
        require(balance > 0, "No balance");
        providerBalance[msg.sender] = 0;
        emit Withdrawal(msg.sender, balance);
    }

    function getEndpoint(bytes32 endpointId) external view returns (SkillEndpoint memory) {
        return endpoints[endpointId];
    }

    function getEndpointCount() external view returns (uint256) {
        return endpointIds.length;
    }
}
