import { task } from 'hardhat/config'

task('verifyContract', 'verify an TokenVest')
    .addParam('addr', 'the address of the deployed contract')
    .setAction(async (taskArgs) => {
        // @ts-ignore
        await hre.run('verify:verify', {
            address: taskArgs.addr,
            constructorArguments: []
        })

        console.log("verified", taskArgs.addr)
    })
