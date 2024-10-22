import MultiSend from "@safe-global/safe-smart-account/build/artifacts/contracts/libraries/MultiSend.sol/MultiSend.json";
import MultiSendCallOnly from "@safe-global/safe-smart-account/build/artifacts/contracts/libraries/MultiSendCallOnly.sol/MultiSendCallOnly.json";
import SafeProxyFactory from "@safe-global/safe-smart-account/build/artifacts/contracts/proxies/SafeProxyFactory.sol/SafeProxyFactory.json";
import SafeL2 from "@safe-global/safe-smart-account/build/artifacts/contracts/SafeL2.sol/SafeL2.json";
import SignMessageLib from "@safe-global/safe-smart-account/build/artifacts/contracts/libraries/SignMessageLib.sol/SignMessageLib.json";
import SimulateTxAccessor from "@safe-global/safe-smart-account/build/artifacts/contracts/accessors/SimulateTxAccessor.sol/SimulateTxAccessor.json";
import CompatibilityFallbackHandler from "@safe-global/safe-smart-account/build/artifacts/contracts/handler/CompatibilityFallbackHandler.sol/CompatibilityFallbackHandler.json";
import CreateCall from "@safe-global/safe-smart-account/build/artifacts/contracts/libraries/CreateCall.sol/CreateCall.json";

import { DeployFunction } from "hardhat-deploy/types";

const deploy: DeployFunction = async ({ deployments, getNamedAccounts, network }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy } = deployments;

    await deploy("IDAFallbackHandler", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("SafeModuleSetup", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("SafeEIP7702ProxyFactory", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("ClearStorageHelper", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("MultiSend", {
        from: deployer,
        contract: MultiSend,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("MultiSendCallOnly", {
        from: deployer,
        contract: MultiSendCallOnly,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("SafeL2", {
        from: deployer,
        contract: SafeL2,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("SignMessageLib", {
        from: deployer,
        contract: SignMessageLib,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("SafeProxyFactory", {
        from: deployer,
        contract: SafeProxyFactory,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("SimulateTxAccessor", {
        from: deployer,
        contract: SimulateTxAccessor,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("CreateCall", {
        from: deployer,
        contract: CreateCall,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("CompatibilityFallbackHandler", {
        contract: CompatibilityFallbackHandler,
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });
};

export default deploy;
