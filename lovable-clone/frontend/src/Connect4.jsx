import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './Connect4.css';

const Connect4 = () => {
  const ROWS = 6;
  const COLS = 7;
  const [board, setBoard] = useState(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
  const [currentPlayer, setCurrentPlayer] = useState('red');
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
      const savedScores = localStorage.getItem('connect4_scores');
      return savedScores ? JSON.parse(savedScores) : { wins: 0, losses: 0, draws: 0 };
    } catch (error) {
      console.error('Error loading Connect4 scores:', error);
      return { wins: 0, losses: 0, draws: 0 };
    }
  });
  
  // Save scores to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('connect4_scores', JSON.stringify(scores));
    } catch (error) {
      console.error('Error saving Connect4 scores:', error);
    }
  }, [scores]);

  useEffect(() => {
    // Connect to Socket.IO server
    const urlParams = new URLSearchParams(window.location.search);
    const serverHost = urlParams.get('server') || localStorage.getItem('socketServer') || null;
    
    let serverUrl;
    const hostname = window.location.hostname;
    
    if (serverHost) {
      serverUrl = `http://${serverHost}:3000`;
    } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
      serverUrl = 'http://localhost:3000';
    } else {
      serverUrl = `http://${hostname}:3000`;
    }
    
    if (serverHost) {
      localStorage.setItem('socketServer', serverHost);
    }
    
    console.log(`🌐 Connect4 - Frontend hostname: ${hostname}`);
    console.log(`🔌 Connect4 - Connecting to Socket.IO server at: ${serverUrl}`);
    socketRef.current = io(serverUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log(`✅ Connect4 - Connected to Socket.IO server. Socket ID: ${socket.id}`);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Connect4 - Disconnected from server');
    });

    socket.on('connect_error', (error) => {
      console.error('Connect4 - Connection error:', error);
      setIsConnected(false);
    });

    socket.on('connect4RoomCreated', ({ roomId: newRoomId, symbol, players = 1, board: initialBoard, currentPlayer: initialPlayer }) => {
      console.log(`Connect4 - Room created event received: roomId=${newRoomId}, symbol=${symbol}, players=${players}`);
      setRoomId(newRoomId);
      setPlayerSymbol(symbol);
      playerSymbolRef.current = symbol;
      setPlayersCount(players);
      setWaitingForPlayer(players < 2);
      if (initialBoard) setBoard(initialBoard);
      if (initialPlayer) setCurrentPlayer(initialPlayer);
    });

    socket.on('connect4RoomJoined', ({ roomId: newRoomId, symbol, board: initialBoard, currentPlayer: initialPlayer, players = 2 }) => {
      console.log(`Connect4 - Room joined event received: roomId=${newRoomId}, symbol=${symbol}, players=${players}`);
      setRoomId(newRoomId);
      setPlayerSymbol(symbol);
      playerSymbolRef.current = symbol;
      if (initialBoard) setBoard(initialBoard);
      if (initialPlayer) setCurrentPlayer(initialPlayer);
      setPlayersCount(players);
      setWaitingForPlayer(players < 2);
    });

    socket.on('connect4PlayerJoined', ({ players }) => {
      console.log(`📢 Connect4 - playerJoined event received: players=${players}`);
      setPlayersCount(players);
      setWaitingForPlayer(players < 2);
    });

    socket.on('connect4PlayerLeft', ({ players }) => {
      setPlayersCount(players);
      if (players < 2) {
        setWaitingForPlayer(true);
      }
    });

    socket.on('connect4GameUpdate', ({ board: newBoard, currentPlayer: newCurrentPlayer, winner: newWinner, isDraw: newIsDraw }) => {
      console.log(`Connect4 - Game update received: currentPlayer=${newCurrentPlayer}, winner=${newWinner}`);
      setBoard(newBoard);
      setCurrentPlayer(newCurrentPlayer);
      
      // Update scores when game ends
      if (newWinner && !winner) {
        // Game just ended with a winner - use ref to get current playerSymbol
        const currentPlayerSymbol = playerSymbolRef.current;
        console.log(`🏆 Connect4 - Game ended! Winner: ${newWinner}, You are: ${currentPlayerSymbol}`);
        setScores(prev => {
          const newScores = newWinner === currentPlayerSymbol
            ? { ...prev, wins: prev.wins + 1 }
            : { ...prev, losses: prev.losses + 1 };
          console.log(`📊 Connect4 - Score updated:`, newScores);
          return newScores;
        });
      } else if (newIsDraw && !isDraw) {
        // Game just ended in a draw
        console.log(`🤝 Connect4 - Game ended in a draw!`);
        setScores(prev => {
          const newScores = { ...prev, draws: prev.draws + 1 };
          console.log(`📊 Connect4 - Score updated:`, newScores);
          return newScores;
        });
      }
      
      setWinner(newWinner);
      setIsDraw(newIsDraw);
    });

    socket.on('connect4GameReset', ({ board: newBoard, currentPlayer: newCurrentPlayer }) => {
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

  const handleColumnClick = (col) => {
    console.log(`🔵 Connect4 - Column ${col} clicked`);
    console.log(`   roomId: ${roomId}, playerSymbol: ${playerSymbol}`);
    console.log(`   winner: ${winner}, isDraw: ${isDraw}, waitingForPlayer: ${waitingForPlayer}`);
    console.log(`   currentPlayer: ${currentPlayer}, playerSymbol: ${playerSymbol}`);
    console.log(`   column ${col} top cell: ${board[0][col]}`);
    
    if (!roomId || !playerSymbol) {
      console.log('❌ Cannot click: No room or symbol');
      return;
    }
    if (winner || isDraw) {
      console.log('❌ Cannot click: Game over');
      return;
    }
    if (waitingForPlayer) {
      console.log('❌ Cannot click: Waiting for player');
      return;
    }
    if (currentPlayer !== playerSymbol) {
      console.log(`❌ Cannot click: Not your turn. Current: ${currentPlayer}, You are: ${playerSymbol}`);
      return;
    }

    // Check if column is full
    if (board[0][col] !== null) {
      console.log(`❌ Cannot click: Column ${col} is full`);
      return;
    }

    if (!socketRef.current) {
      console.log('❌ Cannot click: Socket not connected');
      return;
    }

    console.log(`✅ Sending move: column ${col}`);
    socketRef.current.emit('connect4Move', { roomId, column: col });
  };

  const resetGame = () => {
    console.log('🔄 Connect4 - Reset button clicked');
    console.log(`   roomId: ${roomId}, socketRef.current: ${socketRef.current ? 'exists' : 'null'}`);
    if (!roomId) {
      console.log('❌ Cannot reset: No room ID');
      return;
    }
    if (!socketRef.current) {
      console.log('❌ Cannot reset: Socket not connected');
      alert('Not connected to server');
      return;
    }
    console.log(`✅ Sending reset for room: ${roomId}`);
    socketRef.current.emit('connect4Reset', roomId);
  };

  const resetScores = () => {
    if (window.confirm('Are you sure you want to reset your Connect 4 scores?')) {
      setScores({ wins: 0, losses: 0, draws: 0 });
    }
  };

  const createRoom = () => {
    if (!socketRef.current || !isConnected) {
      alert('Not connected to server. Please wait...');
      return;
    }
    console.log('🔵 Connect4 - Creating room...');
    socketRef.current.emit('createRoomConnect4');
  };

  const joinRoom = () => {
    if (!socketRef.current || !isConnected) {
      alert('Not connected to server. Please wait...');
      return;
    }
    if (!roomInput.trim()) {
      alert('Please enter a room ID');
      return;
    }
    const roomIdToJoin = roomInput.trim().toUpperCase();
    console.log(`🔗 Connect4 - Attempting to join room: ${roomIdToJoin}`);
    socketRef.current.emit('joinRoomConnect4', roomIdToJoin);
    setRoomInput('');
    setShowRoomInput(false);
  };

  const getStatus = () => {
    if (winner) {
      return `Winner: ${winner === 'red' ? 'Red' : 'Yellow'}!`;
    }
    if (isDraw) {
      return "It's a draw!";
    }
    if (roomId && waitingForPlayer) {
      return `Waiting for player... (${playersCount}/2)`;
    }
    if (roomId && currentPlayer === playerSymbol) {
      return `Your turn (${playerSymbol === 'red' ? 'Red' : 'Yellow'}) - Click a column!`;
    }
    if (roomId) {
      return `Waiting for opponent... (${currentPlayer === 'red' ? 'Red' : 'Yellow'}'s turn)`;
    }
    return 'Create or join a room to play';
  };

  const canMakeMove = roomId && !waitingForPlayer && !winner && !isDraw && currentPlayer === playerSymbol;

  return (
    <div className="connect4">
      <h2 className="game-title">Connect 4 - Multiplayer</h2>
      
      {!isConnected && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px', 
          backgroundColor: '#ffebee', 
          color: '#c62828',
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          ⚠️ Not connected to server. Waiting for connection...
        </div>
      )}
      
      {!roomId && (
        <div className="room-controls" style={{ marginBottom: '20px' }}>
          <button 
            className="reset-button" 
            onClick={createRoom}
            disabled={!isConnected || !socketRef.current}
            style={{ marginRight: '10px', opacity: (!isConnected || !socketRef.current) ? 0.5 : 1 }}
          >
            Create Room {!isConnected && '(Connecting...)'}
          </button>
          {!showRoomInput ? (
            <button 
              className="reset-button" 
              onClick={() => setShowRoomInput(true)}
              disabled={!isConnected || !socketRef.current}
              style={{ opacity: (!isConnected || !socketRef.current) ? 0.5 : 1 }}
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
          Room ID: <strong>{roomId}</strong> | You are: <strong>{playerSymbol === 'red' ? 'Red' : 'Yellow'}</strong>
          <span style={{ color: isConnected ? '#4CAF50' : '#f44336', marginLeft: '10px' }}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
          {waitingForPlayer && <span style={{ color: '#ff9800' }}> | Waiting for player...</span>}
          <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
            Debug: Players={playersCount}/2 | CurrentTurn={currentPlayer} | YouAre={playerSymbol || 'NOT SET'} | CanClick={canMakeMove ? 'YES' : 'NO'} | Waiting={waitingForPlayer ? 'YES' : 'NO'}
          </div>
        </div>
      )}

      <div className="status">{getStatus()}</div>
      
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
      
      <div className="board-container">
        <div className="board">
          {board.map((row, rowIndex) => (
            <div key={rowIndex} className="row">
              {row.map((cell, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`cell ${cell || 'empty'} ${winner && cell === winner ? 'winner' : ''}`}
                >
                  {cell && <div className={`piece ${cell}`}></div>}
                </div>
              ))}
            </div>
          ))}
        </div>
        
        {/* Column indicators */}
        <div className="column-indicators">
          {Array(COLS).fill(null).map((_, col) => {
            const isDisabled = !roomId || waitingForPlayer || winner || isDraw || currentPlayer !== playerSymbol || board[0][col] !== null || !socketRef.current;
            return (
              <div
                key={col}
                className={`column-indicator ${isDisabled ? 'disabled' : ''} ${currentPlayer}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log(`🖱️ Column ${col} clicked! isDisabled: ${isDisabled}`);
                  console.log(`   roomId: ${roomId}, waitingForPlayer: ${waitingForPlayer}, winner: ${winner}, isDraw: ${isDraw}`);
                  console.log(`   currentPlayer: ${currentPlayer}, playerSymbol: ${playerSymbol}, socketRef: ${socketRef.current ? 'exists' : 'null'}`);
                  if (!isDisabled) {
                    handleColumnClick(col);
                  } else {
                    console.log(`❌ Column ${col} click blocked - disabled`);
                  }
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  console.log(`🖱️ Column ${col} mouse down`);
                }}
                style={{ 
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  pointerEvents: isDisabled ? 'none' : 'auto',
                  userSelect: 'none'
                }}
              >
                ↓
              </div>
            );
          })}
        </div>
      </div>
      
      {roomId && (
        <button 
          className="reset-button" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖱️ Reset button clicked!');
            resetGame();
          }}
          style={{ pointerEvents: 'auto', cursor: 'pointer' }}
        >
          Reset Game
        </button>
      )}
    </div>
  );
};

export default Connect4;
