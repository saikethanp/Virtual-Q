from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from passlib.context import CryptContext
import uuid

# --- DATABASE SETUP ---
SQLALCHEMY_DATABASE_URL = "sqlite:///./queueflow.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class BusinessOwner(Base):
    __tablename__ = "business_owners"
    id = Column(String, primary_key=True, index=True)
    owner_name = Column(String)
    business_name = Column(String)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    password_hash = Column(String)
    category = Column(String)
    location = Column(String)
    address = Column(String)

Base.metadata.create_all(bind=engine)

# --- APP & SECURITY ---
app = FastAPI(title="QueueFlow Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- SCHEMAS ---
class BusinessRegisterSchema(BaseModel):
    ownerName: str
    email: EmailStr
    phone: str
    password: str
    category: str
    location: str

# --- ROUTES ---
@app.post("/api/auth/register")
def register_business(data: BusinessRegisterSchema, db: Session = Depends(get_db)):
    # Check if email exists
    existing = db.query(BusinessOwner).filter(BusinessOwner.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    owner_id = str(uuid.uuid4())
    hashed_password = get_password_hash(data.password)
    
    new_owner = BusinessOwner(
        id=owner_id,
        owner_name=data.ownerName,
        email=data.email,
        phone=data.phone,
        password_hash=hashed_password,
        category=data.category,
        location=data.location
    )
    
    db.add(new_owner)
    db.commit()
    db.refresh(new_owner)
    
    # In a real app we'd return a JWT here. Mocking access_token for now.
    return {"message": "Registration successful", "access_token": "mock_jwt_token_" + owner_id}

@app.get("/")
def read_root():
    return {"status": "QueueFlow Backend Running"}
