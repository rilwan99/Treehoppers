import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { TreehoppersContract } from "../target/types/treehoppers_contract";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { LAMPORTS_PER_SOL, PublicKey, Keypair, SystemProgram, Transaction, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";

describe("treehoppers-contract", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.TreehoppersContract as Program<TreehoppersContract>;

  // Define constants and functions to derive pda addresses
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );
  const lamports: number = MINT_SIZE;
  const mintAccount: Keypair = Keypair.generate();
  const owner = provider.wallet;
  const getMetadataAccount = async (mint_account: PublicKey): Promise<PublicKey> => {
    return (
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint_account.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
    )[0];
  };
  const getMasterEditionAccount = async (mint_account: PublicKey): Promise<PublicKey> => {
    return (
      await PublicKey.findProgramAddressSync(
        [
          Buffer.from("metadata"),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint_account.toBuffer(),
          Buffer.from("edition"),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
    )[0];
  };

  // Variables storing Public keys of following accounts 
  let nftTokenAccount;
  let metadataAccount;
  let masterEditionAccount;

  it("Initialize Mint and Token accounts", async () => {

    // Create & Initialize Mint Account
    const rent_lamports = await getMinimumBalanceForRentExemptMint(program.provider.connection)
    const createMintInstruction = SystemProgram.createAccount({
      fromPubkey: owner.publicKey,
      newAccountPubkey: mintAccount.publicKey,
      lamports: rent_lamports,
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
    })
    const initializeMintInstruction = createInitializeMintInstruction(
      mintAccount.publicKey,
      0,
      owner.publicKey,
      owner.publicKey
    )
    // Create (Associated) Token Account
    nftTokenAccount = await getAssociatedTokenAddress(
      mintAccount.publicKey,
      owner.publicKey
    )
    const createAtaInstruction = createAssociatedTokenAccountInstruction(
      owner.publicKey,
      nftTokenAccount,
      owner.publicKey,
      mintAccount.publicKey,
    )
    const transactions = new Transaction().add(
      createMintInstruction, 
      initializeMintInstruction, 
      createAtaInstruction
    )
    const response = await provider.sendAndConfirm(transactions, [mintAccount]);

    console.log("Transaction Signature: ", response);
    console.log("Mint Account address: ", mintAccount.publicKey.toString());
    console.log("User Account address: ", owner.publicKey.toString());
    console.log("[NFT] Token Account address: ", nftTokenAccount.toString());
  });

  it("Send Mint NFT Instruction", async() => {

    metadataAccount = await getMetadataAccount(mintAccount.publicKey);
    masterEditionAccount = await getMasterEditionAccount(mintAccount.publicKey);
    console.log("Metadata Account address: ", metadataAccount.toString());
    console.log("MasterEdition Account address: ", masterEditionAccount.toString());

    // Define variables specifying NFT Properties
    // Points to off-chain JSON file, containing image for NFT and other properties
    const uri = "https://metadata.y00ts.com/y/2952.json" 
    const title = "TREEHOPPERS"
    const symbol = "3HOP"

    const mintTransaction = await program.methods
    .mintNft(owner.publicKey, uri, title, symbol)
    .accounts({
      mintAuthority: owner.publicKey, 
      mintAccount: mintAccount.publicKey, 
      tokenProgram: TOKEN_PROGRAM_ID, 
      metadataAccount: metadataAccount,
      tokenAccount: nftTokenAccount, 
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID, 
      payer: owner.publicKey, 
      systemProgram: SystemProgram.programId, 
      rent: SYSVAR_RENT_PUBKEY, 
      masterEdition: masterEditionAccount
    })
    .rpc()
    console.log("Transaction Signature: ", mintTransaction)
  })
});
