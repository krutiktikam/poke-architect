import os
from sqlalchemy import create_engine, inspect

SQLALCHEMY_DATABASE_URL = "postgresql://postgres.iljyewcwtkmhjvjpnvut:Chunchunmaru02@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres"

engine = create_engine(SQLALCHEMY_DATABASE_URL)

def check_schema():
    inspector = inspect(engine)
    columns = inspector.get_columns('pokemon')
    print(f"Columns in 'pokemon' table:")
    for column in columns:
        print(f"- {column['name']} ({column['type']})")

if __name__ == "__main__":
    check_schema()
