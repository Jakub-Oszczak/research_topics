import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

function EmailDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const userEmail = localStorage.getItem('userEmail');
  const userPassword = localStorage.getItem('userPassword');

  if (!email) {
    navigate('/inbox');
    return null;
  }

  const handleDelete = async () => {
    try {
      await axios.delete(`/emails/${email.id}`, {
        headers: {
          email: userEmail,
          password: userPassword,
        },
      });
      navigate('/inbox');
    } catch (error) {
      console.error('Error deleting email:', error);
    }
  };

  return (
    <div className="email-detail-container">
      <button onClick={() => navigate('/inbox')}>Back to Inbox</button>
      <button onClick={handleDelete} className="delete-button">Delete Email</button>
      <h2>Email from {email.sender_email}</h2>
      <p><strong>To:</strong> {email.receiver_email}</p>
      <div className="email-content">
        <p>{email.text}</p>
      </div>
    </div>
  );
}

export default EmailDetail;