/****************************************
 * BASE URL FOR THE API
 ****************************************/
const BASE_URL = "https://rtic-auth-server-542824830062.europe-west4.run.app";

/****************************************
 * DOM ELEMENTS
 ****************************************/
const viewMitid           = document.getElementById('view-mitid');
const viewQr              = document.getElementById('view-qr');
const viewEmailSelection  = document.getElementById('view-email-selection');
const viewRegistration    = document.getElementById('view-registration');
const viewUserInfo        = document.getElementById('view-user-info');

const mitidUsernameInput  = document.getElementById('mitid-username');
const errorMitid          = document.getElementById('error-mitid');
const btnMitidLogin       = document.getElementById('btn-mitid-login');

const emailSelect         = document.getElementById('email-select');
const errorEmailSelect    = document.getElementById('error-email-select');
const btnSelectEmail      = document.getElementById('btn-select-email');
const linkRegisterEmail   = document.getElementById('link-register-email');

const regEmailInput       = document.getElementById('reg-email');
const regPasswordInput    = document.getElementById('reg-password');
const regPurposeSelect    = document.getElementById('reg-purpose');
const regAccountType      = document.getElementById('reg-account-type');
const btnRegister         = document.getElementById('btn-register');
const errorRegistration   = document.getElementById('error-registration');

const displayUserInfo     = document.getElementById('display-user-info');

// Optionally, if you want an error on the QR view as well
const errorQr             = document.getElementById('error-qr');

/****************************************
 * GLOBAL VARIABLES
 ****************************************/
let globalMitIdUsername = "";

/****************************************
 * VIEW SWITCH HELPER
 ****************************************/
function switchView(viewElement) {
  [viewMitid, viewQr, viewEmailSelection, viewRegistration, viewUserInfo].forEach(v => {
    v.classList.remove('active-view');
  });
  viewElement.classList.add('active-view');
}

/****************************************
 * EVENT LISTENERS
 ****************************************/

// 1) MitID "Log In" Button
btnMitidLogin.addEventListener('click', async () => {
  const mitidValue = mitidUsernameInput.value.trim();

  if (!mitidValue) {
    errorMitid.textContent = "MitID username cannot be empty.";
    return;
  }
  errorMitid.textContent = "";
  globalMitIdUsername = mitidValue;

  // Move to QR code screen
  switchView(viewQr);

  // Show QR code for 2 seconds, then check if user already has emails
  setTimeout(() => {
    checkExistingEmails(globalMitIdUsername);
  }, 2000);
});

// 2) Handle Email Selection “Proceed”
btnSelectEmail.addEventListener('click', async () => {
  const selectedEmail = emailSelect.value;

  if (!selectedEmail) {
    errorEmailSelect.textContent = "Please select an email, or register a new one.";
    return;
  }
  errorEmailSelect.textContent = "";

  // In real usage, you might require a password to retrieve user info. 
  // For demonstration, let's just do a quick fetch to /people/<mitid> again.
  try {
    const userInfo = await fetchUserInfo(selectedEmail);
    showUserInfo(userInfo);
  } catch (e) {
    errorEmailSelect.textContent = e.message; // Display the detailed error
    console.error("fetchUserInfo error:", e);
  }
});

// 3) "Register a new email" link
linkRegisterEmail.addEventListener('click', (e) => {
  e.preventDefault();
  switchView(viewRegistration);
});

// 4) Register Button
btnRegister.addEventListener('click', async () => {
  const newEmail    = regEmailInput.value.trim();
  const newPassword = regPasswordInput.value.trim();
  const newPurpose  = regPurposeSelect.value;
  const newAccType  = regAccountType.value;

  if (!newEmail || !newPassword) {
    errorRegistration.textContent = "Email and password cannot be empty.";
    return;
  }
  if (!isValidEmail(newEmail)) {
    errorRegistration.textContent = "Please enter a valid email.";
    return;
  }

  errorRegistration.textContent = "";

  try {
    // POST /users to create a new user
    await createUser({
      mitid_username: globalMitIdUsername,
      email: newEmail,
      password: newPassword,
      account_type: newAccType,
      email_purpose: newPurpose
    });

    // After user is created, fetch user info to display
    const userInfo = {
      mitid_username: globalMitIdUsername,
      email: newEmail,
      account_type: newAccType,
      email_purpose: newPurpose
    };
    showUserInfo(userInfo);

  } catch (err) {
    console.error("createUser error:", err);
    // Display the error details in the registration view
    errorRegistration.textContent = err.message;
  }
});

