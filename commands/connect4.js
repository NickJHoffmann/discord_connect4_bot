const { SlashCommandBuilder, SlashCommandUserOption} = require('@discordjs/builders');
const {MessageActionRow, MessageButton} = require("discord.js");

const maxButtonsPerRow = 5;

function switchPlayer(num) {
    if (num === 1) return 2;
    return 1;
}

function convertBoard(board, emoji) {
    let res = '';
    for (let i = 0; i < board.length; i++) {
        for (let j = 0; j < board[i].length; j++) {
            res += emoji[board[i][j]] + ' ';
        }
        res += '\n';
    }
    return res;
}

function checkVertical(board, playerNum, j, numToConnect) {
    let inARow = 0;
    for (let i = 0; i < board.length; i++) {
        if (board[i][j] === playerNum) {
            inARow++;
        } else {
            inARow = 0;
        }
        if (inARow >= numToConnect) {
            return true;
        }
    }
    return false;
}

function checkHorizontal(board, playerNum, i, numToConnect) {
    let inARow = 0;
    for (let j = 0; j < board[0].length; j++) {
        if (board[i][j] === playerNum) {
            inARow++;
        } else {
            inARow = 0;
        }
        if (inARow >= numToConnect) {
            return true;
        }
    }
    return false;
}

function checkDiagDown(board, playerNum, i, j, numToConnect) {
    while (i >= 1 && j >= 1) {
        i--;
        j--;
    }
    let inARow = 0;
    while (i < board.length && j < board[0].length) {
        if (board[i][j] === playerNum) {
            inARow++;
            if (inARow >= numToConnect) {
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

function checkDiagUp(board, playerNum, i, j, numToConnect) {
    while (i < board.length - 1 && j >= 1) {
        i++;
        j--;
    }
    let inARow = 0;
    while (i >= 0 && j < board[0].length) {
        if (board[i][j] === playerNum) {
            inARow++;
            if (inARow >= numToConnect) {
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

function checkWin(board, playerNum, i, j, numToConnect) {
    return checkHorizontal(board, playerNum, i, numToConnect) || checkVertical(board, playerNum, j, numToConnect) || checkDiagDown(board, playerNum, i, j, numToConnect) || checkDiagUp(board, playerNum, i, j, numToConnect);
}

function makeButtonRow(emoji, length, playerNum, startIndex=0) {
    return new MessageActionRow()
        .addComponents(
            ...(() => {
                let buttons = []
                for (let i = startIndex; i < startIndex + length; i++) {
                    buttons.push(new MessageButton()
                        .setCustomId(i.toString())
                        .setLabel((i+1).toString())
                        .setStyle('PRIMARY')
                        .setEmoji(emoji[playerNum]));
                }
                return buttons;
            })()
        );
}

function makeButtonRows(length, playerNum, emoji) {
    const buttonRows = [];
    for (let i = 0; i < length; i += maxButtonsPerRow) {
        buttonRows.push(makeButtonRow(emoji, (() => {
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
            .setDescription('User to play against')
            .setRequired(true))
        .addStringOption(option =>
                option.setName('emoji1')
                    .setDescription('Emoji for Player 1. Defaults to 🟥'))
        .addStringOption(option =>
            option.setName('emoji2')
                .setDescription('Emoji for Player 2. Defaults to 🟨'))
        .addStringOption(option =>
            option.setName('background')
                .setDescription('Emoji for unused tiles. Defaults to ⬜'))
        .addIntegerOption(option =>
            option.setName('width')
                .setDescription('Width of the board. Minimum: 4, Maximum: 13. Defaults to 7')
                .setMinValue(4)
                .setMaxValue(13))
        .addIntegerOption(option =>
            option.setName('height')
                .setDescription('Height of the board. Minimum: 4, Maximum: 13. Defaults to 6')
                .setMinValue(4)
                .setMaxValue(13))
        .addIntegerOption(option =>
            option.setName('connect')
                .setDescription('Number of tiles in a row required to win. Minimum: 3, Maximum: 13. Defaults to 4')
                .setMinValue(3)
                .setMaxValue(13)),

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

        /*
         * Default emoji
         * 0: Background, white square
         * 1: Player 1, red square
         * 2: Player 2, yellow square
         */
        const gameEmoji = {
            0: '⬜',
            1: '🟥',
            2: '🟨'
        }

        if (interaction.options.getString('background')) {
            gameEmoji[0] = interaction.options.getString('background');
        }

        if (interaction.options.getString('emoji1')) {
            gameEmoji[1] = interaction.options.getString('emoji1');
        }

        if (interaction.options.getString('emoji2')) {
            gameEmoji[2] = interaction.options.getString('emoji2');
        }

        const boardWidth = (() => {
            if (interaction.options.getInteger('width')) {
                return interaction.options.getInteger('width')
            } else {
                return 7;
            }
        })();


        const boardHeight = (() => {
            if (interaction.options.getInteger('height')) {
                return interaction.options.getInteger('height')
            } else {
                return 6;
            }
        })();

        const numToConnect = (() => {
            if (interaction.options.getInteger('connect')) {
                return interaction.options.getInteger('connect')
            } else {
                return 4;
            }
        })();


        const matchTimeoutSeconds = 600;
        const turnTimeoutSeconds = 60;
        let turnTimeRemaining = turnTimeoutSeconds - 1;

        const board = Array(boardHeight);
        for (let i = 0; i < boardHeight; i++) {
            board[i] = Array(boardWidth).fill(0);
        }

        // Randomly select which player to start
        let currentPlayer = Math.floor(Math.random() * 2) + 1;

        const baseContent = `${gameEmoji[1]} ${players[1].userObj} vs ${players[2].userObj} ${gameEmoji[2]}\n\n`;

        let buttonRows = makeButtonRows(board[0].length, currentPlayer, gameEmoji)

        await interaction.reply(
            {
                content: baseContent + `Time Remaining: ${convertSecondsToTimeString(turnTimeRemaining)}\n` + convertBoard(board, gameEmoji),
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
                    content: baseContent + `Time Remaining: ${convertSecondsToTimeString(turnTimeRemaining)}\n` + convertBoard(board, gameEmoji),
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
                        win = checkWin(board, currentPlayer, j, i.customId, numToConnect);
                        players[currentPlayer].madeMove = true;
                        break;
                    }
                }

                if (win) {
                    buttonCollector.stop(`${players[currentPlayer].userObj} wins!`);
                } else {
                    currentPlayer = switchPlayer(currentPlayer);
                    turnTimeRemaining = turnTimeoutSeconds - 1;
                    buttonRows = makeButtonRows(board[0].length, currentPlayer, gameEmoji);

                    // Immediately respond with updated game board, then start to update timer every second
                    await i.editReply({
                        content: baseContent + `Time Remaining: ${convertSecondsToTimeString(turnTimeRemaining)}\n` + convertBoard(board, gameEmoji),
                        components: buttonRows
                    });
                    intervalID = setInterval(async function() {
                        turnTimeRemaining--;
                        await i.editReply({
                            content: baseContent + `Time Remaining: ${convertSecondsToTimeString(turnTimeRemaining)}\n` + convertBoard(board, gameEmoji),
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
                content: baseContent + convertBoard(board, gameEmoji) + `\n${reason}`,
                components: []
            });
        });
    }
}