import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Compose() {
  const [receiverEmail, setReceiverEmail] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const senderEmail = localStorage.getItem('userEmail');
  const userPassword = localStorage.getItem('userPassword');

  const handleSend = async (e) => {
    e.preventDefault();

    if (receiverEmail === senderEmail) {
      setError("You cannot send an email to yourself.");
      return;
    }

    try {
      await axios.post(
        'https://rtic-auth-server-515227421561.europe-west4.run.app/emails',
        {
          text: text,
          sender_email: senderEmail,
          receiver_email: receiverEmail,
        },
        {
          headers: {
            email: senderEmail,
            password: userPassword,
          },
        }
      );
      navigate('/inbox');
    } catch (error) {
      console.error('Error sending email:', error);
    }
  };

  return (
    <div className="compose-container">
      <h2>Compose Email</h2>
      <form onSubmit={handleSend}>
        <input
          type="email"
          placeholder="To"
          value={receiverEmail}
          onChange={(e) => setReceiverEmail(e.target.value)}
          required
        />
        <textarea
          placeholder="Write your message here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        ></textarea>
        <button type="submit">Send</button>
        <button type="button" onClick={() => navigate('/inbox')}>
          Cancel
        </button>
      </form>
      {error && <p className="error-message" style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default Compose;
