const tokens = require("./token.js"); // Store tokens in token.js
const Discord = require("discord.js");
const express = require("express");
const body_parser = require("body-parser");
const fs = require("fs");
const https = require("https");

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
  craft_groupme_message(author, message, groupme_attachments, has_video);
});

function craft_groupme_message(
  author,
  message,
  groupme_attachments,
  has_video
) {
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
    const msg_constants = author.length + 6 + 2 + video_message.length;
    let available_message_size = 450 - msg_constants;
    log(
      "available_message_size: " +
        available_message_size.toString() +
        " " +
        typeof available_message_size
    );

    let split = true;
    // Check for out of bounds access -- just set to remaining length
    if (message_index + available_message_size > message.length) {
      available_message_size = message.length - message_index;
      split = false;
    }

    let message_substring = message.substring(
      message_index,
      message_index + available_message_size
    );
    let new_length = available_message_size;

    // Find last space, and last newline
    const last_space = message_substring.lastIndexOf(" ");
    const last_newline = message_substring.lastIndexOf("\n");
    msg1 = message_substring.substring(0, last_space);
    msg2 = message_substring.substring(0, last_newline);

    // Split on bigger message
    if (
      split === true &&
      msg1.length > msg2.length &&
      msg1.length !== message_substring.length
    ) {
      message_substring = msg1;
      log("last_space: " + last_space.toString());
      new_length = last_space + 1;
    } else if (
      split === true &&
      msg1.length < msg2.length &&
      msg2.length !== message_substring.length
    ) {
      message_substring = msg2;
      log("last_newline: " + last_newline.toString());
      new_length = last_newline + 1;
    }

    // Craft message
    let full_message =
      author + " (" + current_message_num + "/d): " + message_substring;

    // Increment message_index and current_message_num
    message_index += new_length;
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

  // Recursively calls itself until it finishes the list
  send_groupme_message(message_bodies, 0, current_message_num - 1, author);
}

function send_groupme_message(message_bodies, index, num_messages, author) {
  // Current body
  const body = message_bodies[index];

  // If length of message_bodies is 1, remove (1/d)
  // Else update "/d)" with current_message_num
  if (message_bodies.length === 1) {
    body.text =
      body.text.substring(0, author.length) +
      body.text.substring(author.length + 6, body.text.length);
  } else {
    body.text =
      body.text.substring(0, author.length + 4) +
      num_messages.toString() +
      body.text.substring(author.length + 5, body.text.length);
  }

  // Escape unicode stuffs '’' (breaks groupme api)
  body.text = body.text.replace(/[^\x00-\x7F]/g, "");

  const str_body = JSON.stringify(body);
  log("Message body: " + body.text);

  // Send the message to Groupme
  const options = {
    hostname: "api.groupme.com",
    port: 443,
    path: "/v3/bots/post",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": str_body.length
    }
  };

  const req = https.request(options, res => {
    if (res.statusCode != 200 && res.statusCode != 202) {
      log(res);
    }
    log(`statusCode: ${res.statusCode}`);
    log(`options:\n${JSON.stringify(options, null, 2)}`);
    log(`str_body:\n${str_body}`);
    if (index + 1 !== message_bodies.length)
      send_groupme_message(message_bodies, index + 1, num_messages, author);
  });

  req.on("error", error => {
    log(error);
  });

  req.write(str_body);
  req.end();
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
// Use process.env.PORT for heroku
const port = process.env.PORT || tokens.port;
express_app.listen(port, () => {
  log(`Bot listening on ${port}, ${tokens.groupme_callback_url}`);
});
