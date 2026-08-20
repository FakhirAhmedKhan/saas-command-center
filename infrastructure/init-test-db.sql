DO
$$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'command_center_test') THEN
    CREATE ROLE command_center_test WITH LOGIN PASSWORD 'command_center_test';
  END IF;
END
$$;

SELECT 'CREATE DATABASE command_center_test OWNER command_center_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'command_center_test')
\gexec

GRANT ALL PRIVILEGES ON DATABASE command_center_test TO command_center_test;
