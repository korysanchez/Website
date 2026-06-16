#!/usr/bin/env python3
"""
Security Management Script - Account & IP Management

Manage locked accounts and banned IPs from failed login attempts.
"""

import sqlite3
import os
import sys
from datetime import datetime

DB_PATH = os.getenv("PRIVATE_DB_PATH", "private_finance.db")
LOGINS_LOG_PATH = os.getenv("LOGINS_LOG_PATH", "logins.txt")

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def list_locked_accounts():
    """Show all locked accounts"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT username, locked_at, failed_attempts 
        FROM locked_accounts 
        ORDER BY locked_at DESC
    """)
    locked = cursor.fetchall()
    conn.close()
    
    if not locked:
        print("\n✓ No locked accounts\n")
        return
    
    print("\n" + "="*80)
    print("LOCKED ACCOUNTS")
    print("="*80)
    for row in locked:
        print(f"Username: {row['username']}")
        print(f"  Locked at: {row['locked_at']}")
        print(f"  Failed attempts: {row['failed_attempts']}")
        print("-" * 80)
    print()

def list_banned_ips():
    """Show all banned IP addresses"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ip_address, banned_at, reason 
        FROM banned_ips 
        ORDER BY banned_at DESC
    """)
    banned = cursor.fetchall()
    conn.close()
    
    if not banned:
        print("\n✓ No banned IPs\n")
        return
    
    print("\n" + "="*80)
    print("BANNED IP ADDRESSES")
    print("="*80)
    for row in banned:
        print(f"IP Address: {row['ip_address']}")
        print(f"  Banned at: {row['banned_at']}")
        print(f"  Reason: {row['reason']}")
        print("-" * 80)
    print()

def unlock_account():
    """Unlock a specific account"""
    username = input("Enter username to unlock: ").strip()
    
    if not username:
        print("No username entered.")
        return
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if account is locked
    cursor.execute("SELECT * FROM locked_accounts WHERE username = ?", (username,))
    if not cursor.fetchone():
        print(f"\n✗ Account '{username}' is not locked.\n")
        conn.close()
        return
    
    # Unlock the account
    cursor.execute("DELETE FROM locked_accounts WHERE username = ?", (username,))
    
    # Clear failed login attempts
    cursor.execute("DELETE FROM failed_logins WHERE username = ?", (username,))
    
    conn.commit()
    conn.close()
    
    print(f"\n✓ Account '{username}' unlocked successfully!\n")

def unban_ip():
    """Unban a specific IP address"""
    ip = input("Enter IP address to unban: ").strip()
    
    if not ip:
        print("No IP address entered.")
        return
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Check if IP is banned
    cursor.execute("SELECT * FROM banned_ips WHERE ip_address = ?", (ip,))
    if not cursor.fetchone():
        print(f"\n✗ IP '{ip}' is not banned.\n")
        conn.close()
        return
    
    # Unban the IP
    cursor.execute("DELETE FROM banned_ips WHERE ip_address = ?", (ip,))
    
    conn.commit()
    conn.close()
    
    print(f"\n✓ IP address '{ip}' unbanned successfully!\n")

def unlock_all():
    """Unlock all accounts and unban all IPs"""
    confirm = input("Are you sure you want to unlock ALL accounts and unban ALL IPs? (yes/no): ").strip().lower()
    
    if confirm != 'yes':
        print("Cancelled.")
        return
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) as count FROM locked_accounts")
    locked_count = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM banned_ips")
    banned_count = cursor.fetchone()['count']
    
    cursor.execute("DELETE FROM locked_accounts")
    cursor.execute("DELETE FROM banned_ips")
    cursor.execute("DELETE FROM failed_logins")
    
    conn.commit()
    conn.close()
    
    print(f"\n✓ Unlocked {locked_count} account(s)")
    print(f"✓ Unbanned {banned_count} IP address(es)")
    print(f"✓ Cleared all failed login attempts\n")

def view_recent_attempts():
    """View recent login attempts"""
    lines = input("How many recent attempts to show? (default 20): ").strip()
    lines = int(lines) if lines else 20
    
    if not os.path.exists(LOGINS_LOG_PATH):
        print("\nNo login log found.\n")
        return
    
    print("\n" + "="*80)
    print(f"RECENT LOGIN ATTEMPTS (last {lines})")
    print("="*80 + "\n")
    
    with open(LOGINS_LOG_PATH, 'r') as f:
        all_lines = f.readlines()
        recent = all_lines[-lines:] if len(all_lines) > lines else all_lines
        
        for line in recent:
            print(line.rstrip())
    
    print("\n" + "="*80 + "\n")

def show_stats():
    """Show security statistics"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) as count FROM locked_accounts")
    locked = cursor.fetchone()['count']
    
    cursor.execute("SELECT COUNT(*) as count FROM banned_ips")
    banned = cursor.fetchone()['count']
    
    # Recent failed attempts (last 24 hours)
    one_day_ago = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    cursor.execute("""
        SELECT COUNT(*) as count FROM failed_logins 
        WHERE attempt_time > ?
    """, (one_day_ago,))
    recent_fails = cursor.fetchone()['count']
    
    conn.close()
    
    print("\n" + "="*80)
    print("SECURITY STATISTICS")
    print("="*80)
    print(f"Locked accounts: {locked}")
    print(f"Banned IPs: {banned}")
    print(f"Failed attempts (today): {recent_fails}")
    print("="*80 + "\n")

def main():
    if not os.path.exists(DB_PATH):
        print(f"Database not found: {DB_PATH}")
        return
    
    while True:
        print("\n" + "="*80)
        print("SECURITY MANAGEMENT")
        print("="*80)
        print("1. List locked accounts")
        print("2. List banned IPs")
        print("3. Unlock specific account")
        print("4. Unban specific IP")
        print("5. Unlock ALL accounts and unban ALL IPs")
        print("6. View recent login attempts")
        print("7. Show security statistics")
        print("8. Exit")
        print("="*80)
        
        choice = input("\nSelect option (1-8): ").strip()
        
        if choice == '1':
            list_locked_accounts()
        elif choice == '2':
            list_banned_ips()
        elif choice == '3':
            unlock_account()
        elif choice == '4':
            unban_ip()
        elif choice == '5':
            unlock_all()
        elif choice == '6':
            view_recent_attempts()
        elif choice == '7':
            show_stats()
        elif choice == '8':
            print("\nGoodbye!\n")
            break
        else:
            print("\nInvalid option!\n")

if __name__ == "__main__":
    main()