import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import TodoList from './TodoList';
import Counter from './Counter';
import TicTacToe from './TicTacToe';
import ConnectFour from './ConnectFour';
import Blackjack from './Blackjack';
import './App.css';

const Navbar = () => {
  const location = useLocation();
  
  return (
    <nav className="navbar">
      <div className="nav-content">
        <Link to="/" className="nav-logo">🚀 Lovable Clone</Link>
        <div className="nav-links">
          <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Home</Link>
          <Link to="/TodoList" className={`nav-link ${location.pathname === '/TodoList' ? 'active' : ''}`}>Todo</Link>
          <Link to="/Counter" className={`nav-link ${location.pathname === '/Counter' ? 'active' : ''}`}>Counter</Link>
          <Link to="/TicTacToe" className={`nav-link ${location.pathname === '/TicTacToe' ? 'active' : ''}`}>Tic Tac Toe</Link>
          <Link to="/Connect4" className={`nav-link ${location.pathname === '/Connect4' ? 'active' : ''}`}>Connect 4</Link>
          <Link to="/Blackjack" className={`nav-link ${location.pathname === '/Blackjack' ? 'active' : ''}`}>Blackjack</Link>
        </div>
      </div>
    </nav>
  );
};

const Home = () => (
  <div className="home-container">
    <h1 className="home-title">Welcome to Your App Collection</h1>
    <p className="home-subtitle">Choose an app to get started</p>
    
    <div className="app-grid">
      <Link to="/TodoList" className="app-card">
        <div className="app-icon">📝</div>
        <h3>Todo List</h3>
        <p>Manage your daily tasks efficiently.</p>
      </Link>
      
      <Link to="/Counter" className="app-card">
        <div className="app-icon">🔢</div>
        <h3>Counter</h3>
        <p>Simple counter with increment/decrement.</p>
      </Link>
      
      <Link to="/TicTacToe" className="app-card">
        <div className="app-icon">❌</div>
        <h3>Tic Tac Toe</h3>
        <p>Classic game with multiplayer support.</p>
      </Link>
      
      <Link to="/Connect4" className="app-card">
        <div className="app-icon">🔴</div>
        <h3>Connect 4</h3>
        <p>Connect four in a row to win!</p>
      </Link>

      <Link to="/Blackjack" className="app-card">
        <div className="app-icon">♠️</div>
        <h3>Blackjack</h3>
        <p>Play against the dealer with others!</p>
      </Link>
    </div>
  </div>
);

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/TodoList" element={
            <div className="page-container">
              <h2 className="page-title">Todo List</h2>
              <TodoList />
            </div>
          } />
          <Route path="/Counter" element={
            <div className="page-container">
              <h2 className="page-title">Counter</h2>
              <Counter />
            </div>
          } />
          <Route path="/TicTacToe" element={
            <div className="page-container">
              <h2 className="page-title">Tic Tac Toe</h2>
              <TicTacToe />
            </div>
          } />
          <Route path="/Connect4" element={
            <div className="page-container">
              <h2 className="page-title">Connect 4</h2>
              <ConnectFour />
            </div>
          } />
          <Route path="/Blackjack" element={
            <div className="page-container">
              <h2 className="page-title">Blackjack</h2>
              <Blackjack />
            </div>
          } />
        </Routes>
      </main>
    </div>
  );
}

export default App;
