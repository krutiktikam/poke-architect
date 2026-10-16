web: alembic -c backend/alembic.ini upgrade head && gunicorn -w 1 -k uvicorn.workers.UvicornWorker backend.main:app
