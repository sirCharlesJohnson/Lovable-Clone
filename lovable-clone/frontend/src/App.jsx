import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import TodoList from './TodoList';
import Counter from './Counter';
import TicTacToe from './TicTacToe';
import Connect4 from './Connect4';

// Navigation component
const Navigation = () => {
  const location = useLocation();
  
  const navStyle = {
    backgroundColor: '#f8f9fa',
    padding: '15px 20px',
    marginBottom: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };
  
  const linkStyle = {
    margin: '0 15px',
    padding: '8px 16px',
    textDecoration: 'none',
    color: '#333',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '2px solid #ddd',
    fontWeight: '500',
    transition: 'all 0.2s',
    display: 'inline-block'
  };
  
  const activeLinkStyle = {
    ...linkStyle,
    backgroundColor: '#4CAF50',
    color: 'white',
    borderColor: '#4CAF50'
  };
  
  return (
    <nav style={navStyle}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <Link to="/" style={location.pathname === '/' ? activeLinkStyle : linkStyle}>
          Home
        </Link>
        <Link to="/TodoList" style={location.pathname === '/TodoList' ? activeLinkStyle : linkStyle}>
          Todo List
        </Link>
        <Link to="/Counter" style={location.pathname === '/Counter' ? activeLinkStyle : linkStyle}>
          Counter
        </Link>
        <Link to="/TicTacToe" style={location.pathname === '/TicTacToe' ? activeLinkStyle : linkStyle}>
          Tic Tac Toe
        </Link>
        <Link to="/Connect4" style={location.pathname === '/Connect4' ? activeLinkStyle : linkStyle}>
          Connect 4
        </Link>
      </div>
    </nav>
  );
};

// Home page component
const Home = () => {
  const cardStyle = {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px',
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
    transition: 'transform 0.2s, box-shadow 0.2s'
  };
  
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center', color: '#333', marginBottom: '30px' }}>
        React Components Preview
      </h1>
      <p style={{ textAlign: 'center', color: '#666', marginBottom: '40px', fontSize: '18px' }}>
        Welcome! Choose a component to explore:
      </p>
      
      <Link to="/TodoList" style={cardStyle} onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      }} onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      }}>
        <h2 style={{ color: '#4CAF50', marginTop: 0 }}>📝 Todo List</h2>
        <p style={{ color: '#666' }}>Manage your tasks with a persistent todo list that saves automatically.</p>
      </Link>
      
      <Link to="/Counter" style={cardStyle} onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      }} onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      }}>
        <h2 style={{ color: '#2196F3', marginTop: 0 }}>🔢 Counter</h2>
        <p style={{ color: '#666' }}>A simple counter component with increment, decrement, and reset functionality.</p>
      </Link>
      
      <Link to="/TicTacToe" style={cardStyle} onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      }} onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      }}>
        <h2 style={{ color: '#E91E63', marginTop: 0 }}>⭕ Tic Tac Toe - Multiplayer</h2>
        <p style={{ color: '#666' }}>Play Tic Tac Toe with friends! Create or join rooms to play together in real-time.</p>
      </Link>
      
      <Link to="/Connect4" style={cardStyle} onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      }} onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
      }}>
        <h2 style={{ color: '#1E88E5', marginTop: 0 }}>🔴 Connect 4 - Multiplayer</h2>
        <p style={{ color: '#666' }}>Play Connect 4 with friends! Drop pieces and get four in a row to win.</p>
      </Link>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/TodoList" element={
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
              <TodoList />
            </div>
          } />
          <Route path="/Counter" element={
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
              <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>Counter Component</h2>
              <Counter />
            </div>
          } />
          <Route path="/TicTacToe" element={
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
              <TicTacToe />
            </div>
          } />
          <Route path="/Connect4" element={
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
              <Connect4 />
            </div>
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
