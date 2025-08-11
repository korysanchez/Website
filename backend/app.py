from flask import Flask, Blueprint, request, jsonify, send_file, redirect, render_template
from flask_cors import CORS
import os, sys

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000", "https://korysanchez.me"])


@app.route('/')
def home():
    if 'www.' in request.host:
        return redirect('https://korysanchez.me' + request.full_path, code=301)
    
    # Return the main page if it's the non-www version
    return "Welcome to korysanchez.me"


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
    app.run(host='0.0.0.0', port=5000)