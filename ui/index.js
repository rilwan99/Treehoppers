const express = require("express");
const bodyParser = require("body-parser");
const { 
  PublicKey, Connection, clusterApiUrl, 
  LAMPORTS_PER_SOL, Keypair, SystemProgram, Transaction 
} = require("@solana/web3.js");
const { AnchorProvider, getProvider, Program } = require("@project-serum/anchor");
const { createAssociatedTokenAccountInstruction, createInitializeMintInstruction, 
  getAssociatedTokenAddress, getMinimumBalanceForRentExemptMint, MINT_SIZE, TOKEN_PROGRAM_ID 
} = require("@solana/spl-token");
const idl = require("../target/idl/treehoppers_contract.json")

// Create a new Express.js web server
const app = express();
const fs = require('fs');

app.use(bodyParser.json());

//Testing endpoint to see if the post request works
app.post('/', (req,res) => {
  // Send a success message as a response
  res.send('API called success');
})

app.get('/generateKey', (req, res) => {
  try {
    // generate a new key pair
    const keypair = new Keypair();
    const publicKey = keypair.publicKey
    const secretKey = keypair.secretKey

    console.log(publicKey)
    console.log(secretKey)
    // store the keys in a text file locally
    fs.writeFileSync('keys.txt', `Public key: ${publicKey}\nPrivate key: ${secretKey}`);

    // return the public and private keys
    res.send({
      publicKey: keypair.publicKey,
      privateKey: keypair.secretKey,
    });
  } catch (err) {
    // handle errors
    res.status(500).send({ error: err.message });
  }
});

// Set the route for the '/mint' endpoint
app.post("/mint", (req, res) => {

  // Destructure request body to extract relevant fields

  // Generate ipfs/arweave link for image & Metadata

  // Modify variables accordingly
  const title = "TEST Title"
  const symbol = "TEST"
  const uri = "" // JSON Metadata

  handleMintFunction()

  // Send a success message to the user
  res.send("NFT Minted successfully!");
});

const handleMintFunction = () => {

  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );
  const TREEHOPPERS_PROGRAM_ID = new PublicKey("BgAh9RE8D5119VA1q28MxPMx77mdbYxWc7DPB5ULAB5x")

  // Setup for contract interaction
  const connection = new Connection(clusterApiUrl('devnet'))
  const provider = new AnchorProvider(connection, userAccount, AnchorProvider.defaultOptions())
  const program = new Program(idl, TREEHOPPERS_PROGRAM_ID, provider)

  const mintAccount = Keypair.generate()
  const userAccount = Keypair.generate()
  let nftTokenAccount;
  let metadataAccount;
  let masterEditionAccount;

  const getMetadataAccount = async (mint_account) => {
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
  const getMasterEditionAccount = async (mint_account) => {
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

  (async function() {
    // Create Account for user
    const customConnection = new Connection(process.env.CUSTOM_DEVNET_RPC)
    const airdrop = await customConnection.requestAirdrop(userAccount.publicKey, 2 * LAMPORTS_PER_SOL)
    console.log("Airdrop transaction: ", airdrop)
    const balance = await provider.connection.getBalance(userAccount.publicKey)
    console.log("User Account balance: ", balance / LAMPORTS_PER_SOL)

    // Create & Initialize Mint Account
    const rent_lamports = await getMinimumBalanceForRentExemptMint(program.provider.connection)
    const createMintInstruction = SystemProgram.createAccount({
      fromPubkey: userAccount.publicKey,
      newAccountPubkey: mintAccount.publicKey,
      lamports: rent_lamports,
      space: MINT_SIZE,
      programId: TOKEN_PROGRAM_ID,
    })
    const initializeMintInstruction = createInitializeMintInstruction(
      mintAccount.publicKey,
      0,
      userAccount.publicKey,
      userAccount.publicKey
    )
    // Get address of (Associated) Token Account
    nftTokenAccount = await getAssociatedTokenAddress(
      mintAccount.publicKey,
      userAccount.publicKey
    )
    const createAtaInstruction = createAssociatedTokenAccountInstruction(
      userAccount.publicKey,
      nftTokenAccount,
      userAccount.publicKey,
      mintAccount.publicKey,
    )
    const transactions = new Transaction().add(
      createMintInstruction, 
      initializeMintInstruction, 
      createAtaInstruction
    )
    const response = await provider.sendAndConfirm(transactions, [mintAccount, userAccount]);

    console.log("Transaction Signature: ", response);
    console.log("Mint Account address: ", mintAccount.publicKey.toString());
    console.log("User Account address: ", userAccount.publicKey.toString());
    console.log("[NFT] Token Account address: ", nftTokenAccount.toString(), {skipPreflight: true});
  })()

  (async function() {
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
    .mintNft(mintAccount.publicKey, uri, title, symbol)
    .accounts({
      mintAuthority: userAccount.publicKey, 
      mintAccount: mintAccount.publicKey, 
      tokenProgram: TOKEN_PROGRAM_ID, 
      metadataAccount: metadataAccount,
      tokenAccount: nftTokenAccount, 
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID, 
      payer: userAccount.publicKey, 
      systemProgram: SystemProgram.programId, 
      rent: SYSVAR_RENT_PUBKEY, 
      masterEdition: masterEditionAccount
    })
    .signers([userAccount])
    .rpc({commitment: "processed"})
    console.log("Transaction Signature: ", mintTransaction)
    console.log("NFT Token Account---")
    console.log(
      await program.provider.connection.getParsedAccountInfo(nftTokenAccount)
    );
  })()
}



// Start the Express.js web server
app.listen(3000, () => console.log("Express.js API listening on port 3000"));