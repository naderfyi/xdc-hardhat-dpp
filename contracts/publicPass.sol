// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PublicPass {
    struct PublicData {
        string key;
        string value;
    }

    mapping(address => PublicData[]) public publicUserData;

    function storePublicData(string memory _key, string memory _value) public {
        PublicData memory newData = PublicData({
            key: _key,
            value: _value
        });
        publicUserData[msg.sender].push(newData);
    }

    function getPublicData(address _user) public view returns (string[] memory, string[] memory) {
        PublicData[] memory dataList = publicUserData[_user];
        string[] memory keys = new string[](dataList.length);
        string[] memory values = new string[](dataList.length);

        for (uint i = 0; i < dataList.length; i++) {
            keys[i] = dataList[i].key;
            values[i] = dataList[i].value;
        }

        return (keys, values);
    }
}
