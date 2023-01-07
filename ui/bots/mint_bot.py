import logging
import requests
from telegram import ReplyKeyboardMarkup, ReplyKeyboardRemove, Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    ConversationHandler,
    MessageHandler,
    filters,
)
from dotenv import load_dotenv
import os

#Import Environment Vairables
load_dotenv()
TELE_API = os.getenv('TELE_API')

import requests

# Enable logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

ADJUST, CHAIN, PHOTO, METADATA, MINT, END = range(6)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    await update.message.reply_text(
        "/mint - Allows you to mint new coupons \n"
        "/claim - Allows you to see your current coupons \n"
        "/help - to see helpful commands",
        )

async def help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    await update.message.reply_text(
        "/mint - Allows you to mint new coupons \n"
        "/claim - Allows you to see your current coupons \n"
        "/help - to see helpful commands",
        )

async def mint(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    endpoint_url = "http://localhost:3000"
    response = requests.get(endpoint_url+'/retrieveMerchants')

    if response.status_code == 200:
        result = response.json()
        print("Response result")
        print(result)
        print('------------------------')
        ## ToDo: Modify options based on response result
        merchants = result['merchantList']
        reply_keyboard = [merchants]

        await update.message.reply_text(
            "Hi, I am the Treehopper. I can help you mint NFT coupons/vouchers! "
            "Send /cancel to stop talking to me.\n\n"
            "Firstly, which coupon are you minting?",
            reply_markup=ReplyKeyboardMarkup(
                reply_keyboard, one_time_keyboard=True, input_field_placeholder="ShengSiong/Grab/NTUC?"
            ),
        )
    else:
        print(response.json()['error'])
    
    return CHAIN

async def chain(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    user = update.message.from_user
    collection = update.message.text # this is where the option from the reply keyboard goes - grab sheng shiong etc
    context.user_data['collection'] = collection
    logger.info("Coupon Selected by %s: %s", user.first_name, collection)

    # user id and user handle that will be added to the firebase db later under users
    user_id = update.effective_user.id
    user_handle = update.effective_user.username

    # user_response = update.message.text

    await update.message.reply_text(
        f"Awesome, give us a moment to check if you have a wallet"
    )
    logger.info(
        "Checking Records..."
    )
    # Post request to Express API
    # Set the endpoint URL, local for now
    endpoint_url = "http://localhost:3000"

    params_key = {
        "id": user_id,
        "handle": user_handle,
    }

    # Send request to generate Key pair
    response = requests.post(endpoint_url+'/retrieveKey',json=params_key)

    # check the response status code
    if response.status_code == 200:
        # print the public and private keys
        keys = response.json()
        print("public key" + keys['publicKey'])
        # private_key_array = list(keys['privateKey'].values())
        
    else:
        print(response.json()['error'])
    
    # Formats users response
    address = keys['publicKey']
    walletStatus = keys['walletStatus']
    print(walletStatus)

    context.user_data['address'] = address
    collection = context.user_data['collection']
    image_CID = response.text
    logger.info(
        "Image uploaded at %s!",image_CID
    )
    # image_URI = "https://ipfs.io/ipfs/" +image_CID
    image_URI = "https://ipfs.io/ipfs/QmTSANYSRFJz3SFg7pdkDx1FZdF53ZX77djNaKqNqdkM9q"
     # Set the parameters
    params = {
        "publicKey": address,
        # "title": title,
        # "symbol": symbol,
        "image_URI": image_URI,
    }
    logger.info(
        "Uploading Metadata..."
    )
    response = requests.post(endpoint_url+"/uploadData", json = params)
    metadata_CID = response.text
    logger.info(
        "Metadata uploaded at %s!",metadata_CID
    )

    if walletStatus == True:
      await update.message.reply_text(
          f"You don't have a wallet! Creating and minting the NFT to your new wallet: {address}"
      )
    else:
      await update.message.reply_text(
          f"You have an existing wallet! Now minting the NFT to your wallet: {address}"
      )

    print(f'this is the collection being minted - {collection} - information should be retrieved from firebase through the mint endpoint')

    params = {
        "publicKey": keys['publicKey'],
        "privateKey": keys['privateKey'],
        "MerchantId": collection,
        # "title": title,
        # "symbol": symbol,
        "metadata": metadata_CID,
    }

    # Send the request to mint
    response = requests.post(endpoint_url + "/mint", json=params) # need to fix, sending information without waiting for transaction to go through

    # Check the response
    if response.status_code == 200:
        print(response)
        txn_hash = response.text
        result = response.json
        print(result)
        # Example Hash
        # https://solana.fm/address/67tRjzCsmYwXXDSwkwKCV7vNKRW8dCqJRS2WC6eVBEDr?cluster=devnet-qn1
        nft_url = "https://solana.fm/transaction/" + txn_hash + "?cluster=devnet-qn1"
        await update.message.reply_text(
        f"NFT Minted! You can view your NFT here: {nft_url}"
        )
    else:
        print("Error calling API: {}".format(response.text))

    reply_keyboard = [["Yes", "No"]]

    await update.message.reply_text(
        "Do you want to continue minting NFTs?",
        reply_markup=ReplyKeyboardMarkup(
            reply_keyboard, one_time_keyboard=True, input_field_placeholder="Yes/No"
        ),
    )
    
    return END

async def claim(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:

    # user id and user handle that will be added to the firebase db later under users
    user_id = update.effective_user.id
    user_handle = update.effective_user.username

    # user_response = update.message.text

    await update.message.reply_text(
        f"Awesome, give us a moment to check if you have any Coupons available to claim"
    )
    logger.info(
        "Checking Records..."
    )
    # Post request to Express API
    # Set the endpoint URL, local for now
    endpoint_url = "http://localhost:3000"

    params_key = {
        "id": user_id,
        "handle": user_handle,
    }

    # Send request to generate Key pair
    response = requests.post(endpoint_url+'/retrieveKey',json=params_key)

    # check the response status code
    if response.status_code == 200:
        keys = response.json()
        # private_key_array = list(keys['privateKey'].values())
        
    else:
        # print the error message
        print(response.json()['error'])
    
    address = keys['publicKey']
    walletStatus = keys['walletStatus']

    if walletStatus == True:
      await update.message.reply_text(
          f"You don't have a wallet! Creating a new wallet for your account: {address}"
      )
    else:
      await update.message.reply_text(
          f"You have an existing wallet! Checking if you have any coupons in your wallet: {address}"
      )

    params = {
        "publicKey": address,
    }

    response = requests.post(endpoint_url+"/coupons", json = params) #checking what coupons he has

    # check the response status code
    if response.status_code == 200:
        # print the public and private keys
        nfts = response.json()
        # result = keys['output']
        nft_dict = {}
        for nft in nfts:
          # must take into account the expired fieldfor 
            name = nft['name']
            mint_address = nft['mintAddress']
            expired = nft['expired']
            print(expired)
            print(type(expired))
            if expired != 'false':
                pass
            else:
                if name in nft_dict:
                    nft_dict[name]['count'] += 1 #increasing the count with every similar NFT
                else:
                    nft_dict[name] = {'mint_address':mint_address,'count':1}
          # you have 16 grab nfts, now you have 15 etc
        reply_keyboard = [list(nft_dict.keys())]
        reply_string = ''
        print('--------------------')
        print(reply_keyboard)
        print('--------------------')
        context.user_data['nft_dict'] = nft_dict #very important to keey the information

        for name,output in nft_dict.items():
          count = output['count']
          reply_string += f'{count} {name} coupons \n'

        if reply_string == '': # all the coupons have been expired
          await update.message.reply_text(
              "You do not have any available coupons"
          )

        else:
          await update.message.reply_text(
              "You have available coupons! You currently have: \n\n"
              f'{reply_string}',
              reply_markup=ReplyKeyboardMarkup(
                  reply_keyboard, one_time_keyboard=True, input_field_placeholder="ShengSiong/Grab?"
              ),)
          print(context.user_data['nft_dict'])

          return ADJUST # only if user has coupons available
    else:
        # print the error message
        print(response.json()['error'])



async def adjust(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    coupon = update.message.text
    print('---------------------------')
    print(coupon)
    user_id = update.effective_user.id
    # logger.info("Coupon Selected by %s: %s", coupon)
    nft_dict = context.user_data['nft_dict'] #stores as a global variable from claim
    print(nft_dict)
    mint_address = nft_dict[coupon]['mint_address']

    params_new = {
        "id": user_id,
        "coupon": coupon,
        "mint_address": mint_address
    }

    endpoint_url = "http://localhost:3000"

    response = requests.post(endpoint_url+"/claim", json=params_new)

    if response.status_code == 200:
        result = response.json()
        output = result['response']
        await update.message.reply_text(
              f"{output}"
          )
    else:
        print(response.json()['error'])

    return ConversationHandler.END

# ----- Deprecated for Personal NFT Minting -----

async def end(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    choice = update.message.text

    if choice == "Yes":
        await update.message.reply_text(
            "Please select /mint",
            reply_markup=ReplyKeyboardRemove(),
        )
        return ConversationHandler.END
    if choice == "No":
        await update.message.reply_text(
            "Bye! I hope we can talk again some day.", reply_markup=ReplyKeyboardRemove()
        )
        return ConversationHandler.END

# ----- Deprecated for Personal NFT Minting -----

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:

    user = update.message.from_user
    logger.info("User %s canceled the conversation.", user.first_name)
    await update.message.reply_text(
        "Bye! I hope we can talk again some day.", reply_markup=ReplyKeyboardRemove()
    )

    # return ConversationHandler.END

def main() -> None:
    """Run the bot."""
    # Create the Application and pass it your bot's token.
    application = Application.builder().token(TELE_API).build()

    # Add conversation handler with the states GENDER, PHOTO, LOCATION and BIO
    conv_handler = ConversationHandler(
        entry_points=[
            CommandHandler("start", start),
            CommandHandler("help", help),
            CommandHandler("mint", mint),
            CommandHandler("claim",claim), 
            # CommandHandler("upload", upload)
            ],
        states={
            ADJUST: [MessageHandler(filters.TEXT, adjust)],
            CHAIN: [MessageHandler(filters.TEXT, chain)],
            # PHOTO: [MessageHandler(filters.PHOTO, photo)],
            # METADATA: [MessageHandler(filters.Regex("^(.*):(.*)"), metadata)],
            END: [MessageHandler(filters.Regex("^(Yes|No)$"), end)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    application.add_handler(conv_handler)

    # Run the bot until the user presses Ctrl-C
    application.run_polling()


if __name__ == "__main__":
    main()