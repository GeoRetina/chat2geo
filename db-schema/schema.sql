

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."subscription_tier_enum" AS ENUM (
    'Essentials',
    'Pro',
    'Enterprise'
);


ALTER TYPE "public"."subscription_tier_enum" OWNER TO "postgres";


CREATE TYPE "public"."user_role_enum" AS ENUM (
    'ADMIN',
    'USER',
    'TRIAL',
    'VIEWER'
);


ALTER TYPE "public"."user_role_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_usage_row"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Insert a matching row in user_usage
  INSERT INTO public.user_usage (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_user_usage_row"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_roles (
    id,
    name,
    email,
    organization,
    role,
    license_start,
    license_end,
    subscription_tier
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email,
    '',
    'TRIAL',
    CURRENT_DATE,
    CURRENT_DATE + 14,
    'Essentials'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_documents_by_similarity"("query_embedding" "public"."vector", "match_count" integer DEFAULT NULL::integer, "filter" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("id" bigint, "content" "text", "metadata" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content,
    e.metadata
      || jsonb_build_object('similarity', 1 - (e.embedding <=> query_embedding)) AS metadata
  FROM embeddings e
  JOIN document_files f ON f.id = e.file_id
  WHERE
 f.owner = (filter->>'owner')::uuid

  ORDER BY
    e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."search_documents_by_similarity"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_documents_by_similarity"("query_embedding" "public"."vector", "match_count" integer DEFAULT NULL::integer, "owner_uuid" "uuid" DEFAULT NULL::"uuid", "metadata_filter" "jsonb" DEFAULT '{}'::"jsonb") RETURNS TABLE("id" bigint, "content" "text", "metadata" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.content,
    e.metadata
      || jsonb_build_object('similarity', 1 - (e.embedding <=> query_embedding)) AS metadata
  FROM embeddings e
  JOIN document_files f ON f.id = e.file_id
  WHERE
    -- If owner_uuid is provided, filter on that
    (owner_uuid IS NULL OR f.owner = owner_uuid)
    
    -- If metadata_filter is not empty, check that e.metadata contains it
    AND (
      metadata_filter = '{}' 
      OR e.metadata @> metadata_filter
    )
  ORDER BY
    e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


ALTER FUNCTION "public"."search_documents_by_similarity"("query_embedding" "public"."vector", "match_count" integer, "owner_uuid" "uuid", "metadata_filter" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_gee_datasets_ft"("query" "text") RETURNS TABLE("id" integer, "dataset_id" "text", "asset_url" "text", "type" "text", "start_date" "date", "end_date" "date", "title" "text", "rank" real)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    gd.id,
    gd.dataset_id,
    gd.asset_url,
    gd.type,
    gd.start_date,
    gd.end_date,
    gd.title,
    ts_rank(gd.search_vector, to_tsquery('simple', query)) AS rank
  FROM public.gee_datasets gd
  WHERE gd.search_vector @@ to_tsquery('simple', query)
  ORDER BY rank DESC;
END;
$$;


ALTER FUNCTION "public"."search_gee_datasets_ft"("query" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_usage_docs_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  affected_user UUID;
BEGIN
  -- Coalesce to figure out which user was affected
  affected_user := COALESCE(NEW.owner, OLD.owner);

  -- Recalculate total docs for that user
  UPDATE public.user_usage
  SET knowledge_base_docs_count = (
    SELECT COUNT(*) 
    FROM public.document_files
    WHERE owner = affected_user
  ),
  updated_at = now()
  WHERE user_id = affected_user;

  RETURN NULL;  -- For an AFTER trigger, we can return NULL
END;
$$;


ALTER FUNCTION "public"."update_user_usage_docs_count"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."chats" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "userId" "uuid",
    "chatTitle" character varying(255),
    "createdAt" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."chats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_files" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid" NOT NULL,
    "number_of_pages" integer,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "file_path" "text" NOT NULL,
    "folder_id" "text"
);


ALTER TABLE "public"."document_files" OWNER TO "postgres";


ALTER TABLE "public"."document_files" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."document_files_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."drafted_reports" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "userId" "uuid",
    "title" character varying(255) NOT NULL,
    "content" "text",
    "createdAt" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."drafted_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."embeddings" (
    "id" bigint NOT NULL,
    "content" "text",
    "metadata" "jsonb",
    "embedding" "public"."vector"(3072),
    "file_id" bigint NOT NULL
);


ALTER TABLE "public"."embeddings" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."embeddings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."embeddings_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."embeddings_id_seq" OWNED BY "public"."embeddings"."id";



CREATE TABLE IF NOT EXISTS "public"."gee_datasets" (
    "id" integer NOT NULL,
    "dataset_id" "text",
    "asset_url" "text",
    "provider" "text",
    "title" "text",
    "start_date" "date",
    "end_date" "date",
    "tags" "text",
    "type" "text",
    "thumbnail_url" "text",
    "search_vector" "tsvector"
);


ALTER TABLE "public"."gee_datasets" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."gee_datasets_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."gee_datasets_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."gee_datasets_id_seq" OWNED BY "public"."gee_datasets"."id";



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "chatId" "uuid",
    "draftedReportId" "uuid",
    "role" character varying(50) NOT NULL,
    "content" "json" NOT NULL,
    "createdAt" timestamp without time zone DEFAULT "now"(),
    "toolResult" "jsonb"
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "organization" character varying(255),
    "role" "public"."user_role_enum" NOT NULL,
    "license_start" "date",
    "license_end" "date",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "subscription_tier" "public"."subscription_tier_enum" DEFAULT 'Essentials'::"public"."subscription_tier_enum" NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "requests_count" integer DEFAULT 0 NOT NULL,
    "knowledge_base_docs_count" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_usage" OWNER TO "postgres";


ALTER TABLE ONLY "public"."embeddings" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."embeddings_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."gee_datasets" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."gee_datasets_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."document_files"
    ADD CONSTRAINT "document_files_file_path_key" UNIQUE ("file_path");



ALTER TABLE ONLY "public"."document_files"
    ADD CONSTRAINT "document_files_owner_name_key" UNIQUE ("owner", "name");



ALTER TABLE ONLY "public"."document_files"
    ADD CONSTRAINT "document_files_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."drafted_reports"
    ADD CONSTRAINT "drafted_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."embeddings"
    ADD CONSTRAINT "embeddings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gee_datasets"
    ADD CONSTRAINT "gee_datasets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_usage"
    ADD CONSTRAINT "user_usage_pkey" PRIMARY KEY ("id");



CREATE INDEX "gee_datasets_dataset_id_idx" ON "public"."gee_datasets" USING "btree" ("lower"("dataset_id"));



CREATE INDEX "gee_datasets_search_idx" ON "public"."gee_datasets" USING "gin" ("search_vector");



CREATE INDEX "gee_datasets_title_idx" ON "public"."gee_datasets" USING "btree" ("lower"("title"));



CREATE OR REPLACE TRIGGER "trigger_update_docs_count" AFTER INSERT OR DELETE OR UPDATE OF "owner" ON "public"."document_files" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_usage_docs_count"();



CREATE OR REPLACE TRIGGER "user_roles_after_insert" AFTER INSERT ON "public"."user_roles" FOR EACH ROW EXECUTE FUNCTION "public"."create_user_usage_row"();



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_files"
    ADD CONSTRAINT "document_files_owner_fkey" FOREIGN KEY ("owner") REFERENCES "public"."user_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."drafted_reports"
    ADD CONSTRAINT "drafted_reports_user_id_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."embeddings"
    ADD CONSTRAINT "embeddings_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "public"."document_files"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_chat_id_fkey" FOREIGN KEY ("chatId") REFERENCES "public"."chats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_drafted_report_id_fkey" FOREIGN KEY ("draftedReportId") REFERENCES "public"."drafted_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_usage"
    ADD CONSTRAINT "user_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_roles"("id") ON DELETE CASCADE;



CREATE POLICY "AUTHENTICATED" ON "public"."chats" TO "authenticated" USING (("userId" = "auth"."uid"())) WITH CHECK (("userId" = "auth"."uid"()));



CREATE POLICY "AUTHENTICATED" ON "public"."document_files" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."id" = "document_files"."owner") AND ("user_roles"."id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_roles"
  WHERE (("user_roles"."id" = "document_files"."owner") AND ("user_roles"."id" = "auth"."uid"())))));



CREATE POLICY "AUTHENTICATED" ON "public"."embeddings" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."document_files"
  WHERE (("document_files"."id" = "embeddings"."file_id") AND (EXISTS ( SELECT 1
           FROM "public"."user_roles"
          WHERE (("user_roles"."id" = "document_files"."owner") AND ("user_roles"."id" = "auth"."uid"())))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."document_files"
  WHERE (("document_files"."id" = "embeddings"."file_id") AND (EXISTS ( SELECT 1
           FROM "public"."user_roles"
          WHERE (("user_roles"."id" = "document_files"."owner") AND ("user_roles"."id" = "auth"."uid"()))))))));



CREATE POLICY "AUTHENTICATED" ON "public"."messages" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chats"
  WHERE (("chats"."id" = "messages"."chatId") AND ("chats"."userId" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."chats"
  WHERE (("chats"."id" = "messages"."chatId") AND ("chats"."userId" = "auth"."uid"())))));



CREATE POLICY "Allow authenticated users to access their own roles" ON "public"."user_roles" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND (("email")::"text" = "auth"."email"())));



CREATE POLICY "INSERT" ON "public"."user_roles" FOR INSERT TO "service_role", "postgres" WITH CHECK (true);



CREATE POLICY "INSERT" ON "public"."user_usage" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "SELECT" ON "public"."gee_datasets" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "SELECT" ON "public"."user_usage" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "UPDATE" ON "public"."user_usage" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."chats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_files" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."drafted_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."embeddings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."gee_datasets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_usage" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_user_usage_row"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_usage_row"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_usage_row"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."search_documents_by_similarity"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."search_documents_by_similarity"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_documents_by_similarity"("query_embedding" "public"."vector", "match_count" integer, "filter" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_documents_by_similarity"("query_embedding" "public"."vector", "match_count" integer, "owner_uuid" "uuid", "metadata_filter" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."search_documents_by_similarity"("query_embedding" "public"."vector", "match_count" integer, "owner_uuid" "uuid", "metadata_filter" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_documents_by_similarity"("query_embedding" "public"."vector", "match_count" integer, "owner_uuid" "uuid", "metadata_filter" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_gee_datasets_ft"("query" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_gee_datasets_ft"("query" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_gee_datasets_ft"("query" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_usage_docs_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_usage_docs_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_usage_docs_count"() TO "service_role";



GRANT ALL ON TABLE "public"."chats" TO "anon";
GRANT ALL ON TABLE "public"."chats" TO "authenticated";
GRANT ALL ON TABLE "public"."chats" TO "service_role";



GRANT ALL ON TABLE "public"."document_files" TO "anon";
GRANT ALL ON TABLE "public"."document_files" TO "authenticated";
GRANT ALL ON TABLE "public"."document_files" TO "service_role";



GRANT ALL ON SEQUENCE "public"."document_files_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."document_files_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."document_files_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."drafted_reports" TO "anon";
GRANT ALL ON TABLE "public"."drafted_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."drafted_reports" TO "service_role";



GRANT ALL ON TABLE "public"."embeddings" TO "anon";
GRANT ALL ON TABLE "public"."embeddings" TO "authenticated";
GRANT ALL ON TABLE "public"."embeddings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."embeddings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."embeddings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."embeddings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."gee_datasets" TO "anon";
GRANT ALL ON TABLE "public"."gee_datasets" TO "authenticated";
GRANT ALL ON TABLE "public"."gee_datasets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."gee_datasets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."gee_datasets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."gee_datasets_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_usage" TO "anon";
GRANT ALL ON TABLE "public"."user_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."user_usage" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






RESET ALL;
