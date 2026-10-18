import os
import sys
import subprocess

def run_migrations():
    print("Running database migrations (alembic upgrade head)...")
    config_path = os.path.join(os.path.dirname(__file__), "alembic.ini")
    cmd = [sys.executable, "-m", "alembic", "-c", config_path, "upgrade", "head"]
    result = subprocess.run(cmd)
    if result.returncode != 0:
        print("ERROR: Database migrations failed!")
        sys.exit(result.returncode)
    print("Database migrations completed successfully.")

def start_server():
    port = os.getenv("PORT", "8000")
    print(f"Starting server on port {port}...")
    cmd = [
        sys.executable, "-m", "uvicorn", "backend.main:app",
        "--host", "0.0.0.0", "--port", port
    ]
    subprocess.run(cmd)

if __name__ == "__main__":
    run_migrations()
    start_server()
