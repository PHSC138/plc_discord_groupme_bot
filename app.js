const tokens = require("./token.js"); // Store tokens in token.js
const Discord = require("discord.js");
const express = require("express");
const body_parser = require("body-parser");
const request = require("request");
const fs = require('fs');

function log(message) {
  console.log(message);
  fs.appendFileSync("discord_groupme_bot.log", message);
}

fs.writeFile("discord_groupme_bot.log", "Discord Groupme Bot Log", function (err, data) {
  if (err) {
    return log(err);
  }
});

const discord_client = new Discord.Client();

discord_client.on("ready", () => {
  log(`Logged in as ${discord_client.user.tag}!`);
});


// Forward all messages from guild and channel to groupme
discord_client.on("message", msg => {
  let debug = false;
  // Confirm that it's the guild and channel set in token.js
  if (
    msg.guild.id === tokens.discord_debug_guild ||
    msg.channel.id === tokens.discord_debug_channel
  ) {
    log("Debug server");
    debug = true;

  } else if (
    msg.guild.id !== tokens.discord_guild_id ||
    msg.channel.id !== tokens.discord_channel_id
  ) {
    // Stop on messages that aren't the specified guild and channel
    return;
  }

  log(msg.content);
  // Get name of message author
  let author =
    msg.member.nickname != null ? msg.member.nickname : msg.author.username;

  send_groupme_message(author, msg.cleanContent, debug);
});

function send_groupme_message(author, message, debug) {
  // curl -d '{"text" : "Your message here", "bot_id" : "your_bot_id_here"}' https://api.groupme.com/v3/bots/post
  let body = {
    text: author + ": " + message,
    bot_id: tokens.groupme_bot_id
  };

  if (debug){
    log(body);
    return;
  }

  // Send the message to groupme
  log("Discord --> groupme" + body.text);

  request(
    "https://api.groupme.com/v3/bots/post",
    { method: "POST", body: body, json: true },
    (err, res, body) => {
      if (err) {
        return log(err);
      }
    }
  );
}

discord_client.login(tokens.discord_token);



const express_app = express();
express_app.use(body_parser.json());

express_app.post(tokens.groupme_callback_url, function(req, res) {
  // TODO: check bot id so jack don't hack me
/* example post body
  {
    "attachments": [],
    "avatar_url": "https://i.groupme.com/123456789",
    "created_at": ??,
    "group_id": "??",
    "id": "??",
    "name": "John",
    "sender_id": "??",
    "sender_type": "user",
    "source_guid": "GUID",
    "system": false,
    "text": "Hello world ☃☃",
    "user_id": "??"
  }
*/
  log("req.body");
  log(req.body);

  // Send groupme message to discord
  let name = req.body.name;
  let text = req.body.text;

  discord_client.channels.cache.get(tokens.discord_channel_id).send(name + ": " + text);
});



express_app.listen(tokens.port, () => {
  log(`Bot listening on ${tokens.port}, ${tokens.groupme_callback_url}`);
});
