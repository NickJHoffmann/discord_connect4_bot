const { SlashCommandBuilder, SlashCommandUserOption} = require('@discordjs/builders');
const {MessageActionRow, MessageButton} = require("discord.js");

const maxButtonsPerRow = 5;
const emoji = {
    0: {name: ":white_large_square:",
        unicode: "⬜"},
    1: {name: ":red_square:",
        unicode: "🟥"},
    2: {name: ":yellow_square:",
        unicode: "🟨"}
}

function switchPlayer(num) {
    if (num === 1) return 2;
    return 1;
}

function convertBoard(board) {
    let res = '';
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            res += emoji[board[i][j]].name + ' ';
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
                        .setStyle('PRIMARY')
                        .setEmoji(emoji[playerNum].unicode));
                }
                console.log(buttons)
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
        ];

        let currentPlayer = 1;

        const baseContent = `${emoji[1]["name"]} ${players[1].username} vs ${players[2].username} ${emoji[2]["name"]}\n` +
            convertBoard(board) + '\n';

        const buttonRows = [];
        for (let i = 0; i < board[0].length; i += maxButtonsPerRow) {
            buttonRows.push(makeButtonRow((() => {
                if (i + maxButtonsPerRow > board[0].length) return board[0].length - i;
                else return maxButtonsPerRow;})(),
                currentPlayer, i));
        }

        await interaction.reply(
            {
                content: baseContent,
                components: buttonRows
            });
    }
}