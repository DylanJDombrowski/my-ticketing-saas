

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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."subscription_plan" AS ENUM (
    'free',
    'pro',
    'enterprise'
);


ALTER TYPE "public"."subscription_plan" OWNER TO "postgres";


CREATE TYPE "public"."ticket_priority" AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


ALTER TYPE "public"."ticket_priority" OWNER TO "postgres";


CREATE TYPE "public"."ticket_status" AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'closed'
);


ALTER TYPE "public"."ticket_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_user_with_tenant"("user_id" "uuid", "user_email" "text", "tenant_name" "text", "first_name" "text" DEFAULT NULL::"text", "last_name" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_tenant_id UUID;
  result JSON;
BEGIN
  -- Create tenant
  INSERT INTO tenants (name, subscription_plan)
  VALUES (tenant_name, 'free')
  RETURNING id INTO new_tenant_id;
  
  -- Create profile
  INSERT INTO profiles (id, tenant_id, email, first_name, last_name)
  VALUES (user_id, new_tenant_id, user_email, first_name, last_name);
  
  -- Return the created data
  SELECT json_build_object(
    'tenant_id', new_tenant_id,
    'user_id', user_id,
    'success', true
  ) INTO result;
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."create_user_with_tenant"("user_id" "uuid", "user_email" "text", "tenant_name" "text", "first_name" "text", "last_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_client_portal_token"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$;


ALTER FUNCTION "public"."generate_client_portal_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  tenant_id UUID;
BEGIN
  -- Create a new tenant for the user if they don't have one
  IF NEW.raw_user_meta_data->>'tenant_id' IS NULL THEN
    INSERT INTO tenants (name, created_at, updated_at)
    VALUES (
      COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
      NOW(),
      NOW()
    )
    RETURNING id INTO tenant_id;
  ELSE
    tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  END IF;

  -- Create the user profile
  INSERT INTO profiles (
    id,
    tenant_id,
    email,
    first_name,
    last_name,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    tenant_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NOW(),
    NOW()
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_ticket_actual_hours"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE tickets 
  SET actual_hours = (
    SELECT COALESCE(SUM(hours), 0) 
    FROM time_entries 
    WHERE ticket_id = COALESCE(NEW.ticket_id, OLD.ticket_id)
  )
  WHERE id = COALESCE(NEW.ticket_id, OLD.ticket_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_ticket_actual_hours"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."client_portal_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "client_id" "uuid" NOT NULL,
    "access_token" "text" NOT NULL,
    "expires_at" timestamp with time zone,
    "last_accessed" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."client_portal_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "email" character varying(255) NOT NULL,
    "phone" character varying(50),
    "company" character varying(100),
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "hourly_rate" numeric(10,2)
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_line_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "time_entry_id" "uuid" NOT NULL,
    "description" "text",
    "hours" numeric(10,2) NOT NULL,
    "rate" numeric(10,2) NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invoice_line_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "invoice_number" character varying(50) NOT NULL,
    "subtotal" numeric(10,2) NOT NULL,
    "tax_rate" numeric(5,2) DEFAULT 0,
    "tax_amount" numeric(10,2) DEFAULT 0,
    "total_amount" numeric(10,2) NOT NULL,
    "status" character varying(20) DEFAULT 'draft'::character varying,
    "due_date" "date",
    "payment_instructions" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "recurrence_rule" "text",
    "next_run_at" timestamp with time zone,
    "approval_status" "text" DEFAULT 'draft'::"text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "notification_type" "text" NOT NULL,
    "subject" "text",
    "message_body" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "sent_at" timestamp with time zone,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "method_type" character varying(20) NOT NULL,
    "display_name" character varying(100) NOT NULL,
    "instructions" "text",
    "payment_link_template" "text",
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "tenant_id" "uuid",
    "email" character varying(255) NOT NULL,
    "first_name" character varying(50),
    "last_name" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "default_hourly_rate" numeric(10,2) DEFAULT 75.00
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sla_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "client_id" "uuid",
    "ticket_priority" "public"."ticket_priority" NOT NULL,
    "response_time_hours" integer,
    "resolution_time_hours" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sla_rules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "subscription_plan" "public"."subscription_plan" DEFAULT 'free'::"public"."subscription_plan",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ticket_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "title" character varying(200) NOT NULL,
    "description" "text",
    "status" "public"."ticket_status" DEFAULT 'open'::"public"."ticket_status",
    "priority" "public"."ticket_priority" DEFAULT 'medium'::"public"."ticket_priority",
    "assigned_to" "uuid",
    "estimated_hours" numeric(10,2),
    "actual_hours" numeric(10,2) DEFAULT 0,
    "due_date" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "description" "text",
    "hours" numeric(10,2) NOT NULL,
    "is_billable" boolean DEFAULT true,
    "entry_date" "date" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "approval_status" "text" DEFAULT 'submitted'::"text",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone
);


ALTER TABLE "public"."time_entries" OWNER TO "postgres";


ALTER TABLE ONLY "public"."client_portal_access"
    ADD CONSTRAINT "client_portal_access_access_token_key" UNIQUE ("access_token");



ALTER TABLE ONLY "public"."client_portal_access"
    ADD CONSTRAINT "client_portal_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_tenant_id_email_key" UNIQUE ("tenant_id", "email");



ALTER TABLE ONLY "public"."invoice_line_items"
    ADD CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sla_rules"
    ADD CONSTRAINT "sla_rules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_client_portal_access_client_id" ON "public"."client_portal_access" USING "btree" ("client_id");



CREATE INDEX "idx_clients_tenant_active" ON "public"."clients" USING "btree" ("tenant_id", "is_active");



CREATE INDEX "idx_clients_tenant_id" ON "public"."clients" USING "btree" ("tenant_id");



CREATE INDEX "idx_invoice_line_items_invoice_id" ON "public"."invoice_line_items" USING "btree" ("invoice_id");



CREATE INDEX "idx_invoices_approval_status" ON "public"."invoices" USING "btree" ("approval_status");



CREATE INDEX "idx_invoices_client_id" ON "public"."invoices" USING "btree" ("client_id");



CREATE INDEX "idx_invoices_created_at" ON "public"."invoices" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_invoices_status" ON "public"."invoices" USING "btree" ("status");



CREATE INDEX "idx_invoices_tenant_id" ON "public"."invoices" USING "btree" ("tenant_id");



CREATE INDEX "idx_invoices_tenant_status" ON "public"."invoices" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_notification_log_tenant_id" ON "public"."notification_log" USING "btree" ("tenant_id");



CREATE INDEX "idx_payment_methods_tenant_id" ON "public"."payment_methods" USING "btree" ("tenant_id");



CREATE INDEX "idx_profiles_tenant_id" ON "public"."profiles" USING "btree" ("tenant_id");



CREATE INDEX "idx_sla_rules_tenant_id" ON "public"."sla_rules" USING "btree" ("tenant_id");



CREATE INDEX "idx_ticket_comments_tenant_id" ON "public"."ticket_comments" USING "btree" ("tenant_id");



CREATE INDEX "idx_ticket_comments_ticket_id" ON "public"."ticket_comments" USING "btree" ("ticket_id");



CREATE INDEX "idx_tickets_client_id" ON "public"."tickets" USING "btree" ("client_id");



CREATE INDEX "idx_tickets_due_date" ON "public"."tickets" USING "btree" ("due_date") WHERE ("due_date" IS NOT NULL);



CREATE INDEX "idx_tickets_status" ON "public"."tickets" USING "btree" ("status");



CREATE INDEX "idx_tickets_tenant_created" ON "public"."tickets" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_tickets_tenant_id" ON "public"."tickets" USING "btree" ("tenant_id");



CREATE INDEX "idx_tickets_tenant_status" ON "public"."tickets" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_time_entries_approval_status" ON "public"."time_entries" USING "btree" ("approval_status");



CREATE INDEX "idx_time_entries_tenant_date" ON "public"."time_entries" USING "btree" ("tenant_id", "entry_date" DESC);



CREATE INDEX "idx_time_entries_tenant_id" ON "public"."time_entries" USING "btree" ("tenant_id");



CREATE INDEX "idx_time_entries_ticket_id" ON "public"."time_entries" USING "btree" ("ticket_id");



CREATE INDEX "idx_time_entries_user_date" ON "public"."time_entries" USING "btree" ("user_id", "entry_date" DESC);



CREATE INDEX "idx_time_entries_user_id" ON "public"."time_entries" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "update_clients_updated_at" BEFORE UPDATE ON "public"."clients" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_invoices_updated_at" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tenants_updated_at" BEFORE UPDATE ON "public"."tenants" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ticket_comments_updated_at" BEFORE UPDATE ON "public"."ticket_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_ticket_hours_on_time_entry_delete" AFTER DELETE ON "public"."time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_ticket_actual_hours"();



CREATE OR REPLACE TRIGGER "update_ticket_hours_on_time_entry_insert" AFTER INSERT ON "public"."time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_ticket_actual_hours"();



CREATE OR REPLACE TRIGGER "update_ticket_hours_on_time_entry_update" AFTER UPDATE ON "public"."time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_ticket_actual_hours"();



CREATE OR REPLACE TRIGGER "update_tickets_updated_at" BEFORE UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_time_entries_updated_at" BEFORE UPDATE ON "public"."time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."client_portal_access"
    ADD CONSTRAINT "client_portal_access_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_line_items"
    ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_line_items"
    ADD CONSTRAINT "invoice_line_items_time_entry_id_fkey" FOREIGN KEY ("time_entry_id") REFERENCES "public"."time_entries"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_log"
    ADD CONSTRAINT "notification_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sla_rules"
    ADD CONSTRAINT "sla_rules_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sla_rules"
    ADD CONSTRAINT "sla_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



CREATE POLICY "Users can manage invoice line items" ON "public"."invoice_line_items" USING (("invoice_id" IN ( SELECT "invoices"."id"
   FROM "public"."invoices"
  WHERE ("invoices"."tenant_id" = ( SELECT "profiles"."tenant_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can manage their tenant's clients" ON "public"."clients" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their tenant's invoices" ON "public"."invoices" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their tenant's payment methods" ON "public"."payment_methods" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their tenant's tickets" ON "public"."tickets" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their tenant's time entries" ON "public"."time_entries" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can manage ticket comments" ON "public"."ticket_comments" USING (("ticket_id" IN ( SELECT "tickets"."id"
   FROM "public"."tickets"
  WHERE ("tickets"."tenant_id" = ( SELECT "profiles"."tenant_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



CREATE POLICY "Users can view their own profile" ON "public"."profiles" USING (("id" = "auth"."uid"()));



CREATE POLICY "Users can view their own tenant" ON "public"."tenants" FOR SELECT USING (("id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."client_portal_access" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "client_portal_access_tenant_policy" ON "public"."client_portal_access" TO "authenticated" USING (("client_id" IN ( SELECT "clients"."id"
   FROM "public"."clients"
  WHERE ("clients"."tenant_id" = ( SELECT "profiles"."tenant_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clients_delete" ON "public"."clients" FOR DELETE TO "authenticated" USING (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "clients_insert" ON "public"."clients" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "clients_policy" ON "public"."clients" TO "authenticated" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "clients_select" ON "public"."clients" FOR SELECT TO "authenticated" USING (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "clients_update" ON "public"."clients" FOR UPDATE TO "authenticated" USING (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."invoice_line_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoice_line_items_tenant_policy" ON "public"."invoice_line_items" TO "authenticated" USING (("invoice_id" IN ( SELECT "invoices"."id"
   FROM "public"."invoices"
  WHERE ("invoices"."tenant_id" = ( SELECT "profiles"."tenant_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"())))))) WITH CHECK (("invoice_id" IN ( SELECT "invoices"."id"
   FROM "public"."invoices"
  WHERE ("invoices"."tenant_id" = ( SELECT "profiles"."tenant_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))));



ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoices_tenant_policy" ON "public"."invoices" TO "authenticated" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."notification_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notification_log_tenant_policy" ON "public"."notification_log" TO "authenticated" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payment_methods_tenant_policy" ON "public"."payment_methods" TO "authenticated" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_own_record" ON "public"."profiles" TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_own_tenant" ON "public"."profiles" TO "authenticated" USING (("tenant_id" = ( SELECT "profiles_1"."tenant_id"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."id" = "auth"."uid"())))) WITH CHECK (("tenant_id" = ( SELECT "profiles_1"."tenant_id"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."id" = "auth"."uid"()))));



ALTER TABLE "public"."sla_rules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sla_rules_tenant_policy" ON "public"."sla_rules" TO "authenticated" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenants_own_tenant" ON "public"."tenants" TO "authenticated" USING (("id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."ticket_comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ticket_comments_delete" ON "public"."ticket_comments" FOR DELETE TO "authenticated" USING (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "ticket_comments_insert" ON "public"."ticket_comments" FOR INSERT TO "authenticated" WITH CHECK (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "ticket_comments_select" ON "public"."ticket_comments" FOR SELECT TO "authenticated" USING (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "ticket_comments_update" ON "public"."ticket_comments" FOR UPDATE TO "authenticated" USING (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("tenant_id" IN ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tickets_policy" ON "public"."tickets" TO "authenticated" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."time_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "time_entries_policy" ON "public"."time_entries" TO "authenticated" USING (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("tenant_id" = ( SELECT "profiles"."tenant_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."create_user_with_tenant"("user_id" "uuid", "user_email" "text", "tenant_name" "text", "first_name" "text", "last_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_user_with_tenant"("user_id" "uuid", "user_email" "text", "tenant_name" "text", "first_name" "text", "last_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_user_with_tenant"("user_id" "uuid", "user_email" "text", "tenant_name" "text", "first_name" "text", "last_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_client_portal_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_client_portal_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_client_portal_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_ticket_actual_hours"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_ticket_actual_hours"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_ticket_actual_hours"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."client_portal_access" TO "anon";
GRANT ALL ON TABLE "public"."client_portal_access" TO "authenticated";
GRANT ALL ON TABLE "public"."client_portal_access" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_line_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_line_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_line_items" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."notification_log" TO "anon";
GRANT ALL ON TABLE "public"."notification_log" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_log" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."sla_rules" TO "anon";
GRANT ALL ON TABLE "public"."sla_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."sla_rules" TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_comments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_comments" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON TABLE "public"."time_entries" TO "anon";
GRANT ALL ON TABLE "public"."time_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."time_entries" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
