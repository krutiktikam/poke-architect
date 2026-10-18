import json
import os
import sys

# Ensure backend can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.main import app

def main():
    schema = app.openapi()
    target_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), '..', 'frontend', 'openapi.json')
    )
    with open(target_path, 'w', encoding='utf-8') as f:
        json.dump(schema, f, indent=2)
    print(f'OpenAPI schema exported to {target_path}')

if __name__ == '__main__':
    main()
