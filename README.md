# Treehoppers
Our project aims to help Merchants with customer acquisition through the creation of a telegram bot that enables customers to claim coupons directly on the blockchain (Solana). Our project Consists of two parts: 

<ul>
<li>A telegram bot that allows customers to interacts directly on the Solana blockchain as seen in this repo</li>
<li>A merchant facing application, allowing them to create new coupon collections which can be found [here](https://github.com/crustyapples/treehoppers-merchant)</li>
</ul>

For a better understanding of the project, do check out our pitch deck [here](https://www.canva.com/design/DAFXJE3KDho/jDnSqSJxUaFqxMSJB15D1g/view?utm_content=DAFXJE3KDho&utm_campaign=designshare&utm_medium=link&utm_source=publishsharelink) and the demo of our application on [Youtube]!(https://www.youtube.com/watch?v=EzBdCXiMzFM)!

### Overview
1. Seamless Minting of NFT
2. Custodial wallet Holding your Nft for max convenience
3. Instant mint and confirmation

### Installation

1. git clone
2. Install dependencies\
    pip install python-telegram-bot --pre\
    pip install python-dotenv\
    pip install requests
2. solana config set --url devnet
3. anchor test

### Environment Variables
1. Telebot API Key
2. Pinata JWT Key

### Tech Stack
Our bot uses the python-telegram-bot library for the telegram bot, ExpressJS as middleware to process user inputs, and Solana Web3js to interact with our Rust-based Contract

### Deployment
- Contract deployed to [BgAh9RE8D5119VA1q28MxPMx77mdbYxWc7DPB5ULAB5x](https://solana.fm/address/BgAh9RE8D5119VA1q28MxPMx77mdbYxWc7DPB5ULAB5x) (Devnet)
