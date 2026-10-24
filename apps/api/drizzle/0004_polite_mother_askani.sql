INSERT INTO "users" ("id", "user_name", "password") VALUES ('00000000-0000-4000-8000-000000000001', 'dev', 'dev') ON CONFLICT ("id") DO NOTHING;
