// Load environment variables from .env file
require('dotenv').config();

// Load the discord.js library
const { Client, GatewayIntentBits, EmbedBuilder, Colors } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');

// Initialize Express app
const app = express();
app.use(express.json()); // For parsing application/json

// Create a path for the prefix file
const prefixFilePath = path.join(__dirname, 'prefixes.json');

// Initialize the Discord client
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });

// Get your bot's token from the environment variables
const TOKEN = process.env.TOKEN;

// Load prefixes from file or initialize empty
let prefixes = {};
if (fs.existsSync(prefixFilePath)) {
    prefixes = JSON.parse(fs.readFileSync(prefixFilePath, 'utf8'));
}

// Event handler for when the bot is ready
client.once('ready', () => {
    console.log('Discord bot is ready!');
});

// Event handler for incoming messages
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // Get the prefix for the guild or use default '!'
    const guildPrefix = prefixes[message.guild.id] || '!';

    // Check if the message starts with the prefix
    if (!message.content.startsWith(guildPrefix)) return;

    // Remove the prefix and get the command
    const commandBody = message.content.slice(guildPrefix.length).trim();
    const args = commandBody.split(/ +/);
    const command = args.shift().toLowerCase();

    // Create an embed message function
    const createEmbed = (title, description, color) => {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color);
    };

    // Example command: !ping
    if (command === 'ping') {
        const sentMessage = await message.reply('Pinging...');
        const latency = sentMessage.createdTimestamp - message.createdTimestamp;
        const apiLatency = Math.round(client.ws.ping);
        await sentMessage.edit(`Pong! Latency is ${latency}ms. API Latency is ${apiLatency}ms.`);
    }

    // KICK command
    if (command === 'kick') {
        if (!message.member.permissions.has('KICK_MEMBERS')) return message.reply('You do not have permission to kick members.');
        const user = message.mentions.users.first();
        if (!user) return message.reply('Please mention the user to kick.');
        const member = message.guild.members.resolve(user);
        if (!member) return message.reply('User not found in the server.');
        if (!member.kickable) return message.reply('I cannot kick this user.');

        await member.kick();
        const kickEmbed = createEmbed('User Kicked', `${user.tag} has been kicked.`, Colors.Red);
        message.channel.send({ embeds: [kickEmbed] });
    }

    // BAN command
    if (command === 'ban') {
        if (!message.member.permissions.has('BAN_MEMBERS')) return message.reply('You do not have permission to ban members.');
        const user = message.mentions.users.first();
        if (!user) return message.reply('Please mention the user to ban.');
        const member = message.guild.members.resolve(user);
        if (!member) return message.reply('User not found in the server.');
        if (!member.bannable) return message.reply('I cannot ban this user.');

        await member.ban();
        const banEmbed = createEmbed('User Banned', `${user.tag} has been banned.`, Colors.Red);
        message.channel.send({ embeds: [banEmbed] });
    }

    // UNBAN command
    if (command === 'unban') {
        if (!message.member.permissions.has('BAN_MEMBERS')) return message.reply('You do not have permission to unban members.');
        const userId = args[0];
        if (!userId) return message.reply('Please provide the user ID to unban.');
        try {
            await message.guild.members.unban(userId);
            const unbanEmbed = createEmbed('User Unbanned', `User with ID ${userId} has been unbanned.`, Colors.Green);
            message.channel.send({ embeds: [unbanEmbed] });
        } catch (error) {
            message.reply('An error occurred while unbanning the user.');
        }
    }

    // HELP command
    if (command === 'help') {
        const helpEmbed = new EmbedBuilder()
            .setTitle('Help Command')
            .setDescription('Here are the available commands:')
            .addFields(
                { name: `${guildPrefix}kick @user`, value: 'Kicks the mentioned user.' },
                { name: `${guildPrefix}ban @user`, value: 'Bans the mentioned user.' },
                { name: `${guildPrefix}unban <userID>`, value: 'Unbans the user with the given ID.' },
                { name: `${guildPrefix}help`, value: 'Displays this help message.' },
                { name: `${guildPrefix}setprefix <newPrefix>`, value: 'Sets a new command prefix.' }
            )
            .setColor(Colors.Blue);
        message.channel.send({ embeds: [helpEmbed] });
    }

    // SETPREFIX command
    if (command === 'setprefix') {
        if (!message.member.permissions.has('MANAGE_GUILD')) return message.reply('You do not have permission to change the prefix.');
        const newPrefix = args[0];
        if (!newPrefix) return message.reply('Please provide a new prefix.');
        if (newPrefix.length > 3) return message.reply('Prefix must be 1 to 3 characters long.');

        // Save the new prefix to the file
        prefixes[message.guild.id] = newPrefix;
        fs.writeFileSync(prefixFilePath, JSON.stringify(prefixes), 'utf8');

        const setPrefixEmbed = createEmbed('Prefix Changed', `The command prefix has been changed to \`${newPrefix}\`.`, Colors.Green);
        message.channel.send({ embeds: [setPrefixEmbed] });
    }
});

// Define routes for Express
app.get('/', (req, res) => {
    res.send('Hello, world!');
});

// Route to get the current prefix for a guild
app.get('/prefix/:guildId', (req, res) => {
    const guildId = req.params.guildId;
    const guildPrefix = prefixes[guildId] || '!';
    res.json({ prefix: guildPrefix });
});

// Route to set a new prefix for a guild
app.post('/prefix/:guildId', (req, res) => {
    const guildId = req.params.guildId;
    const newPrefix = req.body.prefix;
    if (!newPrefix || newPrefix.length > 3) return res.status(400).json({ error: 'Prefix must be 1 to 3 characters long.' });

    // Save the new prefix to the file
    prefixes[guildId] = newPrefix;
    fs.writeFileSync(prefixFilePath, JSON.stringify(prefixes), 'utf8');
    res.json({ success: `Prefix for guild ${guildId} changed to ${newPrefix}` });
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Express server is running on port ${PORT}`);
});

// Login to Discord with your app's token
client.login(TOKEN);