/****************************************
 * API CALLS
 ****************************************/

/**
 * Check existing emails by GET /people/{mitid_username}
 */
async function checkExistingEmails(mitidUsername) {
  try {
    // Clear any leftover error from QR view
    if (errorQr) errorQr.textContent = "";

    const resp = await fetch(`${BASE_URL}/people/${encodeURIComponent(mitidUsername)}`, {
      method: 'GET'
    });

    // If not found => person doc doesn't exist => go to registration
    if (resp.status === 404) {
      switchView(viewRegistration);
      return;
    }

    const data = await resp.json();

    if (!resp.ok) {
      // If the fetch was NOT ok, parse the error
      const errMsg = parseErrorResponse(resp, data);
      if (errorQr) errorQr.textContent = errMsg;
      // Switch to registration if the user doc doesn't exist
      switchView(viewRegistration);
      return;
    }
    
    // data => { mitid_username: "...", user_emails: ["...", ...] }
    if (!data.user_emails || data.user_emails.length === 0) {
      switchView(viewRegistration);
    } else {
      populateEmailSelect(data.user_emails);
      switchView(viewEmailSelection);
    }
  } catch (err) {
    console.error("Error fetching person data:", err);
    if (errorQr) {
      errorQr.textContent = "Error fetching data: " + err.message;
    }
    // Fallback: switch to registration
    switchView(viewRegistration);
  }
}

/**
 * Create new user by POST /users
 */
async function createUser(payload) {
  const resp = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await resp.json();
  
  if (!resp.ok) {
    // Attempt to parse error from data
    const errMsg = parseErrorResponse(resp, data);
    throw new Error(errMsg);
  }

  return data; 
}

/**
 * Fetch user info. For demonstration, we’ll do GET /people/<mitid>,
 * and cross-reference the selected email.
 */
async function fetchUserInfo(selectedEmail) {
  const resp = await fetch(`${BASE_URL}/people/${encodeURIComponent(globalMitIdUsername)}`, {
    method: 'GET'
  });

  const data = await resp.json();
  
  if (!resp.ok) {
    const errMsg = parseErrorResponse(resp, data);
    throw new Error(errMsg);
  }

  // data => { mitid_username: "...", user_emails: [...] }
  // We'll just build something that looks like user info from that:
  return {
    mitid_username: data.mitid_username,
    email: selectedEmail,
    account_type: "personal",   // dummy
    email_purpose: "standard"   // dummy
  };
}

/****************************************
 * UTILS
 ****************************************/

/**
 * Quick email format check
 */
function isValidEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * Populate <select> with the array of emails.
 */
function populateEmailSelect(emailArray) {
  emailSelect.innerHTML = "";
  
  const defaultOption = document.createElement('option');
  defaultOption.value = "";
  defaultOption.textContent = "Select an email";
  emailSelect.appendChild(defaultOption);

  emailArray.forEach(email => {
    const option = document.createElement('option');
    option.value = email;
    option.textContent = email;
    emailSelect.appendChild(option);
  });
}

/**
 * Show user info in final screen
 */
function showUserInfo(user) {
  displayUserInfo.innerHTML = `
    <p><strong>MitID Username:</strong> ${user.mitid_username}</p>
    <p><strong>Email:</strong> ${user.email}</p>
    <p><strong>Account Type:</strong> ${user.account_type}</p>
    <p><strong>Email Purpose:</strong> ${user.email_purpose}</p>
  `;
  switchView(viewUserInfo);
}

/**
 * Parse detailed error messages from response JSON.
 * For instance, a 422 might look like:
 * {
 *   "detail": [
 *     { "loc": [...], "msg": "some error", "type": "value_error" }
 *   ]
 * }
 * We'll gather all messages into one string for display.
 */
function parseErrorResponse(resp, data) {
  let errorMsg = `Error ${resp.status} (${resp.statusText})`;

  // If there's a "detail" array in the JSON, parse it
  if (data && Array.isArray(data.detail)) {
    const details = data.detail.map(item => item.msg).join("; ");
    errorMsg += `: ${details}`;
  } 
  // Or maybe there's a top-level "detail" string
  else if (data && typeof data.detail === "string") {
    errorMsg += `: ${data.detail}`;
  }
  // Or some other structure
  else if (data && data.error) {
    errorMsg += `: ${data.error}`;
  }
  // Or just a "message" field
  else if (data && data.message) {
    errorMsg += `: ${data.message}`;
  }

  return errorMsg;
}
