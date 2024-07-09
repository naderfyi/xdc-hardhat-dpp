// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PublicPass {
    struct Entry {
        address owner;
        mapping(string => string) publicData;
        string[] keys;  // Array to store keys for iteration
        string previousId; // Link to previous entry
        string nextId;     // Link to next entry
    }

    mapping(string => Entry) public dataEntries;

    // Event to indicate data storage with newly generated ID
    event PublicDataStored(string id, address indexed user, string key);

    // Event for aggregated data
    event AggregateDataStored(string id, string data);

    // Store public data and automatically generate an ID
    function storePublicData(string[] memory _keys, string[] memory _values, string memory _previousId) public returns (string memory) {
        require(_keys.length == _values.length, "Keys and values length mismatch");
        for (uint i = 0; i < _keys.length; i++) {
            require(bytes(_keys[i]).length > 0, "Key cannot be empty");
        }

        string memory newId = generateUniqueId();

        Entry storage entry = dataEntries[newId];
        entry.owner = msg.sender;
        entry.previousId = _previousId;

        for (uint i = 0; i < _keys.length; i++) {
            if (bytes(entry.publicData[_keys[i]]).length == 0) {
                entry.keys.push(_keys[i]);
            }
            entry.publicData[_keys[i]] = _values[i];
            emit PublicDataStored(newId, msg.sender, _keys[i]);
        }

        // Link previous entry's nextId to the new entry if there is a previous entry
        if (bytes(_previousId).length > 0 && dataEntries[_previousId].owner != address(0)) {
            dataEntries[_previousId].nextId = newId;
        }

        return newId;
    }

    // Retrieve public data in JSON format for a given ID
    function getPublicData(string memory _id) public view returns (string memory) {
        require(bytes(_id).length > 0 && dataEntries[_id].owner != address(0), "ID not found");

        Entry storage entry = dataEntries[_id];
        string memory dataJson = "{";
        for (uint j = 0; j < entry.keys.length; j++) {
            if (j > 0) dataJson = string(abi.encodePacked(dataJson, ", "));
            string memory key = entry.keys[j];
            dataJson = string(abi.encodePacked(dataJson, "\"", key, "\": \"", entry.publicData[key], "\""));
        }
        dataJson = string(abi.encodePacked(dataJson, "}"));
        return dataJson;
    }

    // Retrieve full lifecycle data starting from a given ID
    function getFullLifecycleData(string memory _startId) public view returns (string memory) {
        require(bytes(_startId).length > 0 && dataEntries[_startId].owner != address(0), "ID not found");

        string memory dataJson = "[";
        string memory currentId = _startId;
        bool first = true;

        while (bytes(currentId).length > 0) {
            Entry storage entry = dataEntries[currentId];
            if (!first) {
                dataJson = string(abi.encodePacked(dataJson, ", "));
            }
            dataJson = string(abi.encodePacked(dataJson, getPublicData(currentId)));
            currentId = entry.nextId;
            first = false;
        }

        dataJson = string(abi.encodePacked(dataJson, "]"));
        return dataJson;
    }
    
    // Store aggregate data
    function storeAggregateData(string memory _id, string memory _aggregateJson) public {
        emit AggregateDataStored(_id, _aggregateJson);
    }

    function generateUniqueId() private view returns (string memory) {
        return string(abi.encodePacked("ID-", toAsciiString(msg.sender), "-", uintToString(block.timestamp)));
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
