import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
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

// Game state management
const games = new Map(); // roomId -> game state

function calculateWinner(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  return null;
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Connect 4 helper functions
function checkConnect4Winner(board, row, col, player) {
  const ROWS = 6;
  const COLS = 7;
  
  // Check horizontal
  let count = 1;
  for (let c = col - 1; c >= 0 && board[row][c] === player; c--) count++;
  for (let c = col + 1; c < COLS && board[row][c] === player; c++) count++;
  if (count >= 4) return true;

  // Check vertical
  count = 1;
  for (let r = row - 1; r >= 0 && board[r][col] === player; r--) count++;
  for (let r = row + 1; r < ROWS && board[r][col] === player; r++) count++;
  if (count >= 4) return true;

  // Check diagonal (top-left to bottom-right)
  count = 1;
  for (let r = row - 1, c = col - 1; r >= 0 && c >= 0 && board[r][c] === player; r--, c--) count++;
  for (let r = row + 1, c = col + 1; r < ROWS && c < COLS && board[r][c] === player; r++, c++) count++;
  if (count >= 4) return true;

  // Check diagonal (top-right to bottom-left)
  count = 1;
  for (let r = row - 1, c = col + 1; r >= 0 && c < COLS && board[r][c] === player; r--, c++) count++;
  for (let r = row + 1, c = col - 1; r < ROWS && c >= 0 && board[r][c] === player; r++, c--) count++;
  if (count >= 4) return true;

  return false;
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint for code generation
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

    // Generate code using the codeGen module
    const result = await generateCode(prompt, {
      permissionMode: 'acceptEdits',
      verbose: true
    });

    // Send the result back to the client
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`👤 Player connected: ${socket.id}`);

  // Create a new game room (Tic-Tac-Toe)
  socket.on('createRoom', () => {
    const roomId = generateRoomId();
    const game = {
      gameType: 'tictactoe',
      board: Array(9).fill(null),
      currentPlayer: 'X',
      players: [socket.id],
      playerSymbols: { [socket.id]: 'X' }
    };
    games.set(roomId, game);
    socket.join(roomId);
    socket.emit('roomCreated', { 
      roomId, 
      symbol: 'X',
      players: 1,
      board: game.board,
      currentPlayer: game.currentPlayer
    });
    console.log(`🎮 TicTacToe Room created: ${roomId} by ${socket.id}`);
  });

  // Join an existing game room (Tic-Tac-Toe)
  socket.on('joinRoom', (roomId) => {
    console.log(`🔗 TicTacToe joinRoom event received from ${socket.id} for room: ${roomId}`);
    
    const game = games.get(roomId);
    if (!game) {
      console.log(`❌ TicTacToe Room ${roomId} not found`);
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (game.gameType !== 'tictactoe') {
      socket.emit('error', { message: 'This room is for a different game' });
      return;
    }
    
    if (game.players.length >= 2) {
      console.log(`❌ TicTacToe Room ${roomId} is full`);
      socket.emit('error', { message: 'Room is full' });
      return;
    }
    
    game.players.push(socket.id);
    game.playerSymbols[socket.id] = 'O';
    socket.join(roomId);
    
    console.log(`👥 Player ${socket.id} joining room ${roomId}`);
    console.log(`   Current players in room: ${game.players.length}`);
    console.log(`   Player IDs: ${game.players.join(', ')}`);
    
    socket.emit('roomJoined', { 
      roomId, 
      symbol: 'O', 
      board: game.board, 
      currentPlayer: game.currentPlayer,
      players: game.players.length
    });
    
    // Notify ALL players in the room (including the one who just joined) that a player joined
    console.log(`📢 Broadcasting playerJoined to room ${roomId} with ${game.players.length} players`);
    io.to(roomId).emit('playerJoined', { players: game.players.length });
    
    console.log(`✅ Player ${socket.id} joined room ${roomId} (${game.players.length}/2)`);
  });

  // Handle game move (Tic-Tac-Toe)
  socket.on('makeMove', ({ roomId, index }) => {
    const game = games.get(roomId);
    if (!game || game.gameType !== 'tictactoe') {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const playerSymbol = game.playerSymbols[socket.id];
    if (!playerSymbol) {
      socket.emit('error', { message: 'You are not in this game' });
      return;
    }
    
    if (game.currentPlayer !== playerSymbol) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    
    if (game.board[index] || calculateWinner(game.board)) {
      socket.emit('error', { message: 'Invalid move' });
      return;
    }
    
    game.board[index] = playerSymbol;
    game.currentPlayer = playerSymbol === 'X' ? 'O' : 'X';
    
    const winner = calculateWinner(game.board);
    const isDraw = !winner && game.board.every(Boolean);
    
    io.to(roomId).emit('gameUpdate', {
      board: game.board,
      currentPlayer: game.currentPlayer,
      winner,
      isDraw
    });
    
    console.log(`🎯 Move made in room ${roomId}: ${playerSymbol} at index ${index}`);
  });

  // Reset game (Tic-Tac-Toe)
  socket.on('resetGame', (roomId) => {
    const game = games.get(roomId);
    if (!game || game.gameType !== 'tictactoe') return;
    
    game.board = Array(9).fill(null);
    game.currentPlayer = 'X';
    
    io.to(roomId).emit('gameReset', {
      board: game.board,
      currentPlayer: game.currentPlayer
    });
    
    console.log(`🔄 Game reset in room ${roomId}`);
  });

  // ========== CONNECT 4 GAME HANDLERS ==========
  
  // Create a new Connect 4 room
  socket.on('createRoomConnect4', () => {
    const roomId = generateRoomId();
    const ROWS = 6;
    const COLS = 7;
    const game = {
      gameType: 'connect4',
      board: Array(ROWS).fill(null).map(() => Array(COLS).fill(null)),
      currentPlayer: 'red',
      players: [socket.id],
      playerSymbols: { [socket.id]: 'red' }
    };
    games.set(roomId, game);
    socket.join(roomId);
    socket.emit('connect4RoomCreated', { 
      roomId, 
      symbol: 'red',
      players: 1,
      board: game.board,
      currentPlayer: game.currentPlayer
    });
    console.log(`🎮 Connect4 Room created: ${roomId} by ${socket.id}`);
  });

  // Join an existing Connect 4 room
  socket.on('joinRoomConnect4', (roomId) => {
    console.log(`🔗 Connect4 joinRoom event received from ${socket.id} for room: ${roomId}`);
    
    const game = games.get(roomId);
    if (!game) {
      console.log(`❌ Connect4 Room ${roomId} not found`);
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (game.gameType !== 'connect4') {
      socket.emit('error', { message: 'This room is for a different game' });
      return;
    }
    
    if (game.players.length >= 2) {
      console.log(`❌ Connect4 Room ${roomId} is full`);
      socket.emit('error', { message: 'Room is full' });
      return;
    }
    
    game.players.push(socket.id);
    game.playerSymbols[socket.id] = 'yellow';
    socket.join(roomId);
    
    socket.emit('connect4RoomJoined', { 
      roomId, 
      symbol: 'yellow', 
      board: game.board, 
      currentPlayer: game.currentPlayer,
      players: game.players.length
    });
    
    io.to(roomId).emit('connect4PlayerJoined', { players: game.players.length });
    console.log(`✅ Connect4 Player ${socket.id} joined room ${roomId} (${game.players.length}/2)`);
  });

  // Handle Connect 4 move
  socket.on('connect4Move', ({ roomId, column }) => {
    const game = games.get(roomId);
    if (!game || game.gameType !== 'connect4') {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    const playerSymbol = game.playerSymbols[socket.id];
    if (!playerSymbol) {
      socket.emit('error', { message: 'You are not in this game' });
      return;
    }
    
    if (game.currentPlayer !== playerSymbol) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    
    const ROWS = 6;
    const COLS = 7;
    
    // Check if column is valid and not full
    if (column < 0 || column >= COLS) {
      socket.emit('error', { message: 'Invalid column' });
      return;
    }
    
    if (game.board[0][column] !== null) {
      socket.emit('error', { message: 'Column is full' });
      return;
    }
    
    // Find the lowest empty row in the column
    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (game.board[r][column] === null) {
        row = r;
        break;
      }
    }
    
    if (row === -1) {
      socket.emit('error', { message: 'Column is full' });
      return;
    }
    
    // Make the move
    game.board[row][column] = playerSymbol;
    
    // Check for win
    const winner = checkConnect4Winner(game.board, row, column, playerSymbol);
    
    // Check for draw
    const isDraw = !winner && game.board[0].every(cell => cell !== null);
    
    // Switch player if game continues
    if (!winner && !isDraw) {
      game.currentPlayer = playerSymbol === 'red' ? 'yellow' : 'red';
    }
    
    io.to(roomId).emit('connect4GameUpdate', {
      board: game.board,
      currentPlayer: game.currentPlayer,
      winner: winner ? playerSymbol : null,
      isDraw
    });
    
    console.log(`🎯 Connect4 Move made in room ${roomId}: ${playerSymbol} at column ${column}, row ${row}`);
  });

  // Reset Connect 4 game
  socket.on('connect4Reset', (roomId) => {
    const game = games.get(roomId);
    if (!game || game.gameType !== 'connect4') return;
    
    const ROWS = 6;
    const COLS = 7;
    game.board = Array(ROWS).fill(null).map(() => Array(COLS).fill(null));
    game.currentPlayer = 'red';
    
    io.to(roomId).emit('connect4GameReset', {
      board: game.board,
      currentPlayer: game.currentPlayer
    });
    
    console.log(`🔄 Connect4 Game reset in room ${roomId}`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`👋 Player disconnected: ${socket.id}`);
    // Clean up games with disconnected players
    for (const [roomId, game] of games.entries()) {
      if (game.players.includes(socket.id)) {
        game.players = game.players.filter(id => id !== socket.id);
        if (game.players.length === 0) {
          games.delete(roomId);
          console.log(`🗑️  Room ${roomId} deleted (no players)`);
        } else {
          // Emit appropriate playerLeft event based on game type
          if (game.gameType === 'connect4') {
            io.to(roomId).emit('connect4PlayerLeft', { players: game.players.length });
          } else {
            io.to(roomId).emit('playerLeft', { players: game.players.length });
          }
        }
      }
    }
  });
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎉 Lovable Clone server running!`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔧 API: http://localhost:${PORT}/api/generate`);
  console.log(`🎮 Socket.IO: ws://localhost:${PORT}`);
  console.log(`🌐 Server is accessible on your network!\n`);
});
