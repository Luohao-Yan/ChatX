from app.core.database import engine
from app.models.user_models import User

def create_tables():
    User.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

if __name__ == "__main__":
    create_tables()