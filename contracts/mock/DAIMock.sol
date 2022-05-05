// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DAIMock is ERC20 
{
  constructor() ERC20("DAI", "dai") {}

  function mint(uint256 amount) public {
    _mint(msg.sender, amount);
  }
}
