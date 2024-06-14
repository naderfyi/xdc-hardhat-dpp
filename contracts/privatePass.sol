// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PrivatePass {
    struct Data {
        string key;
        string value;
        mapping(address => bool) accessList;
    }

    mapping(address => Data[]) private userData;
    mapping(string => uint256) public aggregatedData;  // Stores the sum of values for each key

    event DataStored(address indexed user, string key);
    event AggregateUpdated(string key, uint256 newAggregate);
    event AccessGranted(string key, address indexed user, address accessor);

    function storePrivateData(string memory _key, string memory _value, address[] memory _allowedAddresses) public {
        Data storage newData = userData[msg.sender].push();
        newData.key = _key;
        newData.value = _value;
        for (uint i = 0; i < _allowedAddresses.length; i++) {
            newData.accessList[_allowedAddresses[i]] = true;
        }

        // Aggregate data if it's a numeric value
        uint256 numericValue = parseUint(_value);
        aggregatedData[_key] += numericValue;  // Update the aggregate value
        emit AggregateUpdated(_key, aggregatedData[_key]);
        emit DataStored(msg.sender, _key);
    }

    function parseUint(string memory _value) internal pure returns (uint256) {
        bytes memory b = bytes(_value);
        uint256 result = 0;
        bool hasDigits = false;

        for (uint i = 0; i < b.length; i++) {
            if (b[i] >= 0x30 && b[i] <= 0x39) {
                result = result * 10 + (uint256(uint8(b[i])) - 48);
                hasDigits = true;
            }
        }

        if (!hasDigits) {
            revert("Non-numeric data provided");
        }

        return result;
    }

    function getAggregateData(string memory _key) public view returns (uint256) {
        return aggregatedData[_key];
    }

    function getPrivateData(address _user, string memory _key) public view returns (string memory) {
        require(_user != address(0), "Invalid user address");
        require(isAllowed(_user, msg.sender), "Access denied or key not found");
        for (uint i = 0; i < userData[_user].length; i++) {
            if (keccak256(bytes(userData[_user][i].key)) == keccak256(bytes(_key))) {
                return userData[_user][i].value;
            }
        }
        revert("Key not found");
    }

    function isAllowed(address _user, address _viewer) private view returns (bool) {
        if (_user == _viewer) return true;
        Data[] storage dataList = userData[_user];
        for (uint i = 0; i < dataList.length; i++) {
            if (dataList[i].accessList[_viewer]) {
                return true;
            }
        }
        return false;
    }
}
