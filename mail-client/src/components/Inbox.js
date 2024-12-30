import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EmailItem from './EmailItem';
import { useNavigate } from 'react-router-dom';

function Inbox() {
  const [emails, setEmails] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const emailsPerPage = 10;
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('userEmail');
  const userPassword = localStorage.getItem('userPassword');

  useEffect(() => {
    if (!userEmail || !userPassword) {
      navigate('/');
    } else {
      fetchEmails();
    }
  }, []);

  const fetchEmails = async () => {
    try {
      const response = await axios.get('/emails', {
        headers: {
          email: userEmail,
          password: userPassword,
        },
      });
      const sortedEmails = response.data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setEmails(sortedEmails);
    } catch (error) {
      console.error('Error fetching emails:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userPassword');
    navigate('/');
  };

  const indexOfLastEmail = currentPage * emailsPerPage;
  const indexOfFirstEmail = indexOfLastEmail - emailsPerPage;
  const currentEmails = emails.slice(indexOfFirstEmail, indexOfLastEmail);

  const nextPage = () => {
    if (currentPage < Math.ceil(emails.length / emailsPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleRefresh = () => {
    fetchEmails();
  };

  return (
    <div className="inbox-container">
      <header className="inbox-header">
        <h2>Inbox</h2>
        <div className="inbox-actions">
          <button onClick={handleRefresh} className="refresh-button">
            Refresh
          </button>
          <button onClick={() => navigate('/compose')} className="compose-button">
            Compose
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>
      <p className="email-count">
        You have {emails.length} {emails.length === 1 ? 'email' : 'emails'}
      </p>
      <div className="email-list">
        {currentEmails.length > 0 ? (
          currentEmails.map((email) => (
            <EmailItem key={email.id} email={email} />
          ))
        ) : (
          <p className="no-emails">Your inbox is empty.</p>
        )}
      </div>
      <div className="pagination">
        <button onClick={prevPage} disabled={currentPage === 1} className="prev-button">
          Previous
        </button>
        <span className="page-info">Page {currentPage} of {Math.ceil(emails.length / emailsPerPage)}</span>
        <button onClick={nextPage} disabled={currentPage === Math.ceil(emails.length / emailsPerPage)} className="next-button">
          Next
        </button>
      </div>
    </div>
  );
}

export default Inbox;
