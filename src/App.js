import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CustomerDashboard from './components/CustomerDashboard';
import DriverDashboard from './components/DriverDashboard';
import Chatbot from './components/Chatbot';
import './App.css';

function App() {
  const [showChatbot, setShowChatbot] = useState(false);

  return (
    <Router>
      <div className="App">
        <nav className="navbar">
          <div className="nav-content">
            <Link to="/" className="logo">
              <h1 className="gradient-text">RideQ</h1>
              <span className="tagline">15% Cheaper Than Uber & Lyft</span>
            </Link>
            <div className="nav-links">
              <Link to="/" className="nav-link">Customer</Link>
              <Link to="/driver" className="nav-link">Driver</Link>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<CustomerDashboard />} />
          <Route path="/driver" element={<DriverDashboard />} />
        </Routes>

        {/* AI Chatbot */}
        <button 
          className="chatbot-button" 
          onClick={() => setShowChatbot(!showChatbot)}
          aria-label="Open customer service chat"
        >
          💬
        </button>

        {showChatbot && (
          <Chatbot onClose={() => setShowChatbot(false)} />
        )}
      </div>
    </Router>
  );
}

export default App;
