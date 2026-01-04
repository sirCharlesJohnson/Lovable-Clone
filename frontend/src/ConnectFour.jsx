import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './ConnectFour.css';

const socket = io(`http://${window.location.hostname}:3000`);

const ROWS = 6;
const COLS = 7;

const ConnectFour = () => {
  const [board, setBoard] = useState(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
  const [currentPlayer, setCurrentPlayer] = useState('red');
  const [gameOver, setGameOver] = useState(false);
  const [winnerMessage, setWinnerMessage] = useState('');

  // Multiplayer State
  const [gameMode, setGameMode] = useState('menu'); // 'menu', 'local', 'online'
  const [roomId, setRoomId] = useState('');
  const [assignedColor, setAssignedColor] = useState(null); // 'red' or 'yellow'
  const [playerCount, setPlayerCount] = useState(0);
  const [score, setScore] = useState({ red: 0, yellow: 0 });

  useEffect(() => {
    // Socket event listeners
    socket.on('connect4_player_assigned', ({ color }) => {
      setAssignedColor(color);
    });

    socket.on('connect4_game_update', (gameState) => {
      setBoard(gameState.board);
      setCurrentPlayer(gameState.currentPlayer);
      setGameOver(gameState.gameOver);
      setWinnerMessage(gameState.winnerMessage);
      setPlayerCount(gameState.players);

      if (gameState.winner) {
        setScore(s => ({
          ...s,
          [gameState.winner]: s[gameState.winner] + 1
        }));
      }
    });

    socket.on('connect4_room_full', () => {
      alert('Room is full!');
      setGameMode('menu');
    });

    socket.on('connect4_player_left', () => {
      setPlayerCount(1);
      setWinnerMessage('Opponent Left. Game Reset.');
    });

    return () => {
      socket.off('connect4_player_assigned');
      socket.off('connect4_game_update');
      socket.off('connect4_room_full');
      socket.off('connect4_player_left');
    };
  }, []);

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(newRoomId);
    setGameMode('online');
    socket.emit('join_connect4_room', newRoomId);
  };

  const joinRoom = () => {
    const id = prompt("Enter Room ID:");
    if (id) {
      setRoomId(id);
      setGameMode('online');
      socket.emit('join_connect4_room', id);
    }
  };

  const startLocalGame = () => {
    setGameMode('local');
    resetGameLocal();
  };

  const resetGameLocal = () => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    setCurrentPlayer('red');
    setGameOver(false);
    setWinnerMessage('');
  };

  const resetGameOnline = () => {
    socket.emit('reset_connect4_game', roomId);
  };

  const dropPiece = (col) => {
    if (gameOver) return;

    if (gameMode === 'online') {
      if (playerCount < 2) {
        alert("Waiting for opponent...");
        return;
      }
      if (assignedColor !== currentPlayer) return;
      socket.emit('make_connect4_move', { roomId, col });
      return;
    }

    // Local Logic
    const newBoard = board.map(row => [...row]);
    for (let row = ROWS - 1; row >= 0; row--) {
      if (newBoard[row][col] === null) {
        newBoard[row][col] = currentPlayer;
        setBoard(newBoard);

        if (checkWin(newBoard, row, col, currentPlayer)) {
          setGameOver(true);
          setWinnerMessage(`🎉 ${currentPlayer === 'red' ? 'Red' : 'Yellow'} Wins! 🎉`);
          // Update local score
          setScore(s => ({ ...s, [currentPlayer]: s[currentPlayer] + 1 }));
        } else if (isBoardFull(newBoard)) {
          setGameOver(true);
          setWinnerMessage("🤝 It's a Draw! 🤝");
        } else {
          setCurrentPlayer(currentPlayer === 'red' ? 'yellow' : 'red');
        }
        return;
      }
    }
  };

  const checkWin = (currentBoard, row, col, player) => {
    return (
      checkDirection(currentBoard, row, col, 0, 1, player) || // Horizontal
      checkDirection(currentBoard, row, col, 1, 0, player) || // Vertical
      checkDirection(currentBoard, row, col, 1, 1, player) || // Diagonal /
      checkDirection(currentBoard, row, col, 1, -1, player)   // Diagonal \
    );
  };

  const checkDirection = (currentBoard, row, col, dRow, dCol, player) => {
    let count = 1;
    count += countInDirection(currentBoard, row, col, dRow, dCol, player);
    count += countInDirection(currentBoard, row, col, -dRow, -dCol, player);
    return count >= 4;
  };

  const countInDirection = (currentBoard, row, col, dRow, dCol, player) => {
    let count = 0;
    let r = row + dRow;
    let c = col + dCol;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && currentBoard[r][c] === player) {
      count++;
      r += dRow;
      c += dCol;
    }
    return count;
  };

  const isBoardFull = (currentBoard) => {
    return currentBoard[0].every(cell => cell !== null);
  };

  // Render logic for menu vs game
  if (gameMode === 'menu') {
    return (
      <div className="connect4-container menu">
        <h2 className="connect4-title">🔴 Connect 4 🟡</h2>
        <button className="connect4-menu-btn" onClick={startLocalGame}>Play Local (Same PC)</button>
        <button className="connect4-menu-btn" onClick={createRoom}>Create Online Room</button>
        <button className="connect4-menu-btn" onClick={joinRoom}>Join Online Room</button>
      </div>
    );
  }

  return (
    <div className="connect4-container">
      <h2 className="connect4-title">
        {gameMode === 'local' ? 'Local Game' : `Room: ${roomId}`}
      </h2>
      
      {gameMode === 'online' && (
        <div className="online-info">
          <p>You are: <strong style={{ color: assignedColor === 'red' ? '#e74c3c' : '#f39c12' }}>
            {assignedColor === 'red' ? 'Red' : 'Yellow'}
          </strong></p>
          <p className="waiting-text">{playerCount < 2 ? '(Waiting for opponent...)' : '(Game in progress)'}</p>
        </div>
      )}

      {/* Scoreboard */}
      <div className="connect4-scoreboard">
        <div className="score-box red-score">
          <span className="score-label">Red</span>
          <span className="score-value">{score.red}</span>
        </div>
        <div className="score-box yellow-score">
          <span className="score-label">Yellow</span>
          <span className="score-value">{score.yellow}</span>
        </div>
      </div>

      <div className="connect4-info">
        <div className={`current-player player-${currentPlayer}`}>
          Current Player: {currentPlayer === 'red' ? 'Red' : 'Yellow'}
        </div>
        {winnerMessage && (
          <div className="winner-message" style={{ color: currentPlayer === 'red' ? '#e74c3c' : '#f39c12' }}>
            {winnerMessage}
          </div>
        )}
      </div>

      <div className="connect4-board">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="connect4-row">
            {row.map((cell, colIndex) => (
              <div 
                key={colIndex} 
                className={`connect4-cell ${cell || ''}`} 
                onClick={() => dropPiece(colIndex)}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="controls">
        <button className="connect4-reset-btn" onClick={gameMode === 'local' ? resetGameLocal : resetGameOnline}>
          {winnerMessage ? 'New Game' : 'Reset Board'}
        </button>
        <button className="connect4-exit-btn" onClick={() => {
            setGameMode('menu');
            setScore({ red: 0, yellow: 0 }); // Reset score on exit
            resetGameLocal();
            if (gameMode === 'online') window.location.reload(); 
        }}>
          Exit to Menu
        </button>
      </div>
    </div>
  );
};

export default ConnectFour;
