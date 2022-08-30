// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const ethers = hre.ethers;

/* For Uniswap contract */

let tok1, tok2, factory, router, weth, deployer;

async function getSigners() {
  [deployer] = await ethers.getSigners();
  console.log("Deployer: ", deployer.address);
}

async function deployToken() {
  const TOTAL_SUPPLY = 10000; // ethers.BigNumber.from(10000).mul(10 ** 18);

  const TOKEN1 = await ethers.getContractFactory("token");
  tok1 = await TOKEN1.deploy("Token1", "A", TOTAL_SUPPLY);
  await tok1.deployTransaction.wait();
  console.log("TOKEN1 deployed to:", tok1.address);

  const TOKEN2 = await ethers.getContractFactory("token");
  tok2 = await TOKEN2.deploy("Token2", "B", TOTAL_SUPPLY);
  await tok2.deployTransaction.wait();
  console.log("TOKEN2 deployed to:", tok2.address);

  const WETH = await ethers.getContractFactory("token");
  weth = await WETH.deploy("WETH", "WETH", TOTAL_SUPPLY);
  await weth.deployTransaction.wait();
  console.log("WETH deployed to:", weth.address);

  // time = +new Date();
  // await router.addLiquidity(tok1.address, tok2.address, 2000, 2000, 0, 0, construct, time)
}

async function approveTokens() {
  const token1Address = tok1.address;
  const token2Address = tok2.address;

  const token1 = await ethers.getContractAt("token", token1Address);
  const token2 = await ethers.getContractAt("token", token2Address);

  const APPROVE =
    "115792089237316195423570985008687907853269984665640564039457584007913129639935"; // 2**256 - 1

  await token1.approve(router.address, APPROVE);
  await token2.approve(router.address, APPROVE);
}

async function deployContracts() {
  // For Core contract
  const core = await ethers.getContractFactory("UniswapV2Factory");
  factory = await core.deploy(deployer.address);
  await factory.deployTransaction.wait();
  console.log("Core contract[Factory] deployed to:", factory.address);

  // For Periphery contract
  const periphery = await ethers.getContractFactory("UniswapV2Router02");
  // const WETH = "0x592C9d813b8FE2e7C4b263Ba7388E93a97633467";  //Deployed by Remix On Ropsten Network:
  router = await periphery.deploy(factory.address, weth.address);
  await router.deployTransaction.wait();
  console.log("Periphery[RouterV2] contract deployed to:", router.address);
  console.log(await factory.INIT_CODE_HASH());
}

async function verifyContracts() {
  await verifyToken(tok1.address, ["Token1", "A", 10000]);
  await verifyToken(tok2.address, ["Token2", "B", 10000]);
  await verifyToken(weth.address, ["WETH", "WETH", 10000]);

  await verify(factory.address, [deployer.address]);
  await verify(router.address, [factory.address, weth.address]);
}

async function main() {
  // We get the contract to deploy
  await getSigners();
  await deployToken();
  await deployContracts();
  await approveTokens();

  await verifyContracts();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function verify(contractAddress, parameters) {
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: parameters,
    });
  } catch (error) {
    console.error(error);
  }
}

async function verifyToken(contractAddress, parameters) {
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: parameters,
      contract: "contracts/test/token.sol:token",
    });
  } catch (error) {
    console.error(error);
  }
}
