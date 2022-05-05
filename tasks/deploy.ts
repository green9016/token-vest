import { task } from 'hardhat/config'

task('deployContract', 'deploys an TokenVest')
    .setAction(async () => {
        // @ts-ignore
        const tokenVestFactory = await hre.ethers.getContractFactory('TokenVest')
        const tokenVest = await tokenVestFactory.deploy()
        await tokenVest.deployed()
        console.log('deployed to: ', tokenVest.address)
    })
