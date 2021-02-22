# PLC Discord Groupme bot
- This bot links groupme to a specific discord channel
- All of the bot code is in [bot.js](bot.js)
- All of the docker commands are in the [Makefile](Makefile)
## Running this bot
1. Fill in your appropriate information in [example_token.js](example_token.js)
1. Rename `example_token.js` to `token.js`
1. `make && make run`

## Heroku
1. Create heroku account, install && setup heroku cli
1. Pull repo && run `heroku create`
1. `git add -A`
1. `git commit -m "Off to heroku"`
1. `git push heroku master`
1. `heroku ps:scale web=1`
1. `heroku open` will open the site, you should get the response `Cannot GET /`
