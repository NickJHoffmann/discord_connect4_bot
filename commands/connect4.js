const { SlashCommandBuilder, SlashCommandUserOption} = require('@discordjs/builders');
const {MessageActionRow, MessageButton} = require("discord.js");
const wait = require('util').promisify(setTimeout);

const emoji = {
    0: ':white_large_square:',
    1: ':red_square:',
    2: ':yellow_square:'
}

function switchPlayer(num) {
    if (num == 1) return 2;
    return 1;
}

function convertBoard(board) {
    let res = '';
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            res += emoji[board[i][j]] + ' ';
        }
        res += '\n';
    }
    return res;
}

function makeButtonRow(length, playerNum, startIndex=0) {
    return new MessageActionRow()
        .addComponents(
            ...(() => {
                let buttons = []
                for (let i = startIndex; i < startIndex + length; i++) {
                    buttons.push(new MessageButton()
                        .setCustomId(i.toString())
                        .setLabel((i+1).toString())
                        .setStyle('PRIMARY'));
                }
                return buttons;
            })()
        );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("connect4")
        .setDescription("Start playing Connect 4 with someone!")
        .addUserOption(new SlashCommandUserOption()
            .setName('user')
            .setDescription('User to play against')),

    async execute(interaction) {
        const players = {
            1: interaction.user,
            2: interaction.options.getUser('user')
        }

        if (!players[2]) {
            await interaction.reply('User not found.');
            return;
        }

        const board = [
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0]
        ]

        let currentPlayer = 1;

        const baseContent = 'Connect 4:\n' +
            `${emoji[1]} ${players[1].username} vs ${players[2].username} ${emoji[2]}\n` +
            convertBoard(board) + '\n';

        await interaction.reply(
            {
                content: baseContent,
                components: [makeButtonRow(5, 1), makeButtonRow(2, 2, 5)]
            });

    }
}