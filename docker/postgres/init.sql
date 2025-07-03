-- Create additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_buckets_created_at ON buckets(created_at);
CREATE INDEX IF NOT EXISTS idx_s3_objects_created_at ON s3_objects(created_at);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at);

-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
