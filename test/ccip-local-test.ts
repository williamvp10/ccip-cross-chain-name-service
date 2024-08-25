import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

describe("CCIPLocalTest", function () {
    let simulator: Contract;
    let register: Contract;
    let receiver: Contract;
    let lookupSource: Contract;
    let lookupReceiver: Contract;

    const aliceAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const name = "alice.ccns";

    before(async function () {
        // Deploy the CCIPLocalSimulator contract
        const localSimulatorFactory = await ethers.getContractFactory("CCIPLocalSimulator");
        simulator = await localSimulatorFactory.deploy();
        await simulator.deployed();

        // Retrieve the router address and the lookup contract
        const config = await simulator.configuration();
        const routerAddress = config.sourceRouter_;

        // Deploy the CrossChainNameServiceLookup contract (common for both)
        const CrossChainNameServiceLookup = await ethers.getContractFactory("CrossChainNameServiceLookup");
        lookupSource = await CrossChainNameServiceLookup.deploy();
        await lookupSource.deployed();

        lookupReceiver = await CrossChainNameServiceLookup.deploy();
        await lookupReceiver.deployed();

        // Deploy the CrossChainNameServiceRegister contract
        const CrossChainNameServiceRegister = await ethers.getContractFactory("CrossChainNameServiceRegister");
        register = await CrossChainNameServiceRegister.deploy(routerAddress, lookupSource.address);
        await register.deployed();

        // Deploy the CrossChainNameServiceReceiver contract
        const CrossChainNameServiceReceiver = await ethers.getContractFactory("CrossChainNameServiceReceiver");
        receiver = await CrossChainNameServiceReceiver.deploy(routerAddress, lookupReceiver.address, config.chainSelector_);
        await receiver.deployed();

        // Enable the chain on the register contract
        await register.enableChain(config.chainSelector_, receiver.address, 200000);

        // Set the addresses in the lookup contracts
        await lookupSource.setCrossChainNameServiceAddress(register.address);
        await lookupReceiver.setCrossChainNameServiceAddress(receiver.address);
    });

    it("should register and lookup a cross chain name", async function () {
        // Register the name
        await register.register(name);

        // Lookup the name
        const lookedUpAddress = await lookupSource.lookup(name);
        console.log("Looked up address: ", lookedUpAddress, aliceAddress);
        // Verify the result
        expect(lookedUpAddress).to.equal(aliceAddress);
    });
});
