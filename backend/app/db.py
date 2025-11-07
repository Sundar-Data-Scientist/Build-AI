import os
from typing import Generator
from urllib.parse import quote_plus

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session

load_dotenv()

DB_NAME = os.getenv("DB_NAME", "postgres")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Sundar@1506")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

DATABASE_URL = (
    f"postgresql+psycopg2://{DB_USER}:{quote_plus(DB_PASSWORD)}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

class Base(DeclarativeBase):
    pass

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



def ensure_uploaded_files_schema() -> None:
    """Ensure optional columns exist without dropping data.

    This is a light-weight guard to add missing columns for simple evolutions
    when full migrations are not set up.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text(
                "ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS user_email VARCHAR(255)"
            ))
            conn.execute(text(
                "ALTER TABLE uploaded_files ADD COLUMN IF NOT EXISTS dp_id INTEGER"
            ))
            conn.commit()
    except Exception:
        # Best-effort; avoid breaking startup if the table doesn't exist yet.
        pass


def ensure_projects_schema() -> None:
    """Ensure projects table exists."""
    try:
        with engine.connect() as conn:
            # Create projects table if it doesn't exist
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS projects (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) UNIQUE NOT NULL,
                    project_number VARCHAR(100),
                    professional_engineer VARCHAR(255),
                    general_contractor VARCHAR(255),
                    architect VARCHAR(255),
                    engineer VARCHAR(255),
                    fabricator VARCHAR(255),
                    design_calculation VARCHAR(1000),
                    contract_drawings VARCHAR(1000),
                    standards VARCHAR(1000),
                    detailer VARCHAR(255),
                    detailing_country VARCHAR(255),
                    geolocation VARCHAR(255),
                    description VARCHAR(1000),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))
            # Add new columns if they don't exist (for existing tables)
            conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS professional_engineer VARCHAR(255)"))
            conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS design_calculation VARCHAR(1000)"))
            conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS contract_drawings VARCHAR(1000)"))
            conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS standards VARCHAR(1000)"))
            conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS detailer VARCHAR(255)"))
            conn.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS detailing_country VARCHAR(255)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name)"))
            conn.commit()
    except Exception:
        # Best-effort; avoid breaking startup if there are issues.
        pass


def ensure_auth_schema() -> None:
    """Ensure auth-related tables and columns exist."""
    try:
        with engine.begin() as conn:
            # Add is_verified column to email_users table if it doesn't exist
            conn.execute(text("""
                ALTER TABLE email_users 
                ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE NOT NULL
            """))
            
            # Create otps table if it doesn't exist
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS otps (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) NOT NULL,
                    otp_code VARCHAR(6) NOT NULL,
                    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
                )
            """))
            
            # Create indexes for otps table
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_otps_email ON otps(email)"))
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_otps_created_at ON otps(created_at)"))
    except Exception as e:
        # Best-effort; avoid breaking startup if there are issues.
        print(f"[schema] Warning: Could not update auth schema: {e}")
        pass