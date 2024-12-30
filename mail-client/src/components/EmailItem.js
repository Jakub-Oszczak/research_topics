// components/EmailItem.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

function EmailItem({ email }) {
  const navigate = useNavigate();
  const previewText =
    email.text.length > 100 ? email.text.substring(0, 100) + '...' : email.text;

  const openEmail = () => {
    navigate('/email', { state: { email } });
  };

  return (
    <div className="email-item" onClick={openEmail}>
      <div className="email-tag">
        <span>{email.email_tag}</span>
      </div>
      <div className="email-sender">
        <strong>{email.sender_email}</strong>
      </div>
      <div className="email-preview">
        <p>{previewText}</p>
      </div>
    </div>
  );
}

export default EmailItem;
