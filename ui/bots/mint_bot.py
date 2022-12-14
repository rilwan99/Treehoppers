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

CHAIN, PHOTO, METADATA, MINT, END = range(5)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:

    reply_keyboard = [["Solana", "Polygon", "Ethereum"]]

    await update.message.reply_text(
        "Hi, I am the Treehopper. I can help you mint NFTs! "
        "Send /cancel to stop talking to me.\n\n"
        "Firstly, which chain would you like to mint your NFT on?",
        reply_markup=ReplyKeyboardMarkup(
            reply_keyboard, one_time_keyboard=True, input_field_placeholder="Solana/Polygon/Ethereum?"
        ),
    )

    return CHAIN


async def chain(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    
    # Stores the selected chain and asks for the NFT Photo
    user = update.message.from_user
    chain = update.message.text
    context.user_data['chain'] = chain
    logger.info("Chain Selected by %s: %s", user.first_name, chain)
    
    await update.message.reply_text(
        "Nice! please send me the NFT that you would like to mint: ",
        reply_markup=ReplyKeyboardRemove(),
    )

    return PHOTO


async def photo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    
    # Stores photo and prompts for metadata
    user = update.message.from_user
    photo_file = await update.message.photo[-1].get_file()
    
    await photo_file.download_to_drive(f"nft_photos/{user.first_name}_nft.jpg")
    logger.info("nft of %s: %s", user.first_name, f"{user.first_name}_nft.jpg")
    
    await update.message.reply_text(
        "Looks great! Now, send me the title and symbol for your NFT in the following format:\n\n"
        "title : symbol"
    )

    return METADATA

async def metadata(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:

    user = update.message.from_user
    user_response = update.message.text

    logger.info(
        "Generating new key pair..."
    )
    # Post request to Express API
    # Set the endpoint URL, local for now
    endpoint_url = "http://localhost:3000"

    # Send request to generate Key pair
    response = requests.get(endpoint_url+'/generateKey')
    # check the response status code
    if response.status_code == 200:
        # print the public and private keys
        keys = response.json()
        print(keys['publicKey'])
        print(keys['privateKey'])
        
    else:
        # print the error message
        print(response.json()['error'])
    
    # Formats users response
    address = keys['publicKey']
    context.user_data['address'] = address
    chain = context.user_data['chain']
    title = user_response.split(' : ')[0]
    symbol = user_response.split(' : ')[1]

    # Send request to upload meta data and image
    logger.info(
        "Uploading Metadata..."
    )

    # Set the parameters
    params = {
        "publicKey": address,
        "title": title,
        "symbol": symbol,
    }

    # Create path where the image is located
    base_path = os.path.realpath(__file__)
    parent_dir = os.path.dirname(base_path)
    image_path = os.path.join(parent_dir, 'nft_photos/')
    print(image_path)
    # Load the uploaded image from the user
    with open(image_path+user.first_name+"_nft.jpg", "rb") as image:
        image_data = image.read()

    # Send both Image and user params to the endpoint for uploading to ipfs
    response = requests.post(endpoint_url+"/upload", files={"image": image_data},json = params)

    logger.info(
        "address of %s: %s, nft title: %s, nft symbol: %s", user.first_name, address, title, symbol
    )

    await update.message.reply_text(
        f"Awesome, now Minting NFT to {address} on {chain}"
    )

    # Send the request to mint
    response = requests.post(endpoint_url + "/mint", json=params)

    # Check the response
    if response.status_code == 200:
        print(response)
        await update.message.reply_text(
        f"NFT Minted! You can view your NFT here: {address}"
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


async def end(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    choice = update.message.text

    if choice == "Yes":
        await update.message.reply_text(
            "Nice! please send me the NFT that you would like to mint: ",
            reply_markup=ReplyKeyboardRemove(),
        )

        return PHOTO

    if choice == "No":
        await update.message.reply_text(
            "Bye! I hope we can talk again some day.", reply_markup=ReplyKeyboardRemove()
        )
        return ConversationHandler.END


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:

    user = update.message.from_user
    logger.info("User %s canceled the conversation.", user.first_name)
    await update.message.reply_text(
        "Bye! I hope we can talk again some day.", reply_markup=ReplyKeyboardRemove()
    )

    return ConversationHandler.END


def main() -> None:
    """Run the bot."""
    # Create the Application and pass it your bot's token.
    application = Application.builder().token(TELE_API).build()

    # Add conversation handler with the states GENDER, PHOTO, LOCATION and BIO
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            CHAIN: [MessageHandler(filters.Regex("^(Solana|Polygon|Ethereum)$"), chain)],
            PHOTO: [MessageHandler(filters.PHOTO, photo)],
            METADATA: [MessageHandler(filters.Regex("^(.*):(.*)"), metadata)],
            END: [MessageHandler(filters.Regex("^(Yes|No)$"), end)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    application.add_handler(conv_handler)

    # Run the bot until the user presses Ctrl-C
    application.run_polling()


if __name__ == "__main__":
    main()