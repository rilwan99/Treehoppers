import telegram
from telegram.ext import Updater, CommandHandler, MessageHandler, Filters
from solana.rpc.api import Client
from solana.publickey import PublicKey

import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.WARNING)

def start(update, context):
    update.message.reply_text('Hi there! Connecting to Solana...')
    solana_client = Client("YOUR_HTTPS_NODE")
    # Get balance of an account to see if the node works
    res = solana_client.get_balance(PublicKey('YOUR_PUBLIC_KEY'))
    update.message.reply_text('The balance of the Solana account is: {}'.format(res.value))


def error(update, context):
    logger.warning('Update "%s" caused error "%s"', update, context.error)

def main():
    updater = Updater('YOUR_TELE_BOT_TOKEN', use_context=True)
    dp = updater.dispatcher

    dp.add_handler(CommandHandler('start', start))
    dp.add_error_handler(error)

    updater.start_polling()
    updater.idle()

if __name__ == '__main__':
    main()
