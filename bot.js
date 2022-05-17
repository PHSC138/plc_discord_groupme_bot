const tokens = require("./token.js"); // Store tokens in token.js
const Discord = require("discord.js");
const express = require("express");
const body_parser = require("body-parser");
const fs = require("fs");
const https = require("https");

// Initialize file
fs.writeFile(
  "discord_groupme_bot.log",
  "Discord Groupme Bot Log",
  function (err, data) {
    if (err) {
      return log(err);
    }
  }
);

// Log to console and file
function log(message) {
  console.log(message);
  fs.appendFileSync("discord_groupme_bot.log", message + "\n");
}

// Discord
const discord_client = new Discord.Client({
  intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES],
});

discord_client.on("ready", () => {
  log(`Logged in as ${discord_client.user.tag}!`);
});

// Forward all messages from specified guild and channel to Groupme
discord_client.on("message", (msg) => {
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
  log(msg);
  let attachments = Array.from(msg.attachments);
  log(attachments);
  let groupme_attachments = [];
  for (let i = 0; i < attachments.length; i++) {
    // not sure if this is the guild number or channel
    let guild_or_channel = attachments[i][0];
    let message_attachment = attachments[i][1];

    // URL needs to be uploaded to groupme to send as an attachment, just send as a link
    let url = message_attachment.url;
    let type = message_attachment.contentType;
    let image = true;
    if (
      type.includes("mp4") ||
      type.includes("m4v") ||
      type.includes("mov") ||
      type.includes("avi") ||
      type.includes("wmv")
    )
      image = false;

    let attachment = {
      url: url,
    };

    if (image) {
      attachment.type = "image";
      attachment.preview_url = attachments[i].proxyURL;
    } else {
      attachment.type = "video";
      attachment.preview_url = attachments[i].proxyURL;
    }

    groupme_attachments.push(attachment);
  }

  // Call function to send Groupme message
  craft_groupme_message(author, message, groupme_attachments);
});

function craft_groupme_message(author, message, groupme_attachments) {
  let message_bodies = [];
  let message_index = 0;
  let current_message_num = 1;

  do {
    // Get the max amount of text we can send in the message
    // 6 is from " (d/d)"
    // 2 is from ": "
    const msg_constants = author.length + 6 + 2;
    let available_message_size = 450 - msg_constants;
    log(
      "available_message_size: " +
        available_message_size.toString() +
        " message size: " +
        message.length.toString()
    );

    // Check for empty message
    if (message.length == 0) continue;

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
    };

    log(JSON.stringify(body));

    message_bodies.push(body);
  } while (message_index < message.length);

  // Push attachments as a link
  let full_message = author + " (" + current_message_num + "/d): ";
  let send = true;

  for (let i = 0; i < groupme_attachments.length; i++) {
    let attachment = groupme_attachments[i];
    console.log(attachment);

    if (
      full_message.length + attachment.url.length <
      450 - (author.length + 2)
    ) {
      full_message += attachment.url + " ";
      log("Added attachment.url to full_message: " + full_message);

      // Continue to keep adding attachments
      send = false;
    } else {
      send = true;
    }

    if (send || i == groupme_attachments.length - 1) {
      // Create body
      var body = {
        text: full_message,
        bot_id: tokens.groupme_bot_id,
      };

      log(JSON.stringify(body));
      message_bodies.push(body);

      current_message_num += 1;
      full_message = author + " (" + current_message_num + "/d): ";
    }
  }

  // Recursively calls itself until it finishes the list
  send_groupme_message(message_bodies, 0, current_message_num - 1, author);
}

function send_groupme_message(message_bodies, index, num_messages, author) {
  // Current body
  const body = message_bodies[index];
  log(
    "Current send_groupme_message body: " +
      body.text +
      " at index: " +
      index.toString()
  );

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
      "Content-Length": str_body.length,
    },
  };

  const req = https.request(options, (res) => {
    if (res.statusCode != 200 && res.statusCode != 202) {
      log(res);
    }
    log(`statusCode: ${res.statusCode}`);
    log(`options:\n${JSON.stringify(options, null, 2)}`);
    log(`str_body:\n${str_body}`);
    if (index + 1 !== message_bodies.length)
      send_groupme_message(message_bodies, index + 1, num_messages, author);
  });

  req.on("error", (error) => {
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
express_app.get(tokens.groupme_avatar_url, function (req, res) {
  res.sendFile(__dirname + "/avatar.png");
});

// Groupme callback
express_app.post(tokens.groupme_callback_url, function (req, res) {
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
