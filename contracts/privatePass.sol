// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PrivatePass {
    struct Data {
        string key;
        string value;
        mapping(address => bool) accessList;
    }

    mapping(address => Data[]) private userData;

    event DataStored(address indexed user, string key);
    event AccessGranted(string key, address indexed user, address accessor);

    function storePrivateData(string memory _key, string memory _value, address[] memory _allowedAddresses) public {
        Data storage newData = userData[msg.sender].push();
        newData.key = _key;
        newData.value = _value;
        for (uint i = 0; i < _allowedAddresses.length; i++) {
            newData.accessList[_allowedAddresses[i]] = true;
        }
        emit DataStored(msg.sender, _key);
    }

    function grantAccess(string memory _key, address _accessor) public {
        bool found = false;
        for (uint i = 0; i < userData[msg.sender].length; i++) {
            if (keccak256(bytes(userData[msg.sender][i].key)) == keccak256(bytes(_key))) {
                userData[msg.sender][i].accessList[_accessor] = true;
                found = true;
                emit AccessGranted(_key, msg.sender, _accessor);
                break;
            }
        }
        require(found, "Key not found");
    }

    function getPrivateData(address _user, string memory _key) public view returns (string memory) {
        require(_user != address(0), "Invalid user address");
        for (uint i = 0; i < userData[_user].length; i++) {
            if (keccak256(bytes(userData[_user][i].key)) == keccak256(bytes(_key)) && userData[_user][i].accessList[msg.sender]) {
                return userData[_user][i].value;
            }
        }
        revert("Access denied or key not found");
    }
}
