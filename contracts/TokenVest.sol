// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";

contract TokenVest {
    event Minted(address indexed tokenAddress, address indexed from, address indexed to, uint256 amount, uint256 createdAt, uint256 duration, uint256 scheduleId);
    event Redeemed(uint256 indexed scheduleId, address indexed to, uint256 redeemedAt, uint256 redeemAmount);

    struct Schedule {
        address tokenAddress;
        address from;
        address to;
        uint256 amount;
        uint256 createdAt;
        uint256 duration;
        uint256 redeemedAmount;
        uint256 lastRedeemedAt;
    }

    using SafeMath for uint256;
    using Counters for Counters.Counter;

    mapping (uint256 => Schedule)   private _schedules;     // mapping (scheduleId => Schedule)
    Counters.Counter                private _scheduleId;    // schedule id starts with 1.

    constructor() {}

    function getSchedule(uint256 scheduleId) 
        public view 
        returns (Schedule memory) 
    {
        return _schedules[scheduleId];
    }

    ///@dev create a schedule
    ///@param tokenAddress ERC20 token address to be schedule vested.
    ///@param to destination address to be vested
    ///@param amount amount to be vested in 18 decimals
    ///@param duration duration to be schduled in seconds
    function mint(address tokenAddress, address to, uint256 amount, uint256 duration) 
        external
    {
        // check params are valid.
        require (tokenAddress != address(0), "invalid token address");
        require (to != address(0), "invalid dest address");
        require (to != msg.sender, "to should not be sender");
        require (amount > 0, "amount should not be zero");
        require (duration > 0, "duration should not be zero");

        // check tokenAddress allowance.
        uint256 allowance = IERC20(tokenAddress).allowance(msg.sender, address(this));
        require (allowance >= amount, "not approved to mint");

        // increase first.
        _scheduleId.increment();
        uint256 scheduleId = _scheduleId.current();

        // store schedule data
        _schedules[scheduleId] = Schedule({
            tokenAddress: tokenAddress,
            from: msg.sender,
            to: to,
            amount: amount,
            createdAt: block.timestamp,
            duration: duration,
            redeemedAmount: 0,
            lastRedeemedAt: block.timestamp
        });

        // emit Minted event.
        emit Minted(tokenAddress, msg.sender, to, amount, block.timestamp, duration, scheduleId);
    }

    ///@dev redeem schedule amount
    ///@param scheduleId schedule id
    function redeem(uint256 scheduleId) 
        external 
    {
        Schedule storage schedule = _schedules[scheduleId];
        require (schedule.tokenAddress != address(0), "invalid schedule id");
        require (schedule.to == msg.sender, "not an redeemer");
        require (schedule.amount.sub(schedule.redeemedAmount) > 0, "no amount to be redeemed");
        
        // calc redeem amount.
        // if current duration is greater than schedule duration, then force to use schedule amount
        // because there can be division loss.
        uint256 redeemAmount;
        if (schedule.createdAt.add(schedule.duration) <= block.timestamp) {
            redeemAmount = schedule.amount.sub(schedule.redeemedAmount);
        }
        else {
            redeemAmount = schedule.amount.mul(block.timestamp.sub(schedule.lastRedeemedAt)).div(schedule.duration);

            // need to prevent in case of redeemAmount is 0.
            // if amount is as small as enough or duration is as big as enough, then redeemAmount will be 0.
            require (redeemAmount > 0, "redeemed too early");
        }

        // transfer tokens
        // token owner already approved this contract so we can transfer the tokens.
        // note: msg.sender is schedule.to
        IERC20(schedule.tokenAddress).transferFrom(schedule.from, schedule.to, redeemAmount);

        // store redeemed amount
        schedule.redeemedAmount = schedule.redeemedAmount.add(redeemAmount);
        schedule.lastRedeemedAt = block.timestamp;
        // emit Redeemed event.
        emit Redeemed(scheduleId, msg.sender, block.timestamp, redeemAmount);
    }
}
