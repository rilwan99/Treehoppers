import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TreehoppersContract } from "../target/types/treehoppers_contract";

describe("treehoppers-contract", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.TreehoppersContract as Program<TreehoppersContract>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
