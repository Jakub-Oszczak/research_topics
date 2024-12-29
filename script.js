/****************************************
 * Global Variables
 ****************************************/
let mitidUsername = "";            // Will store the MitID username
let registeredEmails = ["john@example.com", "jane@example.com"]; 
// For demonstration, we assume these emails are already registered
// If you want to start with none, set this array to []


/****************************************
 * Helper Functions
 ****************************************/
function showScreen(screenId) {
  // Hide all screens
  const screens = document.querySelectorAll(".screen");
  screens.forEach((screen) => {
    screen.classList.remove("active");
  });

  // Show the requested screen
  const activeScreen = document.getElementById(screenId);
  if (activeScreen) {
    activeScreen.classList.add("active");
  }
}

function validateEmail(email) {
  // Basic regex for demonstration
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
}

/****************************************
 * Step 1: MitID Login Screen
 ****************************************/
const loginButton = document.getElementById("login-button");
loginButton.addEventListener("click", () => {
  const usernameInput = document.getElementById("mitid-username");
  const usernameValue = usernameInput.value.trim();

  if (!usernameValue) {
    alert("MitID username cannot be empty.");
    return;
  }

  // Store the MitID username in our global variable
  mitidUsername = usernameValue;

  // Proceed to show the QR code screen
  showScreen("qr-code-screen");

  // After 2 seconds, move to the next step (email selection screen or registration)
  setTimeout(() => {
    // If no emails are registered for this user, go directly to registration
    if (registeredEmails.length === 0) {
      showScreen("registration-screen");
    } else {
      showScreen("email-selection-screen");
      populateEmailList();
    }
  }, 2000);
});

/****************************************
 * Step 2: QR Code Screen
 ****************************************/
// We automatically transition from the QR code screen after 2 seconds 
// (handled in the loginButton event listener)

/****************************************
 * Step 3: Email Selection Screen
 ****************************************/
function populateEmailList() {
  const emailListDiv = document.getElementById("email-list");
  emailListDiv.innerHTML = ""; // Clear out existing content

  // Create a radio button for each registered email
  registeredEmails.forEach((email, index) => {
    const label = document.createElement("label");
    label.style.display = "block"; // each email on its own line

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "emailSelection";
    radio.value = email;
    radio.id = `email-${index}`;

    label.appendChild(radio);

    const labelText = document.createTextNode(" " + email);
    label.appendChild(labelText);

    emailListDiv.appendChild(label);
  });

  // Add a button to proceed
  const proceedButton = document.createElement("button");
  proceedButton.textContent = "Proceed";
  proceedButton.classList.add("btn-primary");
  proceedButton.style.marginTop = "15px";
  emailListDiv.appendChild(proceedButton);

  proceedButton.addEventListener("click", () => {
    // Find which radio is checked
    const selectedEmailRadio = document.querySelector('input[name="emailSelection"]:checked');

    if (!selectedEmailRadio) {
      alert("Please select an email or register a new one.");
      return;
    }

    // Display the user info
    showUserInfo(selectedEmailRadio.value);
  });
}

// Link to registration screen
document.getElementById("go-to-registration").addEventListener("click", (e) => {
  e.preventDefault(); // prevent actual navigation
  showScreen("registration-screen");
});

/****************************************
 * Step 4: User Info Screen
 ****************************************/
function showUserInfo(selectedEmail) {
  showScreen("user-info-screen");
  const userInfoDiv = document.getElementById("user-info");
  userInfoDiv.innerHTML = `
    <p><strong>MitID Username:</strong> ${mitidUsername}</p>
    <p><strong>Email:</strong> ${selectedEmail}</p>
  `;
}

const closeButton = document.getElementById("close-button");
closeButton.addEventListener("click", () => {
  alert("You have closed the popup. (In a real app, you might exit or do something else.)");
  // For demo, we’ll just reload the page
  window.location.reload();
});

/****************************************
 * Step 5: Registration Screen
 ****************************************/
const registerButton = document.getElementById("register-button");
registerButton.addEventListener("click", () => {
  const emailInput = document.getElementById("reg-email");
  const passwordInput = document.getElementById("reg-password");
  const purposeSelect = document.getElementById("reg-purpose");
  const accountTypeSelect = document.getElementById("reg-account-type");

  // Get the trimmed values
  const emailValue = emailInput.value.trim();
  const passwordValue = passwordInput.value.trim();
  const purposeValue = purposeSelect.value.trim();
  const accountTypeValue = accountTypeSelect.value.trim();

  // Basic validation
  if (!emailValue || !passwordValue || !purposeValue || !accountTypeValue) {
    alert("All fields must be filled out.");
    return;
  }

  // Validate email format
  if (!validateEmail(emailValue)) {
    alert("Invalid email format.");
    return;
  }

  // In a real app, you'd make an API call here to register the email
  // We'll just simulate by adding it to our array
  registeredEmails.push(emailValue);

  alert("Registration successful!");

  // Show the user info screen with the newly registered email
  showUserInfo(emailValue);
});
