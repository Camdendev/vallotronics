import psycopg2
import config

def get_conn():
    # Ensure connections use the desired schema as search_path
    opts = None
    if hasattr(config, 'DB_SCHEMA') and config.DB_SCHEMA:
        opts = f"-c search_path={config.DB_SCHEMA}"

    return psycopg2.connect(
        dbname=config.DB_NAME,
        user=config.DB_USER,
        password=config.DB_PASS,
        host=config.DB_HOST,
        port=config.DB_PORT,
        options=opts,
    )
