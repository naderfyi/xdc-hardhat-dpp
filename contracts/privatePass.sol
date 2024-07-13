// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PrivatePass {
    struct Entry {
        address owner;
        mapping(string => string) privateData;
        string[] keys;  // Array to store keys for iteration
        string previousId; // Link to previous entry
        string nextId;     // Link to next entry
        mapping(address => bool) accessList;  // Access control list
    }

    mapping(string => Entry) public dataEntries;
    mapping(address => bool) public hasShipment;

    uint256 private nonce; // Nonce for unique ID generation

    // Events declaration
    event PrivateDataStored(string id, address indexed user, string key);
    event AccessGranted(string id, address indexed owner, address accessor);
    event AccessRevoked(string id, address indexed owner, address accessor);

    // Store private data and automatically generate an ID
    function storePrivateData(string[] memory _keys, string[] memory _values, address[] memory _accessors, string memory _previousId) public returns (string memory) {
        require(_keys.length == _values.length, "Keys and values length mismatch");
        if (bytes(_previousId).length > 0) {
            require(dataEntries[_previousId].owner != address(0), "Previous ID does not exist");
            require(hasShipment[msg.sender], "Sender does not have a shipment");
        }

        string memory newId = generateUniqueId();
        Entry storage entry = dataEntries[newId];
        entry.owner = msg.sender;
        entry.previousId = _previousId;

        // Set access for owner and specified addresses
        entry.accessList[msg.sender] = true;
        for (uint i = 0; i < _accessors.length; i++) {
            entry.accessList[_accessors[i]] = true;
            emit AccessGranted(newId, msg.sender, _accessors[i]);
        }

        for (uint j = 0; j < _keys.length; j++) {
            entry.keys.push(_keys[j]);
            entry.privateData[_keys[j]] = _values[j];
            emit PrivateDataStored(newId, msg.sender, _keys[j]);
        }

        updateLinks(_previousId, newId);
        hasShipment[msg.sender] = true;

        return newId;
    }

    // Grant access to a specified address for the data associated with a specific ID
    function grantAccess(string memory _id, address _newAccessor) public {
        require(msg.sender == dataEntries[_id].owner, "Only the owner can grant access");
        dataEntries[_id].accessList[_newAccessor] = true;
        emit AccessGranted(_id, msg.sender, _newAccessor);
    }

    // Revoke access for a specified address for the data associated with a specific ID
    function revokeAccess(string memory _id, address _accessor) public {
        require(msg.sender == dataEntries[_id].owner, "Only the owner can revoke access");
        dataEntries[_id].accessList[_accessor] = false;
        emit AccessRevoked(_id, msg.sender, _accessor);
    }

    // Retrieve private data with access checks
    function getPrivateData(string memory _id) public view returns (string memory) {
        require(dataEntries[_id].owner == msg.sender || dataEntries[_id].accessList[msg.sender], "Access denied");
        Entry storage entry = dataEntries[_id];
        string memory dataJson = "{";
        dataJson = string(abi.encodePacked(dataJson, "\"owner\": \"", toAsciiString(entry.owner), "\", "));
        for (uint j = 0; j < entry.keys.length; j++) {
            if (j > 0) dataJson = string(abi.encodePacked(dataJson, ", "));
            string memory key = entry.keys[j];
            dataJson = string(abi.encodePacked(dataJson, "\"", key, "\": \"", entry.privateData[key], "\""));
        }
        dataJson = string(abi.encodePacked(dataJson, "}"));
        return dataJson;
    }

    // Helper function to prevent duplicate keys
    function isKeyProcessed(string[] storage keys, string memory newKey) private view returns (bool) {
        for (uint i = 0; i < keys.length; i++) {
            if (keccak256(abi.encodePacked(keys[i])) == keccak256(abi.encodePacked(newKey))) {
                return true;
            }
        }
        return false;
    }

    // Update links between entries
    function updateLinks(string memory _previousId, string memory _newId) private {
        if (bytes(_previousId).length > 0 && dataEntries[_previousId].owner != address(0)) {
            dataEntries[_previousId].nextId = _newId;
        }
    }

    // Generate a unique ID based on address, timestamp, and nonce
    function generateUniqueId() private returns (string memory) {
        nonce++;
        return string(abi.encodePacked("ID-", toAsciiString(msg.sender), "-", uintToString(block.timestamp), "-", uintToString(nonce)));
    }

    // Check if a user has access to a specific entry
    function hasAccess(string memory _id, address _user) public view returns (bool) {
        return dataEntries[_id].accessList[_user];
    }

    function uintToString(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 temp = _i;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (_i != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + _i % 10));
            _i /= 10;
        }
        return string(buffer);
    }

    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2 ** (8 * (19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2*i] = char(hi);
            s[2*i+1] = char(lo);
        }
        return string(abi.encodePacked("0x", s));
    }

    function char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }
}
