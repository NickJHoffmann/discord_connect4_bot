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

function checkVertical(board, playerNum, j) {
    let inARow = 0;
    for (let i = 0; i < board.length; i++) {
        if (board[i][j] === playerNum) {
            inARow++;
        } else {
            inARow = 0;
        }
    }
    return inARow >= 4;
}

function checkHorizontal(board, playerNum, i) {
    let inARow = 0;
    for (let j = 0; j < board[0].length; j++) {
        if (board[i][j] === playerNum) {
            inARow++;
        } else {
            inARow = 0;
        }
    }
    return inARow >= 4;
}

function checkWin(board, playerNum, i, j) {
    return checkHorizontal(board, playerNum, i) || checkVertical(board, playerNum, j);
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
                return buttons;
            })()
        );
}

function makeButtonRows(length, playerNum) {
    const buttonRows = [];
    for (let i = 0; i < length; i += maxButtonsPerRow) {
        buttonRows.push(makeButtonRow((() => {
                if (i + maxButtonsPerRow > length) return length - i;
                else return maxButtonsPerRow;})(),
            playerNum, i));
    }
    return buttonRows;
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

        // Randomly select which player to start
        let currentPlayer = Math.floor(Math.random() * 2) + 1;

        const baseContent = `${emoji[1]["name"]} ${players[1]} vs ${players[2]} ${emoji[2]["name"]}\n\n`;

        await interaction.reply(
            {
                content: baseContent + convertBoard(board),
                components: makeButtonRows(board[0].length, currentPlayer)
            });

        const filter = i => {
            return i.user.id === players[1].id || i.user.id === players[2].id;
        }
        const buttonCollector = interaction.channel.createMessageComponentCollector({filter, time: 600000, idle: 6000});

        buttonCollector.on('collect', async i => {
            await i.deferUpdate();
            let win = false;
            if (i.user.id === players[currentPlayer].id) {
                console.log(`interaction appID: ${interaction.applicationId}\nbuton interaction appID: ${i.applicationId}`)
                for (let j = board.length - 1; j >= 0; j--) {
                    if (board[j][i.customId] === 0) {
                        board[j][i.customId] = currentPlayer;
                        win = checkWin(board, currentPlayer, j, i.customId);
                        break;
                    }
                }

                if (win) {
                    buttonCollector.stop(`${players[currentPlayer]} wins!`);
                } else {
                    currentPlayer = switchPlayer(currentPlayer);
                }

                await i.editReply({
                    content: baseContent + convertBoard(board),
                    components: makeButtonRows(board[0].length, currentPlayer)
                })
            }
            buttonCollector.empty();
        });

        buttonCollector.on('end', async (collected, reason) => {
            if (reason === 'idle') {
                reason = `Game over. ${players[switchPlayer(currentPlayer)]} wins because ${players[currentPlayer]} took too long!`;
            }

            await interaction.editReply({
                content: baseContent + convertBoard(board) + `\n${reason}`,
                components: []
            });
        });
    }
}