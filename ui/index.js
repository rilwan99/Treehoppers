const express = require("express");
const bodyParser = require("body-parser");
const idl = require("../target/idl/treehoppers_contract.json")
require("dotenv").config({ path: "../.env" });
const firebase = require("firebase/app");

const { initializeApp } = require("firebase/app");
const { collection, doc, getDoc, getDocs, setDoc, 
  getFirestore } = require("firebase/firestore"); 
const {
  PublicKey, Connection, clusterApiUrl, LAMPORTS_PER_SOL, Keypair, 
  SystemProgram, Transaction, SYSVAR_RENT_PUBKEY } = require("@solana/web3.js");
const {
  AnchorProvider, Program,
} = require("@project-serum/anchor");
const {
  createAssociatedTokenAccountInstruction, createInitializeMintInstruction,
  getAssociatedTokenAddress, getMinimumBalanceForRentExemptMint, MINT_SIZE, TOKEN_PROGRAM_ID
} = require("@solana/spl-token");
const { Metaplex } = require("@metaplex-foundation/js")

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

// Initailize Firebase app
const firebaseConfig = {
  apiKey: "AIzaSyDPU4hsOOXzMJ7dkRYQHVsn_t-4WVJui2o",
  authDomain: "treehoppers-2d811.firebaseapp.com",
  projectId: "treehoppers-2d811",
  storageBucket: "treehoppers-2d811.appspot.com",
  messagingSenderId: "121650851156",
  appId: "1:121650851156:web:4c3046302f894cdc336cc1",
  measurementId: "G-3E4JJ06RHQ"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const insertKeysFirebase = async (userId, userHandle) => {
  try {
    const keypair = new Keypair();
    const publicKey = keypair.publicKey;
    const secretKey = keypair.secretKey;

    docData = {
      publicKey: publicKey.toString(),
      privateKey: Array.from(secretKey),
      username: userHandle,
    };
    await setDoc(doc(db, "UserCollection", userId.toString()), docData);

    docDataNew = {
      publicKey: publicKey.toString(),
      privateKey: Array.from(secretKey),
      username: userHandle,
      new_wallet: true, // for the telegram bot side if its a new wallet, we will send a different message
    };
    return docDataNew;

  } catch (err) {
    console.log(err);
  }
};

const getKeysFirebase = async (telegramUserId, telegramUserName) => {
  try {
    const docRef = doc(db, "UserCollection", telegramUserId.toString());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      console.log(`User ${telegramUserId} has an existing wallet!`);
      docData = docSnap.data();
      // for the telegram bot side if its a new wallet, we will send a different message
      docData["new_wallet"] = false;
      return docData;
    } else {
      // creating new keys if the user does not have a wallet
      return insertKeysFirebase(telegramUserId, telegramUserName);
    }
  } catch (err) {
    console.log(err);
  }
};

const getMerchantsFirebase = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "MerchantCollection"));
    const merchantIds = []
    querySnapshot.forEach((doc) => {
      merchantIds.push(doc.id)
    })
    return merchantIds
  } catch (err) {
    console.log("Firebase error", err)
  }
}

const getMerchantInfoFirebase = async (merchantId) => {
  try {
    const docRef = doc(db, "MerchantCollection", merchantId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      docData = docSnap.data();
      return docData
    } else {
      console.log("Invalid Merhcant ID provided")
    }
  } catch (err) {
    console.log(err)
  }
}

const getNFTList = async (publicKey) => {
  const connection = new Connection(clusterApiUrl('devnet'))
  const metaplex = new Metaplex(connection)
  const myNfts = await metaplex.nfts().findAllByOwner({
    owner: publicKey
  });
  const nftInfoArray = []
  myNfts.forEach(nftMetadata => {
    nftInfoArray.push({
      name: nftMetadata.name, 
      symbol: nftMetadata.symbol, 
      mintAddress: nftMetadata.mintAddress.toString() 
    })
  })
  return nftInfoArray
}

app.use(bodyParser.json());

app.post('/retrieveKey', (req, res) => {
  try {
    const telegramUserId = req.body["id"]
    const telegramUserName = req.body["handle"];
    getKeysFirebase(telegramUserId, telegramUserName).then((result) => {
      res.send({
        publicKey: result.publicKey,
        privateKey: result.privateKey,
        walletStatus: result.new_wallet,
      });
    });
  } catch (err) {
    console.log(err)
  }
})

app.get('/retrieveMerchants', (req, res) => {
  try {
    getMerchantsFirebase().then(result => {
      res.send({merchantList: result})
    })
  } catch (err) {
    console.log(err)
  }
})

app.post("/coupons", (req, res) => {
  try {
    // const privateKey = req.body["privateKey"];
    const publicKey = new PublicKey(req.body["publicKey"])
    getNFTList(publicKey).then((result) => {
      console.log(result);
      res.send(result);
    });
  } catch (err) {
    console.log(err);
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

  const metadata = {
    "title": "Grab Voucher",
    "symbol": "Grab #001",
    "description":"Grab voucher available for in-app use as well as live redemption during trips",
    "image": "https://ipfs.io/ipfs/QmV1EYP9co69TVGF2GXzbyVXUrSXuJnGYje7JzQrzpDngY",
    "attributes":[
      {"trait_type":"Membership","value":"basic"},
      {"trait_type":"Redemption points","value":"10"},
      {"trait_type":"Valid till","value":"31/12/2022"},
      {"trait_type": "owner", "value": "@jackDorsey101"},
      {"trait_type": "expired", "value": "false"},
    ],
    "properties":{
      "files":[
        {"uri": "https://ipfs.io/ipfs/QmV1EYP9co69TVGF2GXzbyVXUrSXuJnGYje7JzQrzpDngY",
        "type":"image/png"}
      ],"category":null}}
  // Upload metadata to ipfs
  pinata.pinJSONToIPFS(metadata, options)
  .then((result) =>  {
    console.log(result)
    res.send(result["IpfsHash"])
  })
  .catch((err) => console.log(err));
})

app.post("/mint", (req, res) => {

  const publicKey = req.body['publicKey']
  const privateKey = req.body['privateKey']
  let merchantId = req.body['MerchantId']
  merchantId = 'Grab' // To Remove

  let mintTransaction;
  let title;
  let symbol;
  let uri;

  // Create keypair from private key
  const privateKeyArray = Uint8Array.from(
    Object.entries(privateKey).map(([key, value]) => value)
  );
  const userAccount = Keypair.fromSecretKey(privateKeyArray)

  getMerchantInfoFirebase(merchantId)
  .then(result => {
    title = result.Title;
    symbol = result.Symbol;
    uri = "https://ipfs.io/ipfs/" + result.URI;
  })
  .then(() => {
    console.log(title)
    console.log(symbol)
    console.log(uri)
    handleMintFunction(userAccount, title, symbol, uri)
  })
  .then(result => {
    mintTransaction = result;
    res.send(`${mintTransaction}`);
  })
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
    // const airdrop = await customConnection.requestAirdrop(userAccount.publicKey, 2 * LAMPORTS_PER_SOL)
    // console.log("Airdrop transaction: ", airdrop)
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
    const response = await provider.sendAndConfirm(transactions, [mintAccount, userAccount], {commitment: "processed"});

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
    return mintTransaction
  }
  await setUpWallet();
  const result = await mintNft();

  return mintAccount.publicKey.toString()
}

// Start the Express.js web server
app.listen(3000, () => console.log("Express.js API listening on port 3000"));