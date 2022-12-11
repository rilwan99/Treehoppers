import logging
from telegram import ReplyKeyboardMarkup, ReplyKeyboardRemove, Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (

    Application,
    CommandHandler,
    ContextTypes,
    ConversationHandler,
    MessageHandler,
    filters,
)

# Enable logging
logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO
)
logger = logging.getLogger(__name__)

CHAIN, PHOTO, METADATA, MINT, END = range(5)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:

    # text = "Open Phantom Wallet"
    # button = InlineKeyboardButton(text=text, url="https://www.example.com")
    # keyboard = ReplyKeyboardMarkup([[button]])

    # reply_keyboard = [[button]]

    await update.message.reply_text(
        "Hi, I am the Treehopper. I can help you mint NFTs! "
        "Send /cancel to stop talking to me.\n\n"
        "Firstly, lets connect your Phantom Wallet",
        reply_markup=InlineKeyboardMarkup.from_button(
            InlineKeyboardButton(text="Connect Wallet", url="https://phantom.app/ul/v1/connect?app_url=https://phantom.app&")
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
        "Looks great! Now, send me your wallet address, title, and description for your NFT in the following format:\n\n"
        "address : title : description"
    )

    return METADATA

async def metadata(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:

    user = update.message.from_user
    user_response = update.message.text
    address = user_response.split(' : ')[0]
    context.user_data['address'] = address
    chain = context.user_data['chain']
    title = user_response.split(' : ')[1]
    description = user_response.split(' : ')[2]

    logger.info(
        "address of %s: %s, nft title: %s, nft description: %s", user.first_name, address, title, description
    )

    await update.message.reply_text(
        f"Awesome, now Minting NFT to {address} on {chain}"
    )

    # insert contract call to mint NFT, and once minted return success message

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
    application = Application.builder().token("1433555369:AAF4KbunZ69OB7-DOIy6TpJBRSvnOrLvXYc").build()

    # Add conversation handler with the states GENDER, PHOTO, LOCATION and BIO
    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            CHAIN: [MessageHandler(filters.Regex("^(Open Phantom Wallet)$"), chain)],
            PHOTO: [MessageHandler(filters.PHOTO, photo)],
            METADATA: [MessageHandler(filters.Regex("^(.*):(.*):(.*)"), metadata)],
            END: [MessageHandler(filters.Regex("^(Yes|No)$"), end)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    application.add_handler(conv_handler)

    # Run the bot until the user presses Ctrl-C
    application.run_polling()


if __name__ == "__main__":
    main()