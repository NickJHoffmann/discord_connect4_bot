// https://discordjs.guide/creating-your-bot/command-handling.html#reading-command-files
const fs = require('fs');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
//const { clientId, guildId } = require('./config.json');

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

clientID = "942567532320137338";
guildID = "357676394005659648";

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Registering slash commands');
        await rest.put(Routes.applicationGuildCommands(clientID, guildID), { body: commands});
        console.log('Successfully reloaded slash commands');
    } catch (error) {
        console.error(error);
    }
})();