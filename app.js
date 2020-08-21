const tokens = require('./token.js');  // Store tokens in token.js
const Discord = require('discord.js');
const discord_client = new Discord.Client();

var discord_guild;
var discord_channel;

discord_client.on('ready', () => {
  console.log(`Logged in as ${discord_client.user.tag}!`);
  discord_guild = discord_client.guilds.fetch(tokens.discord_guild_id, () => {
    discord_channel = discord_guild.channels.get(tokens.discord_channel_id);
  });
});

// Forward all messages to groupme
discord_client.on('message', msg => {
  console.log(msg.content);
  // Confirm that it's the guild and channel set in token.js
  if (msg.guild.id !== tokens.discord_guild_id || msg.channel.id !== tokens.discord_channel_id) {
    console.log("NOT PLC #groupme");
    return;
  }
});

discord_client.login(tokens.discord_token);
