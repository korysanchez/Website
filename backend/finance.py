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
                description TEXT,
                rate TEXT,
                title TEXT NOT NULL
            );
        """)
        conn.commit()
        print("Transactions table is ready.")
    except sqlite3.Error as e:
        print(f"Error creating table: {e}")
    finally:
        conn.close()


def get_transactions_by_user(user):
    """Retrieve all transactions for a specific user (case-insensitive)."""
    conn = connect_db()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT category, amount, date, title, description, rate, id FROM transactions WHERE user = ? COLLATE NOCASE",
            (user,)
        )
        transactions = cursor.fetchall()
        return transactions
    except sqlite3.Error as e:
        print(f"Error retrieving transactions: {e}")
        return []
    finally:
        conn.close()

def insert_transaction(user, category, amount, date_obj, title, description, rate, logger=None):
    """
    Insert a new transaction into the database.

    :param user: str
    :param category: str
    :param amount: float
    :param date_obj: datetime.datetime
    :param title: str
    :param description: str
    :param rate: float
    :param logger: logging.Logger or None
    """
    if not isinstance(date_obj, datetime):
        raise TypeError("date_obj must be a datetime object")

    conn = connect_db()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO transactions (user, category, amount, date, title, description, rate)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (user, category, amount, date_obj.strftime("%Y-%m-%d %H:%M:%S"), title, description, rate))
        conn.commit()
        if logger:
            logger.info(f"Inserted transaction: {user}, {category}, {amount}, {date_obj}, {title}, {description}, {rate}")
        return True
    except sqlite3.Error as e:
        if logger:
            logger.error(f"Error inserting transaction: {e}")
        return False
    finally:
        conn.close()

def edit_transaction_by_id(transaction_id, category=None, amount=None, date_obj=None, title=None, description=None, rate=None, logger=None):
    """
    Edit an existing transaction by its ID.

    :param transaction_id: int
    :param category: str or None
    :param amount: float or None
    :param date_obj: datetime.datetime or None
    :param title: str or None
    :param description: str or None
    :param rate: float or None
    :param logger: optional logging object
    :return: True if updated, False if not found or error
    """
    conn = connect_db()
    try:
        cursor = conn.cursor()
        fields = []
        values = []

        if category is not None:
            fields.append("category = ?")
            values.append(category)
        if amount is not None:
            fields.append("amount = ?")
            values.append(amount)
        if date_obj is not None:
            if not isinstance(date_obj, datetime):
                raise TypeError("date_obj must be a datetime object")
            fields.append("date = ?")
            values.append(date_obj.strftime("%Y-%m-%d %H:%M:%S"))
        if title is not None:
            fields.append("title = ?")
            values.append(title)
        if description is not None:
            fields.append("description = ?")
            values.append(description)
        if rate is not None:
            fields.append("rate = ?")
            values.append(rate)

        values.append(transaction_id)
        sql = f"UPDATE transactions SET {', '.join(fields)} WHERE id = ?"
        cursor.execute(sql, tuple(values))
        conn.commit()
        if cursor.rowcount == 0:
            if logger:
                logger.warning(f"No transaction found with id {transaction_id}")
            return False
        if logger:
            logger.info(f"Updated transaction with id {transaction_id}")
        return True
    except sqlite3.Error as e:
        if logger:
            logger.error(f"Error updating transaction {transaction_id}: {e}")
        return False
    finally:
        conn.close()

def delete_transaction_by_id(transaction_id, logger=None):
    """
    Delete a transaction from the database by its ID.

    :param transaction_id: int
    :param logger: optional logging object
    :return: True if deleted, False if not found or error
    """
    conn = connect_db()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM transactions WHERE id = ?", (transaction_id,))
        conn.commit()
        if cursor.rowcount == 0:
            if logger:
                logger.warning(f"No transaction found with id {transaction_id}")
            return False
        if logger:
            logger.info(f"Deleted transaction with id {transaction_id}")
        return True
    except sqlite3.Error as e:
        if logger:
            logger.error(f"Error deleting transaction {transaction_id}: {e}")
        return False
    finally:
        conn.close()

# Initialize the table when this module is imported
create_table()