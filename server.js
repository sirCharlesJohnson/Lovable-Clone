import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { generateCode } from './src/codeGen.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// --- Socket.IO Logic ---
const rooms = new Map(); // Tic-Tac-Toe rooms
const connect4Rooms = new Map(); // Connect 4 rooms
const blackjackRooms = new Map(); // Blackjack rooms

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // --- Tic Tac Toe Events ---
  socket.on('join_room', (roomId) => {
    let room = rooms.get(roomId);

    if (!room) {
      room = {
        id: roomId,
        players: [],
        board: Array(9).fill(null),
        xIsNext: true,
        winner: null
      };
      rooms.set(roomId, room);
    }

    if (room.players.length >= 2) {
      socket.emit('room_full');
      return;
    }

    const symbol = room.players.length === 0 ? 'X' : 'O';
    room.players.push({ id: socket.id, symbol });
    socket.join(roomId);

    socket.emit('player_assigned', { symbol });

    io.to(roomId).emit('game_update', {
      board: room.board,
      xIsNext: room.xIsNext,
      players: room.players.length,
      winner: room.winner
    });
  });

  socket.on('make_move', ({ roomId, index }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const isTurn = (player.symbol === 'X' && room.xIsNext) || (player.symbol === 'O' && !room.xIsNext);
    
    if (isTurn && !room.board[index] && !room.winner) {
      room.board[index] = player.symbol;
      room.xIsNext = !room.xIsNext;
      room.winner = calculateWinner(room.board);

      io.to(roomId).emit('game_update', {
        board: room.board,
        xIsNext: room.xIsNext,
        players: room.players.length,
        winner: room.winner
      });
    }
  });

  socket.on('reset_game', (roomId) => {
    const room = rooms.get(roomId);
    if (room) {
      room.board = Array(9).fill(null);
      room.xIsNext = true;
      room.winner = null;
      io.to(roomId).emit('game_update', {
        board: room.board,
        xIsNext: room.xIsNext,
        players: room.players.length,
        winner: room.winner
      });
    }
  });

  // --- Connect 4 Events ---
  socket.on('join_connect4_room', (roomId) => {
    let room = connect4Rooms.get(roomId);

    if (!room) {
      room = {
        id: roomId,
        players: [],
        board: Array(6).fill(null).map(() => Array(7).fill(null)),
        currentPlayer: 'red',
        winnerMessage: '',
        gameOver: false
      };
      connect4Rooms.set(roomId, room);
    }

    if (room.players.length >= 2) {
      socket.emit('connect4_room_full');
      return;
    }

    const color = room.players.length === 0 ? 'red' : 'yellow';
    room.players.push({ id: socket.id, color });
    socket.join('c4_' + roomId);

    socket.emit('connect4_player_assigned', { color });

    io.to('c4_' + roomId).emit('connect4_game_update', {
      board: room.board,
      currentPlayer: room.currentPlayer,
      players: room.players.length,
      winnerMessage: room.winnerMessage,
      gameOver: room.gameOver,
      winner: room.gameOver ? room.winner : null
    });
  });

  socket.on('make_connect4_move', ({ roomId, col }) => {
    const room = connect4Rooms.get(roomId);
    if (!room || room.gameOver) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    if (player.color !== room.currentPlayer) return;

    const ROWS = 6;
    let moveMade = false;
    let winner = null;

    for (let row = ROWS - 1; row >= 0; row--) {
      if (room.board[row][col] === null) {
        room.board[row][col] = player.color;
        moveMade = true;
        
        if (checkConnect4Win(room.board, row, col, player.color)) {
          room.gameOver = true;
          room.winnerMessage = `🎉 ${player.color === 'red' ? 'Red' : 'Yellow'} Wins! 🎉`;
          winner = player.color;
          room.winner = winner;
        } else if (room.board[0].every(cell => cell !== null)) {
          room.gameOver = true;
          room.winnerMessage = "🤝 It's a Draw! 🤝";
        } else {
          room.currentPlayer = room.currentPlayer === 'red' ? 'yellow' : 'red';
        }
        break;
      }
    }

    if (moveMade) {
      io.to('c4_' + roomId).emit('connect4_game_update', {
        board: room.board,
        currentPlayer: room.currentPlayer,
        players: room.players.length,
        winnerMessage: room.winnerMessage,
        gameOver: room.gameOver,
        winner: winner
      });
    }
  });

  socket.on('reset_connect4_game', (roomId) => {
    const room = connect4Rooms.get(roomId);
    if (room) {
      room.board = Array(6).fill(null).map(() => Array(7).fill(null));
      room.currentPlayer = 'red';
      room.gameOver = false;
      room.winnerMessage = '';
      
      io.to('c4_' + roomId).emit('connect4_game_update', {
        board: room.board,
        currentPlayer: room.currentPlayer,
        players: room.players.length,
        winnerMessage: room.winnerMessage,
        gameOver: room.gameOver,
        winner: null
      });
    }
  });

  // --- Blackjack Events (Multi-Seat) ---
  socket.on('join_blackjack_room', (roomId) => {
    console.log(`Socket ${socket.id} joining blackjack room ${roomId}`);
    let room = blackjackRooms.get(roomId);
    if (!room) {
      room = {
        id: roomId,
        players: [], // Array of { id, hand, score, status, totalWins }
        dealerHand: [],
        deck: createDeck(),
        gameStatus: 'waiting', // 'waiting', 'playing', 'dealer_turn', 'ended'
        turnIndex: 0, // 0 = Player 1, 1 = Player 2, etc.
        dealerMessage: 'Waiting for players...'
      };
      blackjackRooms.set(roomId, room);
    }

    // Add player if not already in
    const existingPlayer = room.players.find(p => p.id === socket.id);
    if (!existingPlayer) {
        if (room.gameStatus !== 'waiting' && room.gameStatus !== 'ended') {
            // Late joiner - spectator for now or wait for next hand
            // For simplicity, reset game if someone joins mid-game or just let them wait?
            // Let's add them as 'waiting_next_hand'
            room.players.push({
                id: socket.id,
                hand: [],
                score: 0,
                status: 'waiting',
                totalWins: { wins: 0, losses: 0, draws: 0 }
            });
        } else {
            room.players.push({
                id: socket.id,
                hand: [],
                score: 0,
                status: 'playing',
                totalWins: { wins: 0, losses: 0, draws: 0 }
            });
        }
    }

    socket.join('bj_' + roomId);

    socket.emit('blackjack_room_joined', { roomId, myId: socket.id });
    sendBlackjackUpdate(io, roomId, room);
  });

  socket.on('blackjack_action', ({ roomId, action }) => {
    const room = blackjackRooms.get(roomId);
    if (!room) return;

    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) {
        console.log(`Player ${socket.id} not found in room ${roomId}`);
        // If it's a 'deal' action, maybe allow any player to start?
        // Or re-add player if missing?
        return;
    }
    const player = room.players[playerIndex];

    console.log(`Processing action ${action} for player ${playerIndex} in status ${room.gameStatus} (Turn: ${room.turnIndex})`);

    if (action === 'deal') {
        // Reset game for everyone
        room.deck = createDeck();
        room.dealerHand = [drawCard(room.deck), drawCard(room.deck)];
        room.gameStatus = 'playing';
        room.turnIndex = 0;
        room.dealerMessage = '';

        // Reset all players
        room.players.forEach(p => {
            p.hand = [drawCard(room.deck), drawCard(room.deck)];
            p.score = calculateHand(p.hand);
            p.status = 'playing';
            p.message = ''; // Clear previous messages
            
            if (p.score === 21) {
                p.status = 'blackjack';
            }
        });
        
        // Find first active player
        advanceTurn(room);
        sendBlackjackUpdate(io, roomId, room);

    } else if (action === 'hit') {
        // Allow hit if it is their turn AND game is playing
        if (room.turnIndex !== playerIndex) {
             console.log(`Hit ignored: Not player's turn (Current: ${room.turnIndex}, Request: ${playerIndex})`);
             return;
        }
        if (room.gameStatus !== 'playing') {
             console.log(`Hit ignored: Game not playing (Status: ${room.gameStatus})`);
             return;
        }

        player.hand.push(drawCard(room.deck));
        player.score = calculateHand(player.hand);

        if (player.score > 21) {
            player.status = 'busted';
            advanceTurn(room);
        } else if (player.score === 21) {
            // Auto-stand on 21? Optional. Let's let them stand manually or auto.
            // Usually auto-stand on 21 unless you can hit on soft 21? 
            // Let's just update score. User clicks Stand.
        }

        sendBlackjackUpdate(io, roomId, room);

    } else if (action === 'stand') {
        if (room.turnIndex !== playerIndex || room.gameStatus !== 'playing') return;
        
        player.status = 'stood';
        advanceTurn(room);
        sendBlackjackUpdate(io, roomId, room);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    cleanupRoom(rooms, socket.id, io);
    cleanupRoom(connect4Rooms, socket.id, io, 'c4_');
    
    // Cleanup Blackjack
    for (const [roomId, room] of blackjackRooms.entries()) {
      const idx = room.players.findIndex(p => p.id === socket.id);
      if (idx !== -1) {
        room.players.splice(idx, 1);
        if (room.players.length === 0) {
            blackjackRooms.delete(roomId);
        } else {
            // If it was their turn, advance
            if (room.turnIndex === idx) {
                advanceTurn(room);
            } else if (room.turnIndex > idx) {
                room.turnIndex--;
            }
            sendBlackjackUpdate(io, roomId, room);
        }
      }
    }
  });
});

