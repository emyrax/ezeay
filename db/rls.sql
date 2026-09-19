-- Run this in Neon SQL Editor once after creating the database.
-- Creates a restricted app_user role.
-- Since Neon HTTP driver creates a fresh connection per query,
-- Row-Level Security with session variables is not practical.
-- Instead, authorization is handled at the app level
-- (queries are always scoped to WHERE id = currentUserId).
-- This role provides table-level security.

CREATE ROLE app_user WITH LOGIN PASSWORD 'change-this-to-a-strong-password';
GRANT CONNECT ON DATABASE ezeay TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
GRANT SELECT ON levels TO app_user;
GRANT SELECT, INSERT, DELETE ON note_chats TO app_user;
GRANT SELECT, INSERT, DELETE ON course_feed_likes TO app_user;
REVOKE DELETE ON ALL TABLES IN SCHEMA public FROM app_user;
