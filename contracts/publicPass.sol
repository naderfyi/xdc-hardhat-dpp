// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PublicPass {
    struct Entry {
        address owner;
        mapping(string => string) publicData;
        string[] keys;  // Array to store keys for iteration
    }

    mapping(string => Entry[]) public dataEntries;

    event PublicDataStored(string id, address indexed user, string key);

    function storePublicData(string memory _id, string[] memory _keys, string[] memory _values) public {
        require(_keys.length == _values.length, "Keys and values length mismatch");

        // Check if an entry for the user already exists
        bool entryExists = false;
        for (uint i = 0; i < dataEntries[_id].length; i++) {
            if (dataEntries[_id][i].owner == msg.sender) {
                entryExists = true;
                for (uint j = 0; j < _keys.length; j++) {
                    if (bytes(dataEntries[_id][i].publicData[_keys[j]]).length == 0) {  // Only add key if it's a new key
                        dataEntries[_id][i].keys.push(_keys[j]);
                    }
                    dataEntries[_id][i].publicData[_keys[j]] = _values[j];
                    emit PublicDataStored(_id, msg.sender, _keys[j]);
                }
            }
        }

        // If no entry exists, create a new one
        if (!entryExists) {
            Entry storage entry = dataEntries[_id].push();
            entry.owner = msg.sender;

            for (uint i = 0; i < _keys.length; i++) {
                if (bytes(entry.publicData[_keys[i]]).length == 0) {  // Only add key if it's a new key
                    entry.keys.push(_keys[i]);
                }
                entry.publicData[_keys[i]] = _values[i];
                emit PublicDataStored(_id, msg.sender, _keys[i]);
            }
        }
    }

    function getPublicData(string memory _id) public view returns (string memory) {
        require(dataEntries[_id].length > 0, "ID not found");

        string memory dataJson = "[";
        bool hasEntries = false;

        for (uint i = 0; i < dataEntries[_id].length; i++) {
            Entry storage entry = dataEntries[_id][i];
            if (hasEntries) {
                dataJson = string(abi.encodePacked(dataJson, ", "));
            }
            dataJson = string(abi.encodePacked(dataJson, "{"));
            dataJson = string(abi.encodePacked(dataJson, "\"owner\": \"", toAsciiString(entry.owner), "\", "));
            dataJson = string(abi.encodePacked(dataJson, "\"publicData\": {"));
            for (uint j = 0; j < entry.keys.length; j++) {
                if (j > 0) {
                    dataJson = string(abi.encodePacked(dataJson, ", "));
                }
                string memory key = entry.keys[j];
                dataJson = string(abi.encodePacked(dataJson, "\"", key, "\": \"", entry.publicData[key], "\""));
            }
            dataJson = string(abi.encodePacked(dataJson, "}}"));
            hasEntries = true;
        }

        dataJson = string(abi.encodePacked(dataJson, "]"));
        return dataJson;
    }

    // Helper functions to handle address to string conversion
    function toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint(uint160(x)) / (2**(8*(19 - i)))));
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