function advanceTurn(room) {
    // Check if current player is done
    let allDone = true;
    
    // Find next player who is 'playing'
    // Start looking from current turnIndex
    let nextIndex = -1;
    
    // Check if we are still within player range
    if (room.turnIndex < room.players.length) {
        const currentP = room.players[room.turnIndex];
        if (currentP.status === 'playing') {
            // Still their turn (e.g. after a hit that didn't bust)
            return;
        }
        // If they busted/stood/blackjack, move to next
        room.turnIndex++;
    }

    // Loop through remaining players to find next 'playing' (or someone who needs to act)
    // Actually, in our logic, status becomes 'stood'/'busted'/'blackjack' immediately.
    // So we just need to find the next player index that exists.
    
    if (room.turnIndex >= room.players.length) {
        // All players done, Dealer's turn
        playDealerTurn(room);
    }
}

function playDealerTurn(room) {
    room.gameStatus = 'dealer_turn';
    let dScore = calculateHand(room.dealerHand);
    
    while (dScore < 17) {
        room.dealerHand.push(drawCard(room.deck));
        dScore = calculateHand(room.dealerHand);
    }
    
    room.gameStatus = 'ended';
    const dealerBust = dScore > 21;
    
    // Calculate winners
    room.players.forEach(p => {
        if (p.status === 'busted') {
            p.message = 'Bust!';
            p.totalWins.losses++;
        } else {
            if (dealerBust) {
                p.message = 'Dealer Busts! You Win!';
                p.totalWins.wins++;
            } else if (p.score > dScore) {
                p.message = 'You Win!';
                p.totalWins.wins++;
            } else if (p.score < dScore) {
                p.message = 'Dealer Wins.';
                p.totalWins.losses++;
            } else {
                p.message = 'Push.';
                p.totalWins.draws++;
            }
        }
        if (p.status === 'blackjack') {
             // Already handled? Blackjack usually pays 3:2, but here just a win.
             // If dealer has blackjack too? Push.
             // For simplicity, compare scores. 21 vs 21 is push.
        }
    });
}

function cleanupRoom(map, socketId, io, prefix = '') {
  for (const [roomId, room] of map.entries()) {
    const playerIndex = room.players.findIndex(p => p.id === socketId);
    if (playerIndex !== -1) {
      room.players.splice(playerIndex, 1);
      if (room.players.length === 0) {
        map.delete(roomId);
      } else {
        const eventPrefix = prefix === 'c4_' ? 'connect4_' : '';
        io.to(prefix + roomId).emit(`${eventPrefix}player_left`);
      }
    }
  }
}

// --- Helpers ---
function calculateWinner(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}

function checkConnect4Win(board, row, col, player) {
  const ROWS = 6;
  const COLS = 7;

  function countInDirection(r, c, dRow, dCol) {
    let count = 0;
    let currR = r + dRow;
    let currC = c + dCol;
    while (currR >= 0 && currR < ROWS && currC >= 0 && currC < COLS && board[currR][currC] === player) {
      count++;
      currR += dRow;
      currC += dCol;
    }
    return count;
  }

  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dRow, dCol] of directions) {
    const count = 1 + countInDirection(row, col, dRow, dCol) + countInDirection(row, col, -dRow, -dCol);
    if (count >= 4) return true;
  }
  return false;
}

function createDeck() {
  const suits = ['♠', '♥', '♦', '♣'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck = [];
  for (let s of suits) {
    for (let v of values) deck.push({ suit: s, value: v });
  }
  return deck.sort(() => Math.random() - 0.5);
}

function drawCard(deck) {
  if (deck.length === 0) return null; // Should re-shuffle in real game
  return deck.pop();
}

function calculateHand(hand) {
  let score = 0;
  let aces = 0;
  for (let card of hand) {
    if (['J', 'Q', 'K'].includes(card.value)) score += 10;
    else if (card.value === 'A') { score += 11; aces += 1; }
    else score += parseInt(card.value);
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }
  return score;
}

function sendBlackjackUpdate(io, roomId, room) {
  // Hide dealer card if playing
  const dealerPublicHand = (room.gameStatus === 'ended') 
    ? room.dealerHand 
    : (room.dealerHand.length > 0 ? [room.dealerHand[0], { hidden: true }] : []);

  const dealerScore = (room.gameStatus === 'ended')
    ? calculateHand(room.dealerHand)
    : (room.dealerHand.length > 0 ? calculateHand([room.dealerHand[0]]) : 0);

  io.to('bj_' + roomId).emit('blackjack_game_update', {
    players: room.players, // Contains hands, scores, wins
    dealerHand: dealerPublicHand,
    dealerScore: dealerScore,
    gameStatus: room.gameStatus,
    turnIndex: room.turnIndex,
    dealerMessage: room.dealerMessage
  });
}

// ... API endpoints ...
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required and must be a string'
      });
    }
    console.log(`\n🚀 Received generation request: ${prompt}`);
    const result = await generateCode(prompt, {
      permissionMode: 'acceptEdits',
      verbose: true
    });
    res.json({
      success: result.success,
      messages: result.messages,
      error: result.error,
      filesGenerated: result.messages.filter(msg =>
        msg.includes('Writing') ||
        msg.includes('Editing') ||
        msg.includes('Created')
      )
    });
  } catch (error) {
    console.error('Error during code generation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

httpServer.listen(PORT, () => {
  console.log(`\n🎉 Lovable Clone server running!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api/generate\n`);
  console.log(`🎮 Socket.IO enabled for Multiplayer Tic-Tac-Toe, Connect 4 & Blackjack`);
});
