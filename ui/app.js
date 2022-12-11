const express = require('express')
const app = express()
const { Connection } = require('@solana/web3.js')
const bodyParser = require('body-parser');

// Parse the request body as JSON
app.use(bodyParser.json());

//Testing endpoint to see if the post request works
app.post('/', (req,res) => {
    const publicKey = req.body.publicKey;
    const title = req.body.title;
    const symbol = req.body.symbol;
    // Send a success message as a response
    res.send('API called success');
})

//Minting Endpoint to Mint the NFT
app.post('/mint', (req, res) => {
    // Create a connection to a Solana node how to connect??
    const connection = new Connection(clusterApiUrl('devnet'))
    const publicKey = new PublicKey('7C4jsPZpht42Tw6MjXWF56Q5RQUocjBBmciEjDa8HRtp')

    // Get Balances
    connection.getBalance(publicKey)
      .then(balance => {
        res.send(`Balance: ${balance}`)
      })
      .catch(err => {
        res.status(500).send(`Error getting balance: ${err.message}`)
      })
  })

  app.listen(3000, () => {
    console.log('Server listening on port 3000')
  })