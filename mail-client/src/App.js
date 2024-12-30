// App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import Inbox from './components/Inbox';
import Compose from './components/Compose';
import EmailDetail from './components/EmailDetail';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/compose" element={<Compose />} />
        <Route path="/email" element={<EmailDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
