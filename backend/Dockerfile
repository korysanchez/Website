# Python backend image just for a flask & sqlite server
FROM python:3.11-slim

# Set up directory and install dependencies
WORKDIR .
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Open port 5000 for the Flask server
EXPOSE 5000

# Run production level flask server with Gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]