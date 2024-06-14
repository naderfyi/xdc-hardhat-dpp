// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract PrivatePass {
    struct Data {
        string key;
        string value;
        address[] allowedAddresses;
    }

    mapping(address => Data[]) private userData;

    function storePrivateData(string memory _key, string memory _value, address[] memory _allowedAddresses) public {
        Data memory newData = Data({
            key: _key,
            value: _value,
            allowedAddresses: _allowedAddresses
        });
        userData[msg.sender].push(newData);
    }

    function getPrivateData(address _user) public view returns (string[] memory, string[] memory) {
        require(isAllowed(_user, msg.sender), "Not allowed to view data");
        Data[] memory dataList = userData[_user];
        string[] memory keys = new string[](dataList.length);
        string[] memory values = new string[](dataList.length);

        for (uint i = 0; i < dataList.length; i++) {
            keys[i] = dataList[i].key;
            values[i] = dataList[i].value;
        }

        return (keys, values);
    }

    function isAllowed(address _user, address _viewer) private view returns (bool) {
        if (_user == _viewer) return true;
        Data[] memory dataList = userData[_user];
        for (uint i = 0; i < dataList.length; i++) {
            for (uint j = 0; j < dataList[i].allowedAddresses.length; j++) {
                if (dataList[i].allowedAddresses[j] == _viewer) {
                    return true;
                }
            }
        }
        return false;
    }
}
