// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PublicPass {
    struct PublicData {
        string key;
        string value;
    }

    mapping(address => PublicData[]) public publicUserData;

    event PublicDataStored(address indexed user, string key);

    function storePublicData(string memory _key, string memory _value) public {
        publicUserData[msg.sender].push(PublicData({
            key: _key,
            value: _value
        }));
        emit PublicDataStored(msg.sender, _key);
    }

    function getPublicData(address _user, string memory _key) public view returns (string memory) {
        require(_user != address(0), "Invalid user address");
        for (uint i = 0; i < publicUserData[_user].length; i++) {
            if (keccak256(bytes(publicUserData[_user][i].key)) == keccak256(bytes(_key))) {
                return publicUserData[_user][i].value;
            }
        }
        revert("Key not found");
    }
}
