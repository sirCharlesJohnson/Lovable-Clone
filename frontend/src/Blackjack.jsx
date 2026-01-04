import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './Blackjack.css';

const socket = io(`http://${window.location.hostname}:3000`);

const Blackjack = () => {
  // Game State
  const [gameState, setGameState] = useState({
    players: [],
    dealerHand: [],
    dealerScore: 0,
    gameStatus: 'waiting', // waiting, playing, dealer_turn, ended
    turnIndex: 0,
    dealerMessage: ''
  });

  // Multiplayer State
  const [gameMode, setGameMode] = useState('menu'); // 'menu', 'online' (local removed for simplicity in multi-seat)
  const [roomId, setRoomId] = useState('');
  const [myId, setMyId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => {
      console.log('Connected to server via Socket.IO');
      setIsConnected(true);
      setMyId(socket.id);
    };

    const onDisconnect = () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    
    // Check initial state
    if (socket.connected) {
        setIsConnected(true);
        setMyId(socket.id);
    }

    socket.on('blackjack_game_update', (newState) => {
      console.log('Game Update:', newState);
      
      // If a new deal happened (turnIndex 0 and status playing), force clear messages visually just in case
      // actually, the server sends cleared messages in the 'players' array.
      // We just need to make sure we use them.
      
      setGameState(prev => ({
          ...prev, 
          ...newState,
          players: newState.players || prev.players || [] 
      }));
    });

    socket.on('blackjack_room_joined', ({ roomId, myId }) => {
      console.log('Joined room:', roomId, 'MyID:', myId);
      setRoomId(roomId);
      setMyId(myId);
      setGameMode('online');
      setIsCreating(false);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('blackjack_game_update');
      socket.off('blackjack_room_joined');
    };
  }, []);

  // --- Actions ---

  const createRoom = () => {
    setIsCreating(true);
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    socket.emit('join_blackjack_room', newRoomId);
    setTimeout(() => { if (isCreating) setIsCreating(false); }, 5000);
  };

  const joinRoom = () => {
    const id = prompt("Enter Room ID:");
    if (id) {
      socket.emit('join_blackjack_room', id);
    }
  };

  const hit = () => {
    socket.emit('blackjack_action', { roomId, action: 'hit' });
  };

  const stand = () => {
    socket.emit('blackjack_action', { roomId, action: 'stand' });
  };

  const deal = () => {
    // Optimistically clear messages
    setGameState(prev => ({
        ...prev,
        players: prev.players.map(p => ({ ...p, message: '' })),
        dealerMessage: ''
    }));
    socket.emit('blackjack_action', { roomId, action: 'deal' });
  };

  // --- Render Helpers ---

  const isMyTurn = () => {
    if (gameState.gameStatus !== 'playing') return false;
    const currentPlayer = gameState.players[gameState.turnIndex];
    return currentPlayer && currentPlayer.id === myId;
  };

  const getMyPlayer = () => (gameState.players || []).find(p => p.id === myId);
  const getOtherPlayers = () => (gameState.players || []).filter(p => p.id !== myId);

  // --- Render ---

  if (gameMode === 'menu') {
    return (
      <div className="blackjack-container menu">
        <h2 className="blackjack-title">♠️ Blackjack ♦️</h2>
        <div style={{ color: isConnected ? '#2ecc71' : '#e74c3c', marginBottom: '10px' }}>
            {isConnected ? '🟢 Server Connected' : '🔴 Server Disconnected'}
        </div>
        <p className="menu-subtitle">Multi-Player Table</p>
        <button className="blackjack-menu-btn" onClick={createRoom} disabled={isCreating}>
            {isCreating ? 'Creating Table...' : 'Create New Table'}
        </button>
        <button className="blackjack-menu-btn" onClick={joinRoom}>Join Table</button>
      </div>
    );
  }

  const myPlayer = getMyPlayer();
  const otherPlayers = getOtherPlayers();

  return (
    <div className="blackjack-container">
      <div className="game-header">
        <h2 className="blackjack-title">Room: {roomId}</h2>
        <div className="header-info">
            <span>Players: {gameState.players ? gameState.players.length : 0}</span>
            {gameState.gameStatus === 'waiting' && <span className="waiting-pulse">Waiting for Deal...</span>}
        </div>
      </div>

      <div className="table-area">
        
        {/* Dealer Area */}
        <div className="hand-section dealer-section">
          <h3>Dealer ({gameState.dealerScore})</h3>
          <div className="cards-container">
            {gameState.dealerHand.map((card, i) => (
              <Card key={i} card={card} hidden={card.hidden} />
            ))}
            {gameState.dealerHand.length === 0 && <div className="card-placeholder"></div>}
          </div>
          <div className="message-area">
            {gameState.dealerMessage && <div className="game-message">{gameState.dealerMessage}</div>}
          </div>
        </div>

        {/* Other Players Area (Row) */}
        <div className="other-players-row">
            {otherPlayers.map((p, i) => (
                <div key={p.id} className={`hand-section other-player ${gameState.players[gameState.turnIndex]?.id === p.id ? 'active-turn' : ''}`}>
                    <div className="player-name">Player {i + 2}</div>
                    <div className="cards-container small">
                        {p.hand.map((c, ci) => <Card key={ci} card={c} small />)}
                    </div>
                    <div className="player-stats">
                        Score: {p.score} | W: {p.totalWins.wins}
                    </div>
                </div>
            ))}
        </div>

        {/* My Player Area */}
        {myPlayer ? (
            <div className={`hand-section player-section ${isMyTurn() ? 'active-turn' : ''}`}>
              <h3>You ({myPlayer.score}) <span className="wins-badge">Wins: {myPlayer.totalWins.wins}</span></h3>
              <div className="cards-container">
                {myPlayer.hand.map((card, i) => (
                  <Card key={i} card={card} />
                ))}
              </div>
              {myPlayer.message && 
               (gameState.gameStatus === 'ended' || 
               (['Bust!', 'Blackjack!'].includes(myPlayer.message) && (myPlayer.score > 21 || myPlayer.score === 21))) && (
                <div className="player-message">{myPlayer.message}</div>
              )}
            </div>
        ) : (
            <div className="spectator-message">Spectating... (Wait for next hand)</div>
        )}

      </div>

      <div className="blackjack-controls">
        {gameState.gameStatus === 'playing' && isMyTurn() && (
          <>
            <button className="action-btn hit" onClick={hit}>Hit</button>
            <button className="action-btn stand" onClick={stand}>Stand</button>
          </>
        )}
        
        {gameState.gameStatus !== 'playing' && gameState.gameStatus !== 'waiting' && (
           <button className="action-btn deal" onClick={deal}>New Deal</button>
        )}

        {gameState.gameStatus === 'waiting' && (
           <button className="action-btn deal" onClick={deal}>Start Game</button>
        )}

        <button className="action-btn exit" onClick={() => {
            setGameMode('menu');
            if (gameMode === 'online') window.location.reload(); 
        }}>Exit</button>
      </div>
    </div>
  );
};

const Card = ({ card, hidden, small }) => {
  if (hidden) {
    return <div className={`card back ${small ? 'small' : ''}`}></div>;
  }
  const isRed = ['♥', '♦'].includes(card.suit);
  return (
    <div className={`card ${isRed ? 'red' : 'black'} ${small ? 'small' : ''}`}>
      <div className="card-corner top-left">{card.value}{card.suit}</div>
      <div className="card-center">{card.suit}</div>
      <div className="card-corner bottom-right">{card.value}{card.suit}</div>
    </div>
  );
};

export default Blackjack;
