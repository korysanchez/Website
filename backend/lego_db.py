import sqlite3

def connect_db(db_path='lego_db.db'):
    return sqlite3.connect(db_path)

def normalize_container_id(cid):
    """Ensure container ID is in the format cXXX"""
    if isinstance(cid, str) and cid.startswith("c"):
        return cid
    try:
        return f"c{int(cid):03}"
    except ValueError:
        raise ValueError(f"Invalid container ID format: {cid}")
    
def denormalize_container_id(cid):
    """Convert container ID to an integer format"""
    if isinstance(cid, str) and cid.startswith("c"):
        cid = cid[1:]  # Remove the leading 'c'
    try:
        return int(cid)  # Convert to integer
    except ValueError:
        raise ValueError(f"Invalid container ID format: {cid}")

# Container operations
def get_container_at_location(conn, box, position) -> str | None:
    cur = conn.cursor()
    cur.execute("SELECT id FROM Container WHERE box_id = ? AND position_id = ?", (box, position))
    result = cur.fetchone()
    return result[0] if result else None

def get_container_from_id(conn, container_id) -> dict | None:
    """Retrieve container data and associated pieces by container ID."""
    container_id = normalize_container_id(container_id)
    
    cur = conn.cursor()
    cur.execute("SELECT box_id, position_id FROM Container WHERE id = ?", (container_id,))
    result = cur.fetchone()
    
    if not result:
        return None
    
    box_id, position_id = result
    pieces = get_pieces_in_container(conn, container_id)

    return {
        "id": container_id,
        "location": {
            "box": box_id,
            "position": position_id
        },
        "pieces": pieces
    }

def get_containers_location(conn, container_id):
    """Get the box and position of a container"""
    container_id = normalize_container_id(container_id)
    cur = conn.cursor()
    cur.execute("SELECT box_id, position_id FROM Container WHERE id = ?", (container_id,))
    return cur.fetchone()

def get_contents_of_box(conn, box_id):
    box_id = box_id.upper()  # Normalize box input
    cur = conn.cursor()
    cur.execute("""
        SELECT c.id, c.position_id, p.part_number, p.name, p.category
        FROM Container c
        LEFT JOIN ContainerPiece cp ON cp.container_id = c.id
        LEFT JOIN Piece p ON p.part_number = cp.part_number
        WHERE c.box_id = ?
        ORDER BY c.position_id, p.part_number
    """, (box_id,))
    return cur.fetchall()

# Piece operations
def get_pieces_in_container(conn, container_id) -> list[dict]:
    """Return a list of pieces in the given container, each as a dictionary."""
    container_id = normalize_container_id(container_id)
    cur = conn.cursor()
    cur.execute("""
        SELECT p.part_number, p.name, p.category
        FROM ContainerPiece cp
        JOIN Piece p ON cp.part_number = p.part_number
        WHERE cp.container_id = ?
    """, (container_id,))
    
    return [
        {
            "part_number": row[0],
            "name": row[1],
            "category": row[2]
        }
        for row in cur.fetchall()
    ]

def get_containers_with_piece(conn, part_number) -> list[str]:
    """Get all container IDs that have the specified piece"""
    cur = conn.cursor()
    cur.execute("""
        SELECT container_id
        FROM ContainerPiece
        WHERE part_number = ?
    """, (str(part_number),))
    return [row[0] for row in cur.fetchall()]

def get_piece(conn, part_number) -> dict[str, str] | None:
    cur = conn.cursor()
    cur.execute("""
        SELECT p.part_number, p.name, p.category
        FROM Piece p
        WHERE p.part_number = ?
    """, (part_number,))
    row = cur.fetchone()
    if row is None:
        return None
    return {"part_number": row[0], "name": row[1], "category": row[2]}

def search_piece(conn, part_number=None, name=None, category=None) -> list[dict]:
    """Search for a piece in the catalog and return list of results"""
    cur = conn.cursor()
    part_nums = []

    if part_number:
        part_nums = [part_number]
    elif name:
        cur.execute("SELECT part_number FROM Piece WHERE name LIKE ?", ('%' + name + '%',))
        part_nums = [row[0] for row in cur.fetchall()]
    elif category:
        cur.execute("SELECT part_number FROM Piece WHERE category LIKE ?", ('%' + category + '%',))
        part_nums = [row[0] for row in cur.fetchall()]

    results = []

    for pn in part_nums:
        cur.execute("SELECT name, category FROM Piece WHERE part_number = ?", (pn,))
        piece = cur.fetchone()
        if not piece:
            continue

        piece_name, piece_category = piece
        containers = get_containers_with_piece(conn, pn)
        container_info = []
        for cid in containers:
            location = get_containers_location(conn, cid)
            container_info.append({
                "container_id": cid,
                "location": f"{location[0]}{location[1].lower()}" if location and location[0] and location[1] else None
            })

        results.append({
            "part_number": pn,
            "name": piece_name,
            "category": piece_category,
            "containers": container_info
        })

    return results