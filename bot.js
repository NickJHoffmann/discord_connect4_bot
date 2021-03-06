const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');

const client = new Client({intents: [Intents.FLAGS.GUILDS]});

client.commands = new Collection();

// Read all commands in commands directory
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

// Register all events in events directory
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => {
            event.execute(...args);
        })
    } else {
        client.on(event.name, (...args) => {
            event.execute(...args);
        })
    }
}

// Listen for interactions, namely slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (e) {
        console.error(e);
        await interaction.reply({
            content: 'Error executing command'
        });
    }
})

client.login(process.env.DISCORD_TOKEN);
