const express = require("express");
const bodyParser = require("body-parser");
const {
  PublicKey, Connection, clusterApiUrl, LAMPORTS_PER_SOL, Keypair, 
  SystemProgram, Transaction, SYSVAR_RENT_PUBKEY
} = require("@solana/web3.js");
const {
  AnchorProvider, Program,
} = require("@project-serum/anchor");
const {
  createAssociatedTokenAccountInstruction, createInitializeMintInstruction,
  getAssociatedTokenAddress, getMinimumBalanceForRentExemptMint, MINT_SIZE, TOKEN_PROGRAM_ID
} = require("@solana/spl-token");
const idl = require("../target/idl/treehoppers_contract.json")
require("dotenv").config({ path: "../.env" });

// Load ENV Variables
const CUSTOM_DEVNET_RPC = process.env.CUSTOM_DEVNET_RPC;
const JWT = process.env.JWT;

// Create a new Express.js web server
const app = express();
const fs = require('fs');
const pinataSDK = require('@pinata/sdk');
const { setDefaultResultOrder } = require("dns");
const { default: NodeWallet } = require("@project-serum/anchor/dist/cjs/nodewallet");
const pinata = new pinataSDK({ pinataJWTKey: JWT });

app.use(bodyParser.json());

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

app.post('/uploadImage', (req, res) => {
  // this endpoint will receive an image path  
  const image_path = req.body["image_path"]
  const image = fs.createReadStream(image_path);
  const options = {
    pinataMetadata: {
      name: "test"
    },
    pinataOptions: {
      cidVersion: 0
    }
  };
  pinata.pinFileToIPFS(image, options).then((result) => {
    //handle results here
    console.log(result);
    // Index the data from the user
    image_CID = result["IpfsHash"]
    res.send(image_CID)
  }).catch((err) => {
    //handle error here
    console.log(err);
  });

})

app.post('/uploadData', (req, res) => {
  // Construct URI, using IPFS browser gateway
  image_URI = req.body["image_URI"]
  title = req.body["title"]
  symbol = req.body["symbol"]
  const options = {
    pinataMetadata: {
      name: "test"
    },
    pinataOptions: {
      cidVersion: 0
    }
  };
  //Construct json meta data, with user params and ipfs cid from image
  // const metadata = {
  //   "title": title,
  //   "type": "object",
  //   "properties": {
  //     "name": {
  //       "type": "string",
  //       "description": "Identifies the asset to which this token represents"
  //     },
  //     "description": {
  //       "type": "string",
  //       "description": "Describes the asset to which this token represents"
  //     },
  //     "image": {
  //       "type": "string",
  //       "description": "A URI pointing to a resource with mime type image/* representing the asset to which this token represents. Consider making any images at a width between 320 and 1080 pixels and aspect ratio between 1.91:1 and 4:5 inclusive."
  //     },
  //     "external_url": {
  //       "type": "string",
  //       "description": image_URI
  //     },
  //     "seller_fee_basis_points": {
  //       "type": "number"
  //     },
  //     "properties": {
  //       "type": "object",
  //       "description": "Arbitrary properties. Values may be strings, numbers, object or arrays.",
  //       "properties": {
  //         "creators": {
  //           "type": "array",
  //           "description": "Contains list of creators, each with Solana address and share of the nft"
  //         }
  //       }
  //     }
  //   }
  // }
  const metadata = {
    "title": title,
    "symbol": symbol,
    "description":"y00ts is a generative art project of 15,000 NFTs. y00topia is a curated community of builders and creators. Each y00t was designed by De Labs in Los Angeles, CA.",
    "image":image_URI,
    "attributes":[
      {"trait_type":"Background","value":"1/1"},
      {"trait_type":"Fur","value":"1/1"},
      {"trait_type":"Face","value":"1/1"},
      {"trait_type":"Clothes","value":"1/1"},
      {"trait_type":"Eyewear","value":"1/1"},
      {"trait_type":"Head","value":"1/1"},
      {"trait_type":"1/1","value":"Coded y00t"}
    ],
    "properties":{
      "files":[
        {"uri":image_URI,
        "type":"image/png"}
      ],"category":null}}
  // Upload metadata to ipfs
  pinata.pinJSONToIPFS(metadata, options).then((result) => {
    //handle results here
    console.log(result);
    res.send(result["IpfsHash"])

  }).catch((err) => {
    //handle error here
    console.log(err);
  });
})

// Set the route for the '/mint' endpoint
app.post("/mint", (req, res) => {
  console.log("/mint endpoint---------")

  // Destructure request body to extract relevant fields
  const publicKey = req.body['publicKey']
  const privateKey = req.body['privateKey']
  const title = req.body['title']
  const symbol = req.body['symbol']
  let uri = req.body['metadata']

  // Create keypair from private key
  const privateKeyArray = Uint8Array.from(
    Object.entries(privateKey).map(([key, value]) => value)
  );

  const userAccount = Keypair.fromSecretKey(privateKeyArray)
  console.log(userAccount.publicKey.toString())

  // Convert IPFS hash to link
  uri = "https://api.ipfsbrowser.com/ipfs/get.php?hash=" + uri
  console.log(uri)

  let mintTransaction;
  handleMintFunction(userAccount, title, symbol, uri).then(result => {
    mintTransaction = result;
  })

  // Send a success message to the user
  res.send(`NFT Minted successfully! + ${mintTransaction}`);
});

const handleMintFunction = async (userAccount, title, symbol, uri) => {

  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
  );
  const TREEHOPPERS_PROGRAM_ID = new PublicKey("BgAh9RE8D5119VA1q28MxPMx77mdbYxWc7DPB5ULAB5x")

  // Setup for contract interaction
  const connection = new Connection(clusterApiUrl('devnet'))
  const provider = new AnchorProvider(connection, new NodeWallet(userAccount), AnchorProvider.defaultOptions())
  const program = new Program(idl, TREEHOPPERS_PROGRAM_ID, provider)

  const mintAccount = Keypair.generate()
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

  const setUpWallet = async () => {
    // Create Account for user
    const customConnection = new Connection(CUSTOM_DEVNET_RPC)
    const airdrop = await customConnection.requestAirdrop(userAccount.publicKey, 2 * LAMPORTS_PER_SOL)
    console.log("Airdrop transaction: ", airdrop)
    const balance = await customConnection.getBalance(userAccount.publicKey)
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
    console.log("[NFT] Token Account address: ", nftTokenAccount.toString(), { skipPreflight: true })
  }

  const mintNft = async () => {
    metadataAccount = await getMetadataAccount(mintAccount.publicKey);
    masterEditionAccount = await getMasterEditionAccount(mintAccount.publicKey);
    console.log("Metadata Account address: ", metadataAccount.toString());
    console.log("MasterEdition Account address: ", masterEditionAccount.toString());

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
      .rpc({ commitment: "processed" })
    console.log("Transaction Signature: ", mintTransaction)
    console.log("NFT Token Account---")
    console.log(
      await program.provider.connection.getParsedAccountInfo(nftTokenAccount)
    );
    return mintTransaction
  }
  await setUpWallet();
  const result = await mintNft();

  return result
}

// Start the Express.js web server
app.listen(3000, () => console.log("Express.js API listening on port 3000"));