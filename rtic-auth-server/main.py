from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from google.cloud import firestore
from enum import Enum
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from passlib.context import CryptContext

# Initialize password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI()
db = firestore.Client()

# Specify the allowed origins
origins = [
    "http://localhost:3000",  # Local development
    "http://localhost:8080"  # Local development
    # Add other allowed origins here
]

# Add CORS middleware first
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,              # Specify allowed origins
    allow_credentials=True,             # Allow credentials (e.g., cookies, auth headers)
    allow_methods=["*"],                # Allow all HTTP methods
    allow_headers=["*"],                # Allow all headers
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
class Email(BaseModel):
    id: Optional[str] = None  # Added id field
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
    email: EmailStr  # Added email field
    account_type: AccountType
    email_purpose: EmailTag
    mitid_username: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str  # Added password field
    account_type: AccountType
    email_purpose: EmailTag
    mitid_username: str

# Authentication Dependency
async def get_current_user(email: str = Header(...), password: str = Header(...)):
    user_ref = db.collection('users').document(email)
    user_doc = user_ref.get()
    if not user_doc.exists:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user_data = user_doc.to_dict()
    stored_password_hash = user_data.get('password')
    if not stored_password_hash or not pwd_context.verify(password, stored_password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user_data['email'] = email  # Include email in user_data
    return user_data

# Endpoints

# GET /emails - get emails for the authenticated user
@app.get("/emails", response_model=List[Email])
async def get_emails(current_user: dict = Depends(get_current_user)):
    try:
        user_email = current_user['email']
        # Fetch emails where the user is either sender or receiver
        received_emails_ref = db.collection('emails').where('receiver_email', '==', user_email)
        sent_emails_ref = db.collection('emails').where('sender_email', '==', user_email)
        
        received_docs = received_emails_ref.stream()
        sent_docs = sent_emails_ref.stream()
        
        emails = []
        for doc in received_docs:
            email_data = doc.to_dict()
            email_data['id'] = doc.id  # Include the document ID
            email = Email(**email_data)
            emails.append(email)
        for doc in sent_docs:
            email_data = doc.to_dict()
            email_data['id'] = doc.id  # Include the document ID
            email = Email(**email_data)
            emails.append(email)
        return emails
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# POST /emails - send an email
@app.post("/emails")
async def send_email(email: EmailCreate, current_user: dict = Depends(get_current_user)):
    try:
        sender_email = current_user['email']
        if sender_email != email.sender_email:
            raise HTTPException(status_code=403, detail="You can only send emails from your own account")
        # Fetch sender's user data
        user_data = current_user
        email_tag = user_data['email_purpose']
        mitid_username = user_data['mitid_username']

        email_data = {
            'sender_email': email.sender_email,
            'receiver_email': email.receiver_email,
            'email_tag': email_tag,
            'mitid_username': mitid_username,
            'text': email.text,
        }
        db.collection('emails').add(email_data)
        return {"message": "Email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# DELETE /emails/{email_id} - delete an email
@app.delete("/emails/{email_id}")
async def delete_email(email_id: str, current_user: dict = Depends(get_current_user)):
    try:
        email_ref = db.collection('emails').document(email_id)
        email_doc = email_ref.get()
        if not email_doc.exists:
            raise HTTPException(status_code=404, detail="Email not found")
        email_data = email_doc.to_dict()
        user_email = current_user['email']
        # Check if the user is either the sender or receiver
        if email_data['sender_email'] != user_email and email_data['receiver_email'] != user_email:
            raise HTTPException(status_code=403, detail="You do not have permission to delete this email")
        email_ref.delete()
        return {"message": "Email deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# POST /users - add a user
@app.post("/users")
async def create_user(user: UserCreate):
    try:
        # Check if user already exists
        user_ref = db.collection('users').document(user.email)
        user_doc = user_ref.get()
        if user_doc.exists:
            raise HTTPException(status_code=400, detail="User already exists")
        hashed_password = pwd_context.hash(user.password)
        user_data = {
            'account_type': user.account_type.value,
            'email_purpose': user.email_purpose.value,
            'mitid_username': user.mitid_username,
            'password': hashed_password,
        }
        db.collection('users').document(user.email).set(user_data)
        return {"message": "User created successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# GET /users - get the authenticated user's info
@app.get("/users", response_model=User)
async def get_user(current_user: dict = Depends(get_current_user)):
    try:
        user_data = current_user
        user = User(**user_data)
        return user
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# DELETE /users - delete the authenticated user
@app.delete("/users")
async def delete_user(current_user: dict = Depends(get_current_user)):
    try:
        user_email = current_user['email']
        user_ref = db.collection('users').document(user_email)
        user_ref.delete()
        return {"message": "User deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)
