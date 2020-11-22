const tokens = require("./token.js"); // Store tokens in token.js
const Discord = require("discord.js");
const express = require("express");
const body_parser = require("body-parser");
const request = require("request");
const fs = require("fs");

// Initialize file
fs.writeFile("discord_groupme_bot.log", "Discord Groupme Bot Log", function(
  err,
  data
) {
  if (err) {
    return log(err);
  }
});

// Log to console and file
function log(message) {
  console.log(message);
  fs.appendFileSync("discord_groupme_bot.log", message + "\n");
}

// Discord
const discord_client = new Discord.Client();

discord_client.on("ready", () => {
  log(`Logged in as ${discord_client.user.tag}!`);
});

// Forward all messages from specified guild and channel to Groupme
discord_client.on("message", msg => {
  // Bot
  if (msg.author.username === tokens.discord_username) {
    return;
  }

  // Confirm that it's the guild and channel set in token.js
  if (
    msg.guild.id !== tokens.discord_guild_id ||
    (msg.channel.id !== tokens.discord_channel_id &&
      msg.channel.id !== tokens.discord_announcements_id)
  ) {
    // Stop on messages that aren't the specified guild and channel
    return;
  }
  log("Discord --> Groupme");

  // Get name of message author
  // Nickname preferred over discord username
  let author =
    msg.member.nickname != null ? msg.member.nickname : msg.author.username;

  // If announcement, author = announcement
  if (msg.channel.id === tokens.discord_announcements_id) {
    author = "Announcement";
  }

  let message = msg.cleanContent;

  // Get attachments
  let has_video = false;
  let attachments = msg.attachments.array();
  let groupme_attachments = [];
  for (let i = 0; i < attachments.length; i++) {
    let url = attachments[i].url;
    let substr = url.substring(url.length - 3, url.length);
    let image = true;
    if (
      substr == "mp4" ||
      substr == "m4v" ||
      substr == "mov" ||
      substr == "avi" ||
      substr == "wmv"
    )
      image = false;

    let attachment = {
      url: attachments[i].url
    };

    if (image) {
      attachment.type = "image";
    } else {
      has_video = true;
      attachment.type = "video";
      attachment.preview_url = attachments[i].proxyURL;
    }

    groupme_attachments.push(attachment);
  }

  // Call function to send Groupme message
  send_groupme_message(author, message, groupme_attachments, has_video);
});

function send_groupme_message(author, message, groupme_attachments, has_video) {
  let video_message = "";
  if (has_video)
    video_message =
      "\n(Tap the side of the video, then the 3 dots to view the video)";

  let message_bodies = [];
  let message_index = 0;
  let current_message_num = 1;

  do {
    // Get the max amount of text we can send in the message
    // 6 is from " (d/d)"
    // 2 is from ": "
    let available_message_size =
      450 - author.length - 6 - 2 - video_message.length;

    // Check for out of bounds access -- just set to remaining length
    if (message_index + available_message_size > message.length)
      available_message_size = message.length - message_index;

    // Snip message
    let full_message =
      author +
      " (" +
      current_message_num +
      "/d): " +
      message.substring(message_index, message_index + available_message_size);

    // Find last space, and snip again
    full_message = full_message.substring(0, full_message.lastIndexOf(" "));

    log(
      "available_message_size: " +
        available_message_size.toString() +
        " " +
        typeof available_message_size
    );

    // Increment message_index
    message_index += full_message.length;
    current_message_num += 1;

    // Create body
    var body = {
      text: full_message,
      bot_id: tokens.groupme_bot_id,
      attachments: groupme_attachments
    };

    log(JSON.stringify(body));

    message_bodies.push(body);

    // Make sure not to send video or attachments with each part
    video_message = "";
    groupme_attachments = [];
  } while (message_index < message.length);

  // For each body, send request to groupme
  message_bodies.reverse().forEach(function(body) {
    // If length of message_bodies is 1, remove (1/d)
    // Else update "/d)" with current_message_num
    if (message_bodies.length === 1) {
      body.text =
        body.text.substring(0, author.length) +
        body.text.substring(author.length + 6, body.text.length);
    } else {
      body.text =
        body.text.substring(0, author.length + 4) +
        (current_message_num - 1).toString() +
        body.text.substring(author.length + 5, body.text.length);
    }
    // Send the message to Groupme
    request(
      "https://api.groupme.com/v3/bots/post",
      { method: "POST", body: body, json: true },
      (err, res, body) => {
        if (err) {
          return log(err);
        }
      }
    );
  });
}

discord_client.login(tokens.discord_token);

// Express
const express_app = express();
express_app.use(body_parser.json());

// Groupme avatar
express_app.get(tokens.groupme_avatar_url, function(req, res) {
  res.sendFile(__dirname + "/avatar.png");
});

// Groupme callback
express_app.post(tokens.groupme_callback_url, function(req, res) {
  log("Groupme --> Discord");
  log("req.body");
  log(JSON.stringify(req.body));

  // Don't forward bot messages
  if (
    req.body.sender_type !== "user" ||
    req.body.group_id !== tokens.groupme_group_id
  ) {
    return;
  }

  let name = req.body.name;
  let text = req.body.text;

  let message = name + ": " + text;

  let attachments = req.body.attachments;
  for (let i = 0; i < attachments.length; i++) {
    message += "\n" + attachments[i].url;
  }

  // Send Groupme message to discord
  discord_client.channels.cache.get(tokens.discord_channel_id).send(message);
  log(message);

  // Send ok back to the request
  res.send("OK");
});

// Start listening on callback url
express_app.listen(tokens.port, () => {
  log(`Bot listening on ${tokens.port}, ${tokens.groupme_callback_url}`);
});
