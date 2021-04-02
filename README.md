# PLC Discord Groupme bot
- This bot links groupme to a specific discord channel
- All of the bot code is in [bot.js](bot.js)
- All of the docker commands are in the [Makefile](Makefile)

## Running this bot
1. Fill in your appropriate information in [example_token.js](example_token.js)
1. Rename `example_token.js` to `token.js`
1. `make && make run`

## Connecting to groupme:
- The `groupme_callback_url` is the postfix to your link for the [https://dev.groupme.com/bots](https://dev.groupme.com/bots) callback url.
- ex: you're hosting on https://www.mysite.com, the bot would be running on https://www.mysite.com:port/bot-callback

