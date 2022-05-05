# Techincal assessment for gDEX
Goal: create a smart contract that allows anyone to create linear vesting schedules for 
any ERC20 token(s).

## Mint

1. Anyone can call the function mint(tokenAddress, to, amount, time) to create a linear vesting schedule. The first parameter is a DAI token address, and is 18 decimals. 
For example, if a user should be able to call
mint(&quot;0x6B175474E89094C44Da98b954EedeAC495271d0F&quot;, to Add, 1e20, 1 year) on Ethereum, and it would allow to Add to redeem() 100 DAI tokens over a year.
Of course whoever calls mint() needs to provide all the tokens first. The redeem() schedule is linear so this means at quarter year, toAddr can redeem() 25 DAIs, and at half a year, toAddr can redeem up to 50 DAI. There&#39;s also no cliff so toAddr can start redeeming DAI tokens as soon as they receive it. It&#39;s just the amount they can redeem would be smaller.

## Redeem

2. There should be a function to redeem the token with parameters Redeem(unit scheduleId).
Note we’re not looking for redeem(address ERC20 Token) because each token could have any number of different schedules configured.
If a user is redeeming from one particular schedule, that should already imply the token address. Your function should redeem all of the tokens available for redemption for an easy user experience.

# How to configure

copy .env.example file to .env and set the appropriate keys.

# How to Run Tests

```
npm i
npm run compile
npm run test
```

# How to deploy && verify
```
npm i
npm run compile
npx hardhat deployContract --network rinkeby
npx hardhat verifyContract --addr [contract address] --network rinkeby
```

## Deployed contract on

<a href="https://rinkeby.etherscan.io/address/0x5ADE6C91D3D54FF7F6B86F0105633A8Df4Bb8d85#code">Rinkeby</a>
