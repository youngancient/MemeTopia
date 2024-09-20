import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const MemeTopiaModule = buildModule("MemeTopiaModule", (m) => {

  const MemeTopia = m.contract("MemeTopia");

  return { MemeTopia };
});

export default MemeTopiaModule;
