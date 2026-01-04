import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './TicTacToe.css';

const TicTacToe = () => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [winner, setWinner] = useState(null);
  const [isDraw, setIsDraw] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [playerSymbol, setPlayerSymbol] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showRoomInput, setShowRoomInput] = useState(false);
  const [roomInput, setRoomInput] = useState('');
  const [waitingForPlayer, setWaitingForPlayer] = useState(false);
  const [playersCount, setPlayersCount] = useState(0);
  const socketRef = useRef(null);
  const playerSymbolRef = useRef(null);
  
  // Score tracking
  const [scores, setScores] = useState(() => {
    try {
      const savedScores = localStorage.getItem('tictactoe_scores');
      return savedScores ? JSON.parse(savedScores) : { wins: 0, losses: 0, draws: 0 };
    } catch (error) {
      console.error('Error loading scores:', error);
      return { wins: 0, losses: 0, draws: 0 };
    }
  });
  
  // Save scores to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('tictactoe_scores', JSON.stringify(scores));
    } catch (error) {
      console.error('Error saving scores:', error);
    }
  }, [scores]);

  useEffect(() => {
    // Connect to Socket.IO server
    // Check for server URL in URL params, localStorage, or use smart detection
    const urlParams = new URLSearchParams(window.location.search);
    const serverHost = urlParams.get('server') || localStorage.getItem('socketServer') || null;
    
    let serverUrl;
    const hostname = window.location.hostname;
    
    if (serverHost) {
      // Use explicitly provided server host
      serverUrl = `http://${serverHost}:3000`;
    } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
      // Local development - try to detect if we should use a network IP
      // Default to localhost, but user can override with ?server=192.168.1.42
      serverUrl = 'http://localhost:3000';
    } else {
      // Network access - use the same hostname (IP address)
      serverUrl = `http://${hostname}:3000`;
    }
    
    // Save to localStorage for convenience
    if (serverHost) {
      localStorage.setItem('socketServer', serverHost);
    }
    
    console.log(`🌐 Frontend hostname: ${hostname}`);
    console.log(`🔌 Connecting to Socket.IO server at: ${serverUrl}`);
    socketRef.current = io(serverUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log(`✅ Connected to Socket.IO server. Socket ID: ${socket.id}`);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    socket.on('roomCreated', ({ roomId: newRoomId, symbol, players = 1, board: initialBoard, currentPlayer: initialPlayer }) => {
      console.log(`Room created event received: roomId=${newRoomId}, symbol=${symbol}, players=${players}`);
      setRoomId(newRoomId);
      setPlayerSymbol(symbol);
      playerSymbolRef.current = symbol;
      setPlayersCount(players);
      setWaitingForPlayer(players < 2);
      if (initialBoard) setBoard(initialBoard);
      if (initialPlayer) setCurrentPlayer(initialPlayer);
      console.log(`Room created: ${newRoomId}, You are ${symbol}, Players: ${players}/2, Current player: ${initialPlayer}`);
    });

    socket.on('roomJoined', ({ roomId: newRoomId, symbol, board: initialBoard, currentPlayer: initialPlayer, players = 2 }) => {
      console.log(`Room joined event received: roomId=${newRoomId}, symbol=${symbol}, players=${players}, currentPlayer=${initialPlayer}`);
      setRoomId(newRoomId);
      setPlayerSymbol(symbol);
      playerSymbolRef.current = symbol;
      if (initialBoard) setBoard(initialBoard);
      if (initialPlayer) setCurrentPlayer(initialPlayer);
      setPlayersCount(players);
      setWaitingForPlayer(players < 2);
      console.log(`Joined room: ${newRoomId}, You are ${symbol}, Players: ${players}/2, Current player: ${initialPlayer}`);
    });

    socket.on('playerJoined', ({ players }) => {
      console.log(`📢 playerJoined event received: players=${players}`);
      console.log(`   Current state before update: playersCount=${playersCount}, waitingForPlayer=${waitingForPlayer}, playerSymbol=${playerSymbol}`);
      setPlayersCount(players);
      setWaitingForPlayer(players < 2);
      console.log(`✅ Updated: Players in room: ${players}/2, waitingForPlayer=${players < 2}`);
    });

    socket.on('playerLeft', ({ players }) => {
      setPlayersCount(players);
      if (players < 2) {
        setWaitingForPlayer(true);
      }
    });

    socket.on('gameUpdate', ({ board: newBoard, currentPlayer: newCurrentPlayer, winner: newWinner, isDraw: newIsDraw }) => {
      console.log(`Game update received: currentPlayer=${newCurrentPlayer}, playerSymbol=${playerSymbol}, winner=${newWinner}, isDraw=${newIsDraw}`);
      setBoard(newBoard);
      setCurrentPlayer(newCurrentPlayer);
      
      // Update scores when game ends
      if (newWinner && !winner) {
        // Game just ended with a winner - use ref to get current playerSymbol
        const currentPlayerSymbol = playerSymbolRef.current;
        console.log(`🏆 TicTacToe - Game ended! Winner: ${newWinner}, You are: ${currentPlayerSymbol}`);
        setScores(prev => {
          const newScores = newWinner === currentPlayerSymbol
            ? { ...prev, wins: prev.wins + 1 }
            : { ...prev, losses: prev.losses + 1 };
          console.log(`📊 TicTacToe - Score updated:`, newScores);
          return newScores;
        });
      } else if (newIsDraw && !isDraw) {
        // Game just ended in a draw
        console.log(`🤝 TicTacToe - Game ended in a draw!`);
        setScores(prev => {
          const newScores = { ...prev, draws: prev.draws + 1 };
          console.log(`📊 TicTacToe - Score updated:`, newScores);
          return newScores;
        });
      }
      
      setWinner(newWinner);
      setIsDraw(newIsDraw);
    });

    socket.on('gameReset', ({ board: newBoard, currentPlayer: newCurrentPlayer }) => {
      setBoard(newBoard);
      setCurrentPlayer(newCurrentPlayer);
      setWinner(null);
      setIsDraw(false);
    });

    socket.on('error', ({ message }) => {
      alert(message);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleClick = (index) => {
    if (!roomId || !playerSymbol) {
      console.log('Cannot click: No room or symbol');
      return;
    }
    if (board[index] || winner || isDraw) {
      console.log('Cannot click: Square taken or game over');
      return;
    }
    if (waitingForPlayer) {
      console.log('Cannot click: Waiting for player');
      return;
    }
    if (currentPlayer !== playerSymbol) {
      console.log(`Cannot click: Not your turn. Current: ${currentPlayer}, You are: ${playerSymbol}`);
      return;
    }

    console.log(`Making move: index ${index}, player ${playerSymbol}`);
    socketRef.current.emit('makeMove', { roomId, index });
  };

  const resetGame = () => {
    if (!roomId) return;
    socketRef.current.emit('resetGame', roomId);
  };

  const resetScores = () => {
    if (window.confirm('Are you sure you want to reset your scores?')) {
      setScores({ wins: 0, losses: 0, draws: 0 });
    }
  };

  const createRoom = () => {
    socketRef.current.emit('createRoom');
  };

  const joinRoom = () => {
    if (!roomInput.trim()) {
      alert('Please enter a room ID');
      return;
    }
    const roomIdToJoin = roomInput.trim().toUpperCase();
    console.log(`🔗 Attempting to join room: ${roomIdToJoin}`);
    socketRef.current.emit('joinRoom', roomIdToJoin);
    setRoomInput('');
    setShowRoomInput(false);
  };

  const canMakeMove = roomId && !waitingForPlayer && !winner && !isDraw && currentPlayer === playerSymbol;
  
  const status = winner
    ? `Winner: ${winner}`
    : isDraw
    ? 'Draw!'
    : roomId && waitingForPlayer
    ? `Waiting for player... (${playersCount}/2)`
    : roomId && currentPlayer === playerSymbol
    ? `Your turn (${playerSymbol}) - Click a square!`
    : roomId
    ? `Waiting for opponent... (${currentPlayer}'s turn)`
    : 'Create or join a room to play';

  return (
    <div className="tic-tac-toe">
      <h2 className="game-title">Tic Tac Toe - Multiplayer</h2>
      
      {!roomId && (
        <div className="room-controls" style={{ marginBottom: '20px' }}>
          <button 
            className="reset-button" 
            onClick={createRoom}
            disabled={!isConnected}
            style={{ marginRight: '10px' }}
          >
            Create Room
          </button>
          {!showRoomInput ? (
            <button 
              className="reset-button" 
              onClick={() => setShowRoomInput(true)}
              disabled={!isConnected}
            >
              Join Room
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Enter Room ID"
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
                style={{
                  padding: '8px',
                  fontSize: '16px',
                  border: '2px solid #4CAF50',
                  borderRadius: '4px',
                  textTransform: 'uppercase'
                }}
              />
              <button className="reset-button" onClick={joinRoom}>
                Join
              </button>
              <button className="reset-button" onClick={() => {
                setShowRoomInput(false);
                setRoomInput('');
              }}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {roomId && (
        <div className="room-info" style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
          Room ID: <strong>{roomId}</strong> | You are: <strong>{playerSymbol || 'NOT SET'}</strong>
          <span style={{ color: isConnected ? '#4CAF50' : '#f44336', marginLeft: '10px' }}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
          {waitingForPlayer && <span style={{ color: '#ff9800' }}> | Waiting for player...</span>}
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
            Debug: Players={playersCount}/2 | CurrentTurn={currentPlayer} | YouAre={playerSymbol || 'NOT SET'} | CanClick={canMakeMove ? 'YES' : 'NO'} | Waiting={waitingForPlayer ? 'YES' : 'NO'} | Connected={isConnected ? 'YES' : 'NO'}
          </div>
        </div>
      )}

      <div className="status">{status}</div>
      
      {/* Score Display */}
      <div style={{ 
        marginBottom: '15px', 
        padding: '10px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '6px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '14px',
        gap: '15px'
      }}>
        <div style={{ display: 'flex', gap: '20px' }}>
          <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>Wins: {scores.wins}</span>
          <span style={{ color: '#f44336', fontWeight: 'bold' }}>Losses: {scores.losses}</span>
          <span style={{ color: '#ff9800', fontWeight: 'bold' }}>Draws: {scores.draws}</span>
        </div>
        <button 
          onClick={resetScores}
          style={{
            padding: '3px 6px',
            fontSize: '11px',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          Reset Scores
        </button>
      </div>
      
      <div className="board">
        {board.map((square, index) => (
          <button
            key={index}
            className={`square ${square ? square.toLowerCase() : ''} ${winner && winner === square ? 'winner' : ''}`}
            onClick={() => handleClick(index)}
            disabled={!roomId || waitingForPlayer || board[index] || winner || isDraw || currentPlayer !== playerSymbol || !playerSymbol}
          >
            {square}
          </button>
        ))}
      </div>
      {roomId && (
        <button className="reset-button" onClick={resetGame}>
          Reset Game
        </button>
      )}
    </div>
  );
};

export default TicTacToe;
