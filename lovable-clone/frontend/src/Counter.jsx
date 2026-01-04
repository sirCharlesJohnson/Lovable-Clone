import React, { useState } from 'react';
import './Counter.css';

const Counter = () => {
  const [count, setCount] = useState(0);

  const increment = () => setCount(count + 1);
  const decrement = () => setCount(count - 1);
  const reset = () => setCount(0);

  return (
    <div className="counter-container">
      <div className="counter-card">
        <h1 className="counter-title">Counter App</h1>

        <div className="counter-display">
          <span className={`counter-value ${count > 0 ? 'positive' : count < 0 ? 'negative' : ''}`}>
            {count}
          </span>
        </div>

        <div className="button-group">
          <button
            className="counter-button decrement"
            onClick={decrement}
            aria-label="Decrement counter"
          >
            <span className="button-icon">−</span>
            Decrement
          </button>

          <button
            className="counter-button reset"
            onClick={reset}
            aria-label="Reset counter"
          >
            <span className="button-icon">↻</span>
            Reset
          </button>

          <button
            className="counter-button increment"
            onClick={increment}
            aria-label="Increment counter"
          >
            <span className="button-icon">+</span>
            Increment
          </button>
        </div>
      </div>
    </div>
  );
};

export default Counter;
