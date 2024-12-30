import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.get('/users', {
        headers: {
          email: email,
          password: password,
        },
      });

      if (response.status === 200) {
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userPassword', password);
        navigate('/inbox');
      }
    } catch (error) {
      setError('Invalid email or password');
    }
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  const handleMitIDLogin = () => {
    navigate('/mitid-login');
  };

  return (
    <div className="login-container">
      <h2>Mail Client Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="login-button">Login</button>
      </form>
      <button onClick={handleMitIDLogin} className="mitid-login-button">
        Log in with MitID
      </button>
      <button onClick={handleForgotPassword} className="forgot-password-button">
        I forgot my password
      </button>
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default Login;