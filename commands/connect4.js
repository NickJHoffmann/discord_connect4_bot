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
        if (inARow >= 4) {
            return true;
        }
    }
    return false;
}

function checkHorizontal(board, playerNum, i) {
    let inARow = 0;
    for (let j = 0; j < board[0].length; j++) {
        if (board[i][j] === playerNum) {
            inARow++;
        } else {
            inARow = 0;
        }
        if (inARow >= 4) {
            return true;
        }
    }
    return false;
}

function checkDiagDown(board, playerNum, i, j) {
    while (i >= 1 && j >= 1) {
        i--;
        j--;
    }
    let inARow = 0;
    while (i < board.length && j < board[0].length) {
        if (board[i][j] === playerNum) {
            inARow++;
            if (inARow >= 4) {
                return true;
            }
        } else {
            inARow = 0;
        }
        i++;
        j++;
    }
    return false;
}

function checkDiagUp(board, playerNum, i, j) {
    while (i < board.length - 1 && j >= 1) {
        i++;
        j--;
    }
    let inARow = 0;
    while (i >= 0 && j < board[0].length) {
        if (board[i][j] === playerNum) {
            inARow++;
            if (inARow >= 4) {
                return true;
            }
        } else {
            inARow = 0;
        }
        i--;
        j++;
    }
    return false;
}

function checkWin(board, playerNum, i, j) {
    return checkHorizontal(board, playerNum, i) || checkVertical(board, playerNum, j) || checkDiagDown(board, playerNum, i, j) || checkDiagUp(board, playerNum, i, j);
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

function convertSecondsToTimeString(seconds) {
    return `${Math.floor(seconds / 60)}:` + `${seconds % 60}`.padStart(2, '0');
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
            1: {userObj: interaction.user,
                madeMove: false},
            2: {userObj: interaction.options.getUser('user'),
                madeMove: false}
        }

        if (!players[2].userObj) {
            await interaction.reply('User not found.');
            return;
        } else if (players[2].userObj.bot) {
            await interaction.reply('You must play against a human');
            return;
        }

        const matchTimeoutSeconds = 600;
        const turnTimeoutSeconds = 10;
        let turnTimeRemaining = turnTimeoutSeconds - 1;

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

        const baseContent = `${emoji[1]["name"]} ${players[1].userObj} vs ${players[2].userObj} ${emoji[2]["name"]}\n\n`;

        let buttonRows = makeButtonRows(board[0].length, currentPlayer)

        await interaction.reply(
            {
                content: baseContent + `Time Remaining: ${convertSecondsToTimeString(turnTimeRemaining)}\n` + convertBoard(board),
                components: buttonRows
            });

        // Don't know why I had to deliberately fetch the reply rather than just saving the return value of the initial
        // reply call above, but I was getting errors that way
        const initialReply = await interaction.fetchReply();

        // Check if user clicking button is actually in the game and clicked on this instance's buttons
        const filter = async i => {
            if (i.user.id === players[1].userObj.id || i.user.id === players[2].userObj.id) {
                if (i.message.id === initialReply.id) {
                    return true;
                }
            }
            return false;
        }
        const buttonCollector = interaction.channel.createMessageComponentCollector({filter, time: matchTimeoutSeconds * 1000, idle: turnTimeoutSeconds * 1000});

        let intervalID = setInterval(async function() {
                turnTimeRemaining--;
                await interaction.editReply({
                    content: baseContent + `Time Remaining: ${convertSecondsToTimeString(turnTimeRemaining)}\n` + convertBoard(board),
                    components: buttonRows
                });
            }, 1000);

        buttonCollector.on('collect', async i => {
            await i.deferUpdate();
            let win = false;
            if (i.user.id === players[currentPlayer].userObj.id) {
                clearInterval(intervalID);
                for (let j = board.length - 1; j >= 0; j--) {
                    if (board[j][i.customId] === 0) {
                        board[j][i.customId] = currentPlayer;
                        win = checkWin(board, currentPlayer, j, i.customId);
                        players[currentPlayer].madeMove = true;
                        break;
                    }
                }

                if (win) {
                    buttonCollector.stop(`${players[currentPlayer].userObj} wins!`);
                } else {
                    currentPlayer = switchPlayer(currentPlayer);
                    turnTimeRemaining = turnTimeoutSeconds - 1;
                    buttonRows = makeButtonRows(board[0].length, currentPlayer);

                    // Immediately respond with updated game board, then start to update timer every second
                    await i.editReply({
                        content: baseContent + `Time Remaining: ${convertSecondsToTimeString(turnTimeRemaining)}\n` + convertBoard(board),
                        components: buttonRows
                    });
                    intervalID = setInterval(async function() {
                        turnTimeRemaining--;
                        await i.editReply({
                            content: baseContent + `Time Remaining: ${convertSecondsToTimeString(turnTimeRemaining)}\n` + convertBoard(board),
                            components: buttonRows
                        });
                    }, 1000);
                }
            }
            buttonCollector.empty();
        });

        buttonCollector.on('end', async (collected, reason) => {
            clearInterval(intervalID);
            if (reason === 'idle') {
                if (players[1].madeMove && players[2].madeMove) {
                    reason = `Game over. ${players[switchPlayer(currentPlayer)].userObj} wins because ${players[currentPlayer].userObj} took too long!`;
                } else if (!players[2].madeMove && currentPlayer === 2) {
                    reason = `Game over. ${players[2].userObj} isn't around right now.`;
                } else if (!players[1].madeMove) {
                    reason = `Game over. ${players[1].userObj} doesn't want to play the game they started :(`;
                } else {
                    reason = 'Game over.';
                }
            }

            await interaction.editReply({
                content: baseContent + convertBoard(board) + `\n${reason}`,
                components: []
            });
        });
    }
}