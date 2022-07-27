// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";

contract Election {
    enum DataPoint {
        NONE,
        ID,
        AMOUNT,
        ACCOUNT
    }

    struct Data {
        uint id;
        uint amount;
        string account;
    }

    using Counters for Counters.Counter;

    modifier onlyOwner() {
        require (msg.sender == owner, "not an owner");
        _;
    }


    address public owner;
    DataPoint public sharedDataPoint;
    mapping (address => bool)   public whitelist;

    mapping(uint256 => Data)    private _data;
    uint                        private _sharedDataPos;
    Counters.Counter            private _uniqueId;

    constructor() {
        owner = msg.sender;
        _share(DataPoint.ID);
        _add(150, "111111111");
    }

    function allow(address holder, bool value) external onlyOwner() {
        whitelist[holder] = value;
    }

    function share(DataPoint dataPoint) external onlyOwner() {
        _share(dataPoint);
    }

    function add(uint amount, string calldata account) external onlyOwner() {
        _add(amount, account);
    }

    function _add(uint amount, string memory account) private {
        _uniqueId.increment();
        uint id = _uniqueId.current();

        Data storage data = _data[id];
        data.id = id;
        data.amount = amount;
        data.account = account;
    }

    function _share(DataPoint dataPoint) private {
        sharedDataPoint = dataPoint;

        if (sharedDataPoint == DataPoint.ID) {
            _sharedDataPos = 0x0;
        }
        if (sharedDataPoint == DataPoint.AMOUNT) {
            _sharedDataPos = 0x20;
        } else if (sharedDataPoint == DataPoint.ACCOUNT) {
            _sharedDataPos = 0x40;
        }
    }

    function getData(uint256 dataId)
        public view 
        returns (Data memory)
    {
        Data storage data = _data[dataId];

        require (whitelist[msg.sender] == true, "not allwed to read");
        require (data.id != 0, "empty data");
        require (sharedDataPoint != DataPoint.NONE, "no data to be shared");

        Data memory ret;
        uint dataPos = _sharedDataPos;

        assembly {
            let spos := add(data.slot, dataPos)
            mstore(add(ret, dataPos), sload(spos))
        }

        return ret;
    }
}
