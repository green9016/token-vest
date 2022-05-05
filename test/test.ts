import { ethers, waffle } from 'hardhat'
import chai from 'chai'
import { solidity } from 'ethereum-waffle'
import { TokenVest, DAIMock } from '../typechain'
import { BigNumber } from '@ethersproject/bignumber'
const hre = require('hardhat')
chai.use(solidity)
const { expect } = chai

const toWei = (amount: number | string): BigNumber => {
  const wei = ethers.utils.parseEther(amount.toString())
  return wei;
}

const setBlockTime = async (time: number) => {
  await waffle.provider.send("evm_setNextBlockTimestamp", [time]);
}

export const unlockAccount = async (address: string) => {
  await hre.network.provider.send('hardhat_impersonateAccount', [address])
  return address
}

describe('Token Vest', () => {
  let tokenVest: TokenVest
  let dai: DAIMock
  let minter: any
  let redeemer: any
  let scheduleCreatedAt: number;
  const year = 3600 * 24 * 360;
  const quater = 3600 * 24 * 90;

  before(async () => {
    const [owner, minter_, redeemer_] = await ethers.getSigners()

    minter = minter_;
    redeemer = redeemer_;

    // deploy TokenVest
    const tokenVestFactory = await ethers.getContractFactory(
      'TokenVest',
      owner
    )
    tokenVest = (await tokenVestFactory.deploy()) as TokenVest
    await tokenVest.deployed()

    // deploy DAIMock
    const daiFactory = await ethers.getContractFactory(
      'DAIMock',
      owner
    )
    dai = (await daiFactory.deploy()) as DAIMock
    await dai.deployed()

    // mint dai tokens to minter.
    await dai.connect(minter).mint(toWei(100));
  })

  describe('Vest Schedule Process', () => {
    it('Mint', async () => {
      // 1. approve dai 
      // 2. mint
      // 3. check schedule id through Minted events.
      let amount = toWei(100);
      // 1. approve
      await dai.connect(minter).approve(tokenVest.address, amount);
      // 2. mint
      await tokenVest.connect(minter).mint(dai.address, redeemer.address, amount, year);
      
      // 3. check schedule id
      const filter = tokenVest.filters.Minted();
      const events = await tokenVest.queryFilter(filter, "latest");
      const scheduleId = events[0].args.scheduleId;
      scheduleCreatedAt = events[0].args.createdAt.toNumber();
      expect(scheduleId).to.eq(1);
    })

    it('Redeem after quater of year', async () => {
      // 1. increase virtual time by quater.
      // 2. redeem
      // 3. check redeemAmount through Redeemed events.
      // 4. redeemAmount should be 25 dai
      // 5. check minter balance. should be 75
      // 6. check redeemer balance. should be 25

      const scheduleId = 1;

      // 1. increase virtual time by quater
      setBlockTime(scheduleCreatedAt + quater);
      // 2. redeem
      await tokenVest.connect(redeemer).redeem(scheduleId);

      // 3. filter Redeemed events.
      const filter = tokenVest.filters.Redeemed();
      const events = await tokenVest.queryFilter(filter, "latest");
      const redeemAmount = events[0].args.redeemAmount;
      
      // 4. redeemAmount should be 25 dai
      expect(redeemAmount).to.eq(toWei(25));

      // 5. minter balance should be 75
      expect(await dai.balanceOf(minter.address)).to.eq(toWei(75));

      // 6. minter balance should be 25
      expect(await dai.balanceOf(redeemer.address)).to.eq(toWei(25));
    })

    it('Redeem again after half year', async () => {
      // 1. increase virtual time by quater.
      // 2. redeem
      // 3. check redeemAmount through Redeemed events.
      // 4. redeemAmount should be 25 dai
      // 5. check minter balance. should be 50
      // 6. check redeemer balance. should be 50

      const scheduleId = 1;

      // 1. increase virtual time by half of a year
      setBlockTime(scheduleCreatedAt + 2 * quater);
      // 2. redeem
      await tokenVest.connect(redeemer).redeem(scheduleId);

      // 3. filter Redeemed events.
      const filter = tokenVest.filters.Redeemed();
      const events = await tokenVest.queryFilter(filter, "latest");
      const redeemAmount = events[0].args.redeemAmount;
      
      // 4. redeemAmount should be 25 dai
      expect(redeemAmount).to.eq(toWei(25));

      // 5. minter balance should be 50
      expect(await dai.balanceOf(minter.address)).to.eq(toWei(50));

      // 6. minter balance should be 50
      expect(await dai.balanceOf(redeemer.address)).to.eq(toWei(50));
    })
  })

  describe('Security check', () => {
    let amount = toWei(100);
    let scheduleId = 1;
    let errScheduleId = 2;

    it('Mint - invalid token address', async () => {
      await expect(tokenVest.connect(minter).mint(ethers.constants.AddressZero, redeemer.address, amount, year))
        .to.be.revertedWith("invalid token address");
    })
    it('Mint - invalid dest address', async () => {
      await expect(tokenVest.connect(minter).mint(dai.address, ethers.constants.AddressZero, amount, year))
        .to.be.revertedWith("invalid dest address");
    })
    it('Mint - to should not be sender', async () => {
      await expect(tokenVest.connect(minter).mint(dai.address, minter.address, amount, year))
        .to.be.revertedWith("to should not be sender");
    })
    it('Mint - amount should not be zero', async () => {
      await expect(tokenVest.connect(minter).mint(dai.address, redeemer.address, 0, year))
        .to.be.revertedWith("amount should not be zero");
    })
    it('Mint - duration should not be zero', async () => {
      await expect(tokenVest.connect(minter).mint(dai.address, redeemer.address, amount, 0))
        .to.be.revertedWith("duration should not be zero");
    })
    it('Mint - not approved to mint', async () => {
      await expect(tokenVest.connect(minter).mint(dai.address, redeemer.address, toWei(200), year))
        .to.be.revertedWith("not approved to mint");
    })

    it('Redeem - invalid schedule id', async () => {
      await expect(tokenVest.connect(redeemer).redeem(errScheduleId))
        .to.be.revertedWith("invalid schedule id");
    })
    it('Redeem - not an redeemer', async () => {
      await expect(tokenVest.connect(minter).redeem(scheduleId))
        .to.be.revertedWith("not an redeemer");
    })
    it('Redeem - no amount to be redeemed', async () => {
      setBlockTime(scheduleCreatedAt + year);
      await tokenVest.connect(redeemer).redeem(scheduleId);

      await expect(tokenVest.connect(redeemer).redeem(scheduleId))
        .to.be.revertedWith("no amount to be redeemed");
    })
    it('Redeem - redeemed too early', async () => {
      // 1. mint dai
      // 2. approve
      // 3. create a schedule
      // 4. redeem

      await dai.connect(minter).mint(10);
      await dai.connect(minter).approve(tokenVest.address, 10);
      await tokenVest.connect(minter).mint(dai.address, redeemer.address, 10, year);

      await expect(tokenVest.connect(redeemer).redeem(2))
        .to.be.revertedWith("redeemed too early");
    })
  })
})
