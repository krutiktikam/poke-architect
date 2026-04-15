import subprocess
import time
import sys
import os

def start_backend():
    print("🚀 Starting FastAPI Backend...")
    return subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "backend.main:app", "--reload", "--port", "8000"],
        cwd=os.getcwd()
    )

def start_frontend():
    print("🎨 Starting Vite Frontend...")
    # Using shell=True for npm on Windows
    return subprocess.Popen(
        ["npm", "run", "dev"],
        cwd=os.path.join(os.getcwd(), "frontend"),
        shell=True
    )

if __name__ == "__main__":
    backend_proc = None
    frontend_proc = None
    
    try:
        backend_proc = start_backend()
        # Give backend a moment to start
        time.sleep(2)
        frontend_proc = start_frontend()
        
        print("\n✅ Both services are running!")
        print("🔗 Backend: http://localhost:8000")
        print("🔗 Frontend: http://localhost:5173")
        print("\nPress Ctrl+C to stop both services.\n")
        
        # Keep the script running
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\n🛑 Stopping services...")
        if backend_proc:
            backend_proc.terminate()
        if frontend_proc:
            frontend_proc.terminate()
        print("👋 Goodbye!")
