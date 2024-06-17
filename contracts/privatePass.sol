// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PrivatePass {
    struct Entry {
        address owner;
        mapping(string => string) data;
        string[] keys;
        mapping(address => bool) accessList;
    }

    struct AggregatedData {
        uint256 sum;
        uint256 count;
    }

    mapping(string => Entry[]) private dataEntries;
    mapping(string => mapping(string => AggregatedData)) private aggregatedData;

    event DataStored(string id, address indexed user, string key);
    event AggregateUpdated(string id, string key, string aggregateJson);
    event AccessGranted(string id, address indexed user, address accessor);
    event AccessRevoked(string id, address indexed user, address accessor);

    function storePrivateData(string memory _id, string[] memory _keys, string[] memory _values, address[] memory _allowedAddresses) public {
        Entry storage entry;
        bool entryExists = false;
        uint entryIndex = 0;

        // Check if an entry for the ID already exists and the sender is one of the owners
        for (uint i = 0; i < dataEntries[_id].length; i++) {
            if (dataEntries[_id][i].owner == msg.sender) {
                entryExists = true;
                entryIndex = i;
                break;
            }
        }

        if (entryExists) {
            entry = dataEntries[_id][entryIndex];
        } else {
            entry = dataEntries[_id].push();
            entry.owner = msg.sender;

            // Initialize the access list, ensuring that the sender is always included
            bool senderIncluded = false;
            for (uint i = 0; i < _allowedAddresses.length; i++) {
                entry.accessList[_allowedAddresses[i]] = true;
                if (_allowedAddresses[i] == msg.sender) {
                    senderIncluded = true;
                }
            }
            // If the sender is not included in the provided addresses, add them
            if (!senderIncluded) {
                entry.accessList[msg.sender] = true;
            }
        }

        // Update or append new data under the existing or new entry
        for (uint i = 0; i < _keys.length; i++) {
            entry.data[_keys[i]] = _values[i];
            // To prevent duplicate keys in the array, only add keys if the entry is new
            if (!entryExists) {
                entry.keys.push(_keys[i]);
            }
            emit DataStored(_id, msg.sender, _keys[i]);

            // Check if the value is numeric and handle aggregation if it is
            (uint256 numericValue, bool isNumeric) = tryParseUint(_values[i]);
            if (isNumeric) {
                AggregatedData storage aggData = aggregatedData[_keys[i]][_id];
                aggData.sum += numericValue;
                aggData.count += 1;
                string memory aggregateJson = generateAggregateJson(_keys[i], _id);
                emit AggregateUpdated(_id, _keys[i], aggregateJson);
            }
        }
    }

    function grantAccess(string memory _id, address _newAccessor) public {
        for (uint i = 0; i < dataEntries[_id].length; i++) {
            if (dataEntries[_id][i].owner == msg.sender) {
                dataEntries[_id][i].accessList[_newAccessor] = true;
                emit AccessGranted(_id, msg.sender, _newAccessor);
                return;
            }
        }
        revert("Only the owner can grant access");
    }

    function revokeAccess(string memory _id, address _accessor) public {
        for (uint i = 0; i < dataEntries[_id].length; i++) {
            if (dataEntries[_id][i].owner == msg.sender) {
                dataEntries[_id][i].accessList[_accessor] = false;
                emit AccessRevoked(_id, msg.sender, _accessor);
                return;
            }
        }
        revert("Only the owner can revoke access");
    }

    function getAggregateData(string memory _id, string memory _key) public view returns (string memory) {
        return generateAggregateJson(_key, _id);
    }

    function generateAggregateJson(string memory _key, string memory _id) internal view returns (string memory) {
        AggregatedData memory aggData = aggregatedData[_key][_id];
        if (aggData.count >= 3) {
            return string(abi.encodePacked("{\"", _key, "\": ", uint2str(aggData.sum), "}"));
        } else {
            return "{}";
        }
    }

    function getPrivateData(string memory _id) public view returns (string memory) {
        string memory dataJson = "[";
        bool hasEntries = false;

        for (uint i = 0; i < dataEntries[_id].length; i++) {
            Entry storage entry = dataEntries[_id][i];
            if (entry.owner == msg.sender || entry.accessList[msg.sender]) {
                if (hasEntries) {
                    dataJson = string(abi.encodePacked(dataJson, ", "));
                }
                dataJson = string(abi.encodePacked(dataJson, formatDataAsJson(entry)));
                hasEntries = true;
            }
        }

        if (!hasEntries) {
            revert("Access denied or ID not found");
        }

        dataJson = string(abi.encodePacked(dataJson, "]"));
        return dataJson;
    }

    function formatDataAsJson(Entry storage entry) internal view returns (string memory) {
        string memory dataJson = "{\"owner\": \"";
        dataJson = string(abi.encodePacked(dataJson, toAsciiString(entry.owner), "\", \"data\": {"));
        for (uint j = 0; j < entry.keys.length; j++) {
            if (j > 0) dataJson = string(abi.encodePacked(dataJson, ", "));
            string memory key = entry.keys[j];
            dataJson = string(abi.encodePacked(dataJson, "\"", key, "\": \"", entry.data[key], "\""));
        }
        return string(abi.encodePacked(dataJson, "}}"));
    }

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

    function uint2str(uint _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint j = _i;
        uint len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }

    function tryParseUint(string memory _value) internal pure returns (uint256, bool) {
        bytes memory b = bytes(_value);
        uint256 result = 0;
        bool hasDigits = false;

        for (uint i = 0; i < b.length; i++) {
            if (b[i] >= 0x30 && b[i] <= 0x39) {
                result = result * 10 + (uint256(uint8(b[i])) - uint8(0x30));
                hasDigits = true;
            } else {
                return (0, false); // As soon as a non-digit is found, return false
            }
        }

        return (result, hasDigits);
    }
}
