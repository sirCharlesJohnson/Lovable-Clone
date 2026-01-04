import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './TicTacToe.css';

// Connect to the backend server
const socket = io(`http://${window.location.hostname}:3000`);

const TicTacToe = () => {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);
  const [winner, setWinner] = useState(null);
  
  // Multiplayer State
  const [gameMode, setGameMode] = useState('menu'); // 'menu', 'local', 'online'
  const [roomId, setRoomId] = useState('');
  const [assignedSymbol, setAssignedSymbol] = useState(null); // 'X' or 'O'
  const [playerCount, setPlayerCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [score, setScore] = useState({ me: 0, opponent: 0 });

  useEffect(() => {
    // Socket event listeners
    socket.on('player_assigned', ({ symbol }) => {
      setAssignedSymbol(symbol);
      setStatusMessage(`You are player ${symbol}`);
    });

    socket.on('game_update', (gameState) => {
      setBoard(gameState.board);
      setXIsNext(gameState.xIsNext);
      setWinner(gameState.winner);
      setPlayerCount(gameState.players);
      
      // Update score if game just ended
      if (gameState.winner) {
        if (gameState.winner === assignedSymbol) {
           setScore(s => ({ ...s, me: s.me + 1 }));
        } else {
           setScore(s => ({ ...s, opponent: s.opponent + 1 }));
        }
      }
    });

    socket.on('room_full', () => {
      alert('Room is full!');
      setGameMode('menu');
    });

    socket.on('player_left', () => {
      setStatusMessage('Opponent left. Waiting...');
      setPlayerCount(1);
    });

    return () => {
      socket.off('player_assigned');
      socket.off('game_update');
      socket.off('room_full');
      socket.off('player_left');
    };
  }, []);

  const handleLocalClick = (index) => {
    if (board[index] || winner) return;
    const newBoard = [...board];
    newBoard[index] = xIsNext ? 'X' : 'O';
    setBoard(newBoard);
    setXIsNext(!xIsNext);
    setWinner(calculateWinner(newBoard));
  };

  const handleOnlineClick = (index) => {
    // Check if it's my turn and game is active
    if (board[index] || winner) return;
    
    if (playerCount < 2) {
      alert("Waiting for opponent...");
      return;
    }

    const isMyTurn = (assignedSymbol === 'X' && xIsNext) || (assignedSymbol === 'O' && !xIsNext);
    
    if (!isMyTurn) {
      // Not my turn
      return; 
    }

    socket.emit('make_move', { roomId, index });
  };

  const createRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(newRoomId);
    setGameMode('online');
    socket.emit('join_room', newRoomId);
  };

  const joinRoom = () => {
    const id = prompt("Enter Room ID:");
    if (id) {
      setRoomId(id);
      setGameMode('online');
      socket.emit('join_room', id);
    }
  };

  const startLocalGame = () => {
    setGameMode('local');
    resetGameLocal();
  };

  const resetGameLocal = () => {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
    setWinner(null);
  };

  const resetGameOnline = () => {
    socket.emit('reset_game', roomId);
  };

  // Status Text Logic
  let status;
  if (gameMode === 'local') {
    status = winner
      ? `Winner: ${winner}`
      : board.every(Boolean)
      ? 'Draw!'
      : `Next player: ${xIsNext ? 'X' : 'O'}`;
  } else if (gameMode === 'online') {
    if (winner) {
      status = winner === assignedSymbol ? 'You Win!' : 'You Lose!';
    } else if (board.every(Boolean)) {
      status = 'Draw!';
    } else {
      const isMyTurn = (assignedSymbol === 'X' && xIsNext) || (assignedSymbol === 'O' && !xIsNext);
      status = isMyTurn ? `Your Turn (${assignedSymbol})` : `Opponent's Turn (${assignedSymbol === 'X' ? 'O' : 'X'})`;
    }
    
    if (playerCount < 2) {
      status = "Waiting for player...";
    }
  }

  // --- Render ---

  if (gameMode === 'menu') {
    return (
      <div className="tic-tac-toe menu">
        <h2 className="game-title">Tic Tac Toe</h2>
        <button className="menu-btn" onClick={startLocalGame}>Play Local (Same PC)</button>
        <button className="menu-btn" onClick={createRoom}>Create Online Room</button>
        <button className="menu-btn" onClick={joinRoom}>Join Online Room</button>
      </div>
    );
  }

  return (
    <div className="tic-tac-toe">
      <h2 className="game-title">
        {gameMode === 'local' ? 'Local Game' : `Room: ${roomId}`}
      </h2>
      
      {gameMode === 'online' && (
        <div className="online-info">
          <p>You are: <strong>{assignedSymbol}</strong></p>
          <p className="waiting-text">{playerCount < 2 ? '(Waiting for opponent... share Room ID)' : '(Game in progress)'}</p>
        </div>
      )}

      <div className="scoreboard">
        <div className="score-item">
          <span className="score-label">{gameMode === 'online' ? 'You' : 'Player X'}</span>
          <span className="score-value">{score.me}</span>
        </div>
        <div className="score-item">
          <span className="score-label">{gameMode === 'online' ? 'Opponent' : 'Player O'}</span>
          <span className="score-value">{score.opponent}</span>
        </div>
      </div>

      <div className="status">{status}</div>
      
      <div className="board">
        {board.map((square, index) => (
          <button
            key={index}
            className={`square ${square ? square.toLowerCase() : ''} ${winner && winner === square ? 'winner' : ''}`}
            onClick={() => gameMode === 'local' ? handleLocalClick(index) : handleOnlineClick(index)}
            disabled={gameMode === 'online' && playerCount < 2}
          >
            {square}
          </button>
        ))}
      </div>

      <div className="controls">
        <button className="reset-button" onClick={gameMode === 'local' ? resetGameLocal : resetGameOnline}>
          {winner ? 'New Game' : 'Reset Board'}
        </button>
        <button className="exit-button" onClick={() => {
            setGameMode('menu');
            setBoard(Array(9).fill(null));
            if (gameMode === 'online') {
                // Ideally emit 'leave_room' but disconnect handles it
                window.location.reload(); // Simple way to reset socket connection state
            }
        }}>
          Exit to Menu
        </button>
      </div>
    </div>
  );
};

// Local helper (duplicate of server logic for local play)
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

export default TicTacToe;
