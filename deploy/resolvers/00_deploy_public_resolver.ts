import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre
  const { deploy } = deployments
  const { deployer, owner } = await getNamedAccounts()

  const registry = await ethers.getContract('ENSRegistry', deployer)
  const nameWrapper = await ethers.getContract('NameWrapper', deployer)
  const controller = await ethers.getContract(
    'ETHRegistrarController',
    deployer,
  )
  const reverseRegistrar = await ethers.getContract(
    'ReverseRegistrar',
    deployer,
  )

  const deployArgs = {
    from: deployer,
    args: [
      registry.address,
      nameWrapper.address,
      controller.address,
      reverseRegistrar.address,
    ],
    log: true,
  }
  const publicResolver = await deploy('PublicResolver', deployArgs)
  if (!publicResolver.newlyDeployed) return

  const tx = await reverseRegistrar.setDefaultResolver(publicResolver.address)
  console.log(
    `Setting default resolver on ReverseRegistrar to PublicResolver (tx: ${tx.hash})...`,
  )
  await tx.wait()

  if (
    (await registry.owner(ethers.utils.namehash('resolver.op'))) === deployer
  ) {
    const pr = (await ethers.getContract('PublicResolver')).connect(
      await ethers.getSigner(deployer),
    )
    const resolverHash = ethers.utils.namehash('resolver.op')
    const tx2 = await registry.setResolver(resolverHash, pr.address)
    console.log(
      `Setting resolver for resolver.op to PublicResolver (tx: ${tx2.hash})...`,
    )
    await tx2.wait()

    const tx3 = await pr['setAddr(bytes32,address)'](resolverHash, pr.address)
    console.log(
      `Setting address for resolver.op to PublicResolver (tx: ${tx3.hash})...`,
    )
    await tx3.wait()
  } else {
    console.log(
      'resolver.eth is not owned by the owner address, not setting resolver',
    )
  }
}

func.id = 'resolver'
func.tags = ['resolvers', 'PublicResolver']
func.dependencies = [
  'registry',
  'ETHRegistrarController',
  'NameWrapper',
  'ReverseRegistrar',
]

export default func
