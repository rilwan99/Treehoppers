const express = require("express");
const bodyParser = require("body-parser");
const { publicKey } = require("@project-serum/anchor/dist/cjs/utils");

// Create a new Express.js web server
const app = express();

app.use(bodyParser.json());

// Set the route for the '/mint' endpoint
app.post("/", (req, res) => {
  // Get the user's public key, title, and symbol from the request body
  const userPublicKey = req.body.publicKey;
  const title = req.body.title;
  const symbol = req.body.symbol;

  // insert contract call here

  // Send a success message to the user
  res.send('NFT Minted successfully!');
});

// Start the Express.js web server
app.listen(3000, () => console.log("Express.js API listening on port 3000"));

