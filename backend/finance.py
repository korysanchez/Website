from datetime import datetime
import sqlite3
import os

DB_DIR = "data"
DB_FILE = os.path.join(DB_DIR, "finance.db")
os.makedirs(DB_DIR, exist_ok=True)

def connect_db(db_path=DB_FILE):
    return sqlite3.connect(db_path)

def create_table():
    """Create the transactions table if it doesn't exist."""
    conn = connect_db()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user TEXT NOT NULL,
                category TEXT NOT NULL,
                amount REAL NOT NULL,
                date DATETIME NOT NULL,
                title TEXT NOT NULL
            );
        """)
        conn.commit()
        print("Transactions table is ready.")
    except sqlite3.Error as e:
        print(f"Error creating table: {e}")
    finally:
        conn.close()

def insert_transaction(user, category, amount, date_obj, title, logger=None):
    """
    Insert a new transaction into the database.

    :param user: str
    :param category: str
    :param amount: float
    :param date_obj: datetime.datetime
    :param title: str
    :param logger: logging.Logger or None
    """
    if not isinstance(date_obj, datetime):
        raise TypeError("date_obj must be a datetime object")

    conn = connect_db()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO transactions (user, category, amount, date, title)
            VALUES (?, ?, ?, ?, ?)
        """, (user, category, amount, date_obj.strftime("%Y-%m-%d %H:%M:%S"), title))
        conn.commit()
        if logger:
            logger.info(f"Inserted transaction: {user}, {category}, {amount}, {date_obj}, {title}")
        return True
    except sqlite3.Error as e:
        if logger:
            logger.error(f"Error inserting transaction: {e}")
        return False
    finally:
        conn.close()

# Initialize the table when this module is imported
create_table()