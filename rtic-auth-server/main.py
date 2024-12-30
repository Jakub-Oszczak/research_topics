from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict
from enum import Enum
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext

import os
import json
import uuid

# --------------- JSON File Paths ---------------
DATA_DIR = "data"
PERSONS_FILE = os.path.join(DATA_DIR, "persons.json")
USERS_FILE = os.path.join(DATA_DIR, "users.json")
EMAILS_FILE = os.path.join(DATA_DIR, "emails.json")

# --------------- In-Memory Data ---------------
persons_data: Dict[str, dict] = {}
users_data: Dict[str, dict] = {}
emails_data: Dict[str, dict] = {}

# Initialize password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --------------- Load Data at Startup ---------------
def load_data():
    global persons_data, users_data, emails_data

    # Create data folder if not exists
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

    # Load persons
    if os.path.isfile(PERSONS_FILE):
        with open(PERSONS_FILE, "r", encoding="utf-8") as f:
            persons_data = json.load(f)
    else:
        persons_data = {}

    # Load users
    if os.path.isfile(USERS_FILE):
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            users_data = json.load(f)
    else:
        users_data = {}

    # Load emails
    if os.path.isfile(EMAILS_FILE):
        with open(EMAILS_FILE, "r", encoding="utf-8") as f:
            emails_data = json.load(f)
    else:
        emails_data = {}

# --------------- Save Data to JSON ---------------
def save_data():
    with open(PERSONS_FILE, "w", encoding="utf-8") as f:
        json.dump(persons_data, f, indent=2)
    with open(USERS_FILE, "w", encoding="utf-8") as f:
        json.dump(users_data, f, indent=2)
    with open(EMAILS_FILE, "w", encoding="utf-8") as f:
        json.dump(emails_data, f, indent=2)

# --------------- FastAPI Initialization ---------------
app = FastAPI()

@app.on_event("startup")
def on_startup():
    load_data()

# Specify the allowed origins
origins = [
    "http://localhost:3000",  # Local development
    "http://localhost:8080",
    "http://localhost:8000"   # Local development
    # Add other allowed origins here
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Enums
class AccountType(str, Enum):
    COMPANY = "company"
    PERSONAL = "personal"

class EmailTag(str, Enum):
    MARKETING = "marketing"
    STANDARD = "standard"
    NOTIFICATIONS = "notifications"
    NEWSLETTER = "newsletter"

# Pydantic Models
class Person(BaseModel):
    mitid_username: str
    user_emails: List[EmailStr] = []

class PersonCreate(BaseModel):
    mitid_username: str
    user_emails: Optional[List[EmailStr]] = None

class Email(BaseModel):
    id: Optional[str] = None
    sender_email: EmailStr
    receiver_email: EmailStr
    email_tag: EmailTag
    mitid_username: str
    text: str

class EmailCreate(BaseModel):
    text: str
    sender_email: EmailStr
    receiver_email: EmailStr

class User(BaseModel):
    email: EmailStr
    account_type: AccountType
    email_purpose: EmailTag
    mitid_username: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    account_type: AccountType
    email_purpose: EmailTag
    mitid_username: str

# --------------- Authentication Dependency ---------------
async def get_current_user(email: str = Header(...), password: str = Header(...)):
    user_doc = users_data.get(email)
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    stored_password_hash = user_doc.get('password')
    if not stored_password_hash or not pwd_context.verify(password, stored_password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Return user data as a dict
    return {
        "email": email,
        "account_type": user_doc["account_type"],
        "email_purpose": user_doc["email_purpose"],
        "mitid_username": user_doc["mitid_username"],
        "password": user_doc["password"]
    }

# --------------- Person Endpoints ---------------
@app.post("/people")
async def create_person(person: PersonCreate):
    """
    Create or update a Person document. 
    If the person's MitID document exists, update user_emails.
    Otherwise create a new person record.
    """
    try:
        mitid_username = person.mitid_username
        if mitid_username in persons_data:
            # Update existing
            existing_data = persons_data[mitid_username]
            existing_emails = existing_data.get("user_emails", [])
            if person.user_emails:
                for email in person.user_emails:
                    if email not in existing_emails:
                        existing_emails.append(email)
            persons_data[mitid_username]["user_emails"] = existing_emails
            save_data()
            return {"message": "Person updated successfully"}
        else:
            # Create new
            user_emails = person.user_emails if person.user_emails else []
            new_person_data = {
                "mitid_username": mitid_username,
                "user_emails": user_emails
            }
            persons_data[mitid_username] = new_person_data
            save_data()
            return {"message": "Person created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/people/{mitid_username}", response_model=Person)
async def get_person(mitid_username: str):
    """
    Get a Person document by MitID username.
    """
    try:
        if mitid_username not in persons_data:
            raise HTTPException(status_code=404, detail="Person not found")
        return Person(**persons_data[mitid_username])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/people/{mitid_username}/emails", response_model=List[Email])
async def get_emails_by_mitid(mitid_username: str):
    """
    Retrieve all emails (sent or received) for a specific MitID username.
    """
    try:
        # Filter emails_data where "mitid_username" == given mitid_username
        results = []
        for email_id, email_doc in emails_data.items():
            if email_doc["mitid_username"] == mitid_username:
                results.append(Email(**email_doc))
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --------------- Email Endpoints ---------------
@app.get("/emails", response_model=List[Email])
async def get_emails(current_user: dict = Depends(get_current_user)):
    """
    Get all emails where the authenticated user is either sender or receiver.
    """
    try:
        user_email = current_user["email"]
        # Filter in emails_data
        results = []
        for email_id, email_doc in emails_data.items():
            if (email_doc["sender_email"] == user_email) or (email_doc["receiver_email"] == user_email):
                results.append(Email(**email_doc))
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/emails")
async def send_email(email: EmailCreate, current_user: dict = Depends(get_current_user)):
    """
    Send an email from the authenticated user's email address.
    """
    try:
        sender_email = current_user["email"]
        if sender_email != email.sender_email:
            raise HTTPException(
                status_code=403,
                detail="You can only send emails from your own account"
            )
        email_tag = current_user["email_purpose"]
        mitid_username = current_user["mitid_username"]

        # Generate a new UUID for this email
        new_id = str(uuid.uuid4())
        email_data = {
            "id": new_id,
            "sender_email": email.sender_email,
            "receiver_email": email.receiver_email,
            "email_tag": email_tag,
            "mitid_username": mitid_username,
            "text": email.text
        }
        emails_data[new_id] = email_data
        save_data()
        return {"message": "Email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/emails/{email_id}")
async def delete_email(email_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete an email if the authenticated user is either the sender or receiver.
    """
    try:
        if email_id not in emails_data:
            raise HTTPException(status_code=404, detail="Email not found")

        email_doc = emails_data[email_id]
        user_email = current_user["email"]
        if email_doc["sender_email"] != user_email and email_doc["receiver_email"] != user_email:
            raise HTTPException(status_code=403, detail="You do not have permission to delete this email")

        del emails_data[email_id]
        save_data()
        return {"message": "Email deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --------------- User Endpoints ---------------
@app.post("/users")
async def create_user(user: UserCreate):
    """
    Create a user account (an email-based account under a single MitID username). 
    Also ensure the corresponding Person document is updated with this email.
    """
    try:
        if user.email in users_data:
            raise HTTPException(status_code=400, detail="User already exists")

        # Hash the password
        hashed_password = pwd_context.hash(user.password)

        user_data = {
            "account_type": user.account_type.value,
            "email_purpose": user.email_purpose.value,
            "mitid_username": user.mitid_username,
            "password": hashed_password
        }
        users_data[user.email] = user_data

        # Update or create the corresponding Person
        if user.mitid_username in persons_data:
            existing_emails = persons_data[user.mitid_username]["user_emails"]
            if user.email not in existing_emails:
                existing_emails.append(user.email)
            persons_data[user.mitid_username]["user_emails"] = existing_emails
        else:
            # Create a new Person if not existing
            persons_data[user.mitid_username] = {
                "mitid_username": user.mitid_username,
                "user_emails": [user.email]
            }

        save_data()
        return {"message": "User created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/users", response_model=User)
async def get_user(current_user: dict = Depends(get_current_user)):
    """
    Get the authenticated user's info.
    """
    try:
        return User(
            email=current_user["email"],
            account_type=current_user["account_type"],
            email_purpose=current_user["email_purpose"],
            mitid_username=current_user["mitid_username"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/users")
async def delete_user(current_user: dict = Depends(get_current_user)):
    """
    Delete the authenticated user.
    """
    try:
        user_email = current_user["email"]
        if user_email in users_data:
            del users_data[user_email]
        else:
            raise HTTPException(status_code=404, detail="User not found")
        
        save_data()
        return {"message": "User deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --------------- Run the app ---------------
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
