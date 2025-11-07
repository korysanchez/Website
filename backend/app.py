from flask import Flask, Blueprint, request, jsonify, send_file, redirect, render_template
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import datetime
import os, sys
import logging
import sys

# Forward print/log output to Gunicorn logs
logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s'
)

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://korysanchez.me"])


@app.route('/')
def home():
    if 'www.' in request.host:
        return redirect('https://korysanchez.me' + request.full_path, code=301)
    
    # Return the main page if it's the non-www version
    return "Welcome too korysanchez.me"

import finance
@app.route('/api/finance', methods=['POST'])
def receive_data():
    load_dotenv()
    EXPECTED_PW = os.environ.get("FINANCE_API_PW")

    # Check custom header
    if request.headers.get("pw") != EXPECTED_PW:
        return jsonify({"error": "Unauthorized"}), 401

    # Check JSON body
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    required_fields = ["User", "Category", "Amount", "Date", "Title"]


    
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        return jsonify({"error": "Missing required fields", "missing": missing_fields}), 400

    # Convert the incoming date string to a datetime object
    try:
        # Example format: "Nov 6, 2025 at 6:28 PM"
        date_obj = datetime.strptime(data["Date"], "%b %d, %Y at %I:%M %p")
    except ValueError as e:
        return jsonify({"error": f"Invalid date format: {e}"}), 400

    # Insert into database
    success = finance.insert_transaction(
        user=data["User"],
        category=data["Category"],
        amount=data["Amount"],
        date_obj=date_obj,
        title=data["Title"],
        logger=app.logger
    )

    if success:
        app.logger.info(f"Inserted transaction: {data}")
        return jsonify({"message": "Transaction recorded successfully"}), 200
    else:
        return jsonify({"error": "Failed to insert transaction"}), 500


@app.route('/download-resume', methods=['GET'])
def download_resume():
    resume_path = os.path.join(os.path.dirname(__file__), "resources", "Kory Sanchez Resume.pdf")
    
    if not os.path.exists(resume_path):
        print('File not found')
        return jsonify({"error": "Resume file not found"}), 404

    try:
        return send_file(resume_path, as_attachment=True)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500





# ---------------------------------------------- lego -------------------------------------------------
try:
    import lego_db
except ImportError:
    lego_db = None
    print("Error: lego_db module not found. Ensure it is installed and accessible.")

lego_bp = Blueprint('lego', __name__)

@app.route('/part_images/<path:filename>')
def serve_part_images(filename):
    # Path to your images in the container
    return send_from_directory('/app/public/part_images', filename)


@lego_bp.route('/boxes')
def get_boxes():
    """Get all box IDs"""
    if not lego_db:
        return jsonify({"error": "lego_db module is not available"}), 500

    try:
        print("connecting")
        conn = lego_db.connect_db()
        print("connected")
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM Box ORDER BY id")
        boxes = [row[0] for row in cursor.fetchall()]
        conn.close()
        return jsonify(boxes)
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

@lego_bp.route('/box/<box_id>')
def get_box_contents(box_id):
    """Get contents of a specific box"""
    conn = lego_db.connect_db()
    box_contents = lego_db.get_contents_of_box(conn, box_id)
    
    # Format the results
    results = []
    for row in box_contents:
        container_id, position, part_number, name, category = row
        results.append({
            "container_id": container_id,
            "position": position,
            "part_number": part_number,
            "name": name,
            "category": category
        })
    
    conn.close()
    return jsonify(results)

@lego_bp.route('/container/<container_id>')
def get_container(container_id):
    """Get details of a specific container"""
    conn = lego_db.connect_db()
    try:
        container = lego_db.get_container_from_id(conn, container_id)
        if not container:
            conn.close()
            return jsonify({"error": "Container not found"}), 404
        conn.close()
        return jsonify(container)
    except ValueError as e:
        conn.close()
        return jsonify({"error": str(e)}), 400

@lego_bp.route('/piece/search')
def search_piece():
    """Search for pieces based on various criteria"""
    search_type = request.args.get('type', 'part_number')
    search_term = request.args.get('term', '')
    
    if not search_term:
        return jsonify([])
    
    conn = lego_db.connect_db()
    
    try:
        if search_type == 'part_number':
            results = lego_db.search_piece(conn, part_number=search_term)
        elif search_type == 'name':
            results = lego_db.search_piece(conn, name=search_term)
        elif search_type == 'category':
            results = lego_db.search_piece(conn, category=search_term)
        else:
            conn.close()
            return jsonify({"error": "Invalid search type"}), 400
        
        conn.close()
        return jsonify(results)
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500

@lego_bp.route('/positions')
def get_positions():
    """Get all available positions"""
    conn = lego_db.connect_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM Position ORDER BY id")
    positions = [row[0] for row in cursor.fetchall()]
    conn.close()
    return jsonify(positions)

@lego_bp.route('/categories')
def get_categories():
    """Retrieve all distinct piece categories from the catalog"""
    conn = lego_db.connect_db()
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT category FROM Piece")
    categories = [row[0] for row in cur.fetchall()]
    conn.close()
    return jsonify(categories)

app.register_blueprint(lego_bp, url_prefix='/lego/api')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)