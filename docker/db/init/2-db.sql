--
-- PostgreSQL database dump
--

-- Dumped from database version 15.2 (Debian 15.2-1.pgdg110+1)
-- Dumped by pg_dump version 15.2 (Debian 15.2-1.pgdg110+1)

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

--
-- Name: erp; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA erp;


ALTER SCHEMA erp OWNER TO pg_database_owner;

--
-- Name: SCHEMA erp; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA erp IS 'standard erp schema';


--
-- Name: article_display; Type: TYPE; Schema: erp; Owner: postgres
--

CREATE TYPE erp.article_display AS (
	id integer,
	"containerName" character varying,
	"quantityPerContainer" numeric,
	"productName" character varying,
	"stockshapeName" character varying,
	"unitAbbreviation" character varying
);


ALTER TYPE erp.article_display OWNER TO postgres;

--
-- Name: jwt_token; Type: TYPE; Schema: erp; Owner: postgres
--

CREATE TYPE erp.jwt_token AS (
	role character varying,
	user_id integer,
	customer_id integer,
	expiration integer
);


ALTER TYPE erp.jwt_token OWNER TO postgres;

--
-- Name: session_data; Type: TYPE; Schema: erp; Owner: postgres
--

CREATE TYPE erp.session_data AS (
	contact_id integer,
	firstname character varying,
	email character varying,
	role character varying,
	user_id integer,
	lastname character varying
);


ALTER TYPE erp.session_data OWNER TO postgres;

--
-- Name: stock_shape_display; Type: TYPE; Schema: erp; Owner: postgres
--

CREATE TYPE erp.stock_shape_display AS (
	id integer,
	"stockShapeName" character varying,
	"productName" character varying,
	"unitAbbreviation" character varying
);


ALTER TYPE erp.stock_shape_display OWNER TO postgres;

--
-- Name: users_invitation_contact; Type: TYPE; Schema: erp; Owner: postgres
--

CREATE TYPE erp.users_invitation_contact AS (
	id integer,
	role character varying,
	expiration_date timestamp without time zone,
	accepted_date timestamp without time zone,
	email character varying,
	firstname character varying,
	lastname character varying
);


ALTER TYPE erp.users_invitation_contact OWNER TO postgres;

--
-- Name: add_job(text, json, text, timestamp with time zone, integer, text, integer, text[], text); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.add_job(identifier text, payload json DEFAULT NULL::json, queue_name text DEFAULT NULL::text, run_at timestamp with time zone DEFAULT NULL::timestamp with time zone, max_attempts integer DEFAULT NULL::integer, job_key text DEFAULT NULL::text, priority integer DEFAULT NULL::integer, flags text[] DEFAULT NULL::text[], job_key_mode text DEFAULT 'replace'::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
-- 	EXECUTE 'PERFORM worker.add_job(identifier, payload, queue_name, run_at, max_attempts, job_key, priority, flags, job_key_mode);';
 	PERFORM worker.add_job(identifier, payload, queue_name, run_at, max_attempts, job_key, priority, flags, job_key_mode);
END;
$$;


ALTER FUNCTION erp.add_job(identifier text, payload json, queue_name text, run_at timestamp with time zone, max_attempts integer, job_key text, priority integer, flags text[], job_key_mode text) OWNER TO postgres;

--
-- Name: authenticate(character varying, character varying); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.authenticate(login character varying, password character varying) RETURNS erp.jwt_token
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare user_id INTEGER;
declare "role" TEXT;
begin
  select u.id, u.role into user_id, "role"
    from erp.contacts as a left join erp."users" u on a.id = u.contact_id
    where a.email = login and u.password_hash = crypt(password, u.salt);

  if user_id IS NOT NULL then
    return (
      "role",
      user_id,
	  null,
      extract(epoch from now() + interval '1 day')
    )::erp.jwt_token;
  else
    return null;
  end if;
end;
$$;


ALTER FUNCTION erp.authenticate(login character varying, password character varying) OWNER TO postgres;

--
-- Name: change_password(character varying, character varying, integer); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.change_password(current_password character varying, new_password character varying, user_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE new_salt text;
DECLARE updated integer;
BEGIN
	IF current_password = new_password THEN
		RAISE EXCEPTION 'New password must be different from old password';
	END IF;

	UPDATE erp.users SET password_hash = f.hash, salt=f.new_salt
	FROM (SELECT hash, salt as new_salt FROM erp.get_password_hash_salt(new_password)) f WHERE id=user_id AND password_hash = crypt(current_password, salt);
	
	GET DIAGNOSTICS updated = row_count;
	IF updated = 0 THEN
		RAISE EXCEPTION 'Operation failed';
	END IF;
END;
$$;


ALTER FUNCTION erp.change_password(current_password character varying, new_password character varying, user_id integer) OWNER TO postgres;

--
-- Name: create_password_recovery(character varying); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.create_password_recovery(recovery_email character varying) RETURNS character varying
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE now timestamp;
DECLARE code text;
BEGIN

IF (SELECT c.id FROM erp.contacts c INNER JOIN erp.users u ON u.contact_id = c.id WHERE c.email = recovery_email) IS NULL THEN
	RETURN '';
END IF;

SELECT NOW() INTO now;
SELECT array_to_string(array(select substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',((random()*(36-1)+1)::integer),1) FROM generate_series(1,32)),'')
INTO code;

INSERT INTO erp.password_recoveries (email, creation_date, expiration_date, code)
VALUES (recovery_email, now, now + interval '15 minutes', code);

PERFORM add_job('mailPasswordRecovery', json_build_object('email', recovery_email, 'code', code));

RETURN code;

END;$$;


ALTER FUNCTION erp.create_password_recovery(recovery_email character varying) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: sales_schedules; Type: TABLE; Schema: erp; Owner: postgres
--

CREATE TABLE erp.sales_schedules (
    id integer NOT NULL,
    fulfillment_date timestamp with time zone NOT NULL,
    name character varying,
    order_closure_date timestamp with time zone NOT NULL,
    delivery_price money,
    free_delivery_turnover money,
    begin_sales_date timestamp without time zone,
    disabled boolean DEFAULT false NOT NULL
);


ALTER TABLE erp.sales_schedules OWNER TO postgres;

--
-- Name: TABLE sales_schedules; Type: COMMENT; Schema: erp; Owner: postgres
--

COMMENT ON TABLE erp.sales_schedules IS '@omit delete,update';


--
-- Name: create_sales_schedule_with_deps(timestamp without time zone, character varying, timestamp without time zone, money, money, timestamp without time zone, boolean, integer[], integer[]); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.create_sales_schedule_with_deps(fulfillment_date timestamp without time zone, name character varying, order_closure_date timestamp without time zone, delivery_price money, free_delivery_turnover money, begin_sales_date timestamp without time zone, disabled boolean, fulfillment_methods integer[], pricelists integer[]) RETURNS erp.sales_schedules
    LANGUAGE plpgsql
    AS $$
DECLARE ssid INTEGER;
DECLARE res erp.sales_schedules;
BEGIN

IF fulfillment_date < CURRENT_TIMESTAMP OR order_closure_date < CURRENT_TIMESTAMP THEN
	RAISE EXCEPTION 'fulfillment date and order closure date must be in the future';
END IF;

INSERT INTO erp.sales_schedules (fulfillment_date, "name", order_closure_date, delivery_price, free_delivery_turnover, begin_sales_date, disabled)
VALUES (fulfillment_date, name, order_closure_date, delivery_price, free_delivery_turnover, begin_sales_date, disabled)
RETURNING id INTO ssid;

INSERT INTO erp.sales_schedules_pricelists (pricelist_id, sales_schedule_id)
SELECT unnest(pricelists), ssid;

INSERT INTO erp.sales_schedules_fulfillment_methods (fulfillment_method_id, sales_schedule_id)
SELECT unnest(fulfillment_methods), ssid;

SELECT * INTO res FROM erp.sales_schedules WHERE id = ssid;

RETURN res;
END;
$$;


ALTER FUNCTION erp.create_sales_schedule_with_deps(fulfillment_date timestamp without time zone, name character varying, order_closure_date timestamp without time zone, delivery_price money, free_delivery_turnover money, begin_sales_date timestamp without time zone, disabled boolean, fulfillment_methods integer[], pricelists integer[]) OWNER TO postgres;

--
-- Name: users_invitations_id_seq; Type: SEQUENCE; Schema: erp; Owner: postgres
--

CREATE SEQUENCE erp.users_invitations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE erp.users_invitations_id_seq OWNER TO postgres;

--
-- Name: users_invitations; Type: TABLE; Schema: erp; Owner: postgres
--

CREATE TABLE erp.users_invitations (
    id integer DEFAULT nextval('erp.users_invitations_id_seq'::regclass) NOT NULL,
    code character varying NOT NULL,
    role character varying NOT NULL,
    email character varying NOT NULL,
    create_date timestamp without time zone DEFAULT now() NOT NULL,
    expiration_date timestamp without time zone NOT NULL,
    accepted_date timestamp without time zone,
    grantor integer,
    "Invitation_mail_last_sent" timestamp without time zone,
    times_invitation_mail_sent integer DEFAULT 0 NOT NULL
);


ALTER TABLE erp.users_invitations OWNER TO postgres;

--
-- Name: TABLE users_invitations; Type: COMMENT; Schema: erp; Owner: postgres
--

COMMENT ON TABLE erp.users_invitations IS '@omit create,update,delete';


--
-- Name: create_user_invitation(character varying, character varying); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.create_user_invitation(email_invited character varying, role character varying) RETURNS erp.users_invitations
    LANGUAGE plpgsql
    AS $$
DECLARE now timestamp;
DECLARE res erp.users_invitations;
DECLARE code text;
DECLARE user_id integer;
BEGIN
	IF (SELECT "id" FROM erp.contacts WHERE email = email_invited) IS NOT NULL THEN
		RAISE EXCEPTION 'This email is already linked to a contact in the system';
	END IF;
	
	SELECT NOW() INTO now;
	
	SELECT array_to_string(array(select substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',((random()*(36-1)+1)::integer),1) FROM generate_series(1,16)),'')
	INTO code;
	
	SELECT NULLIF(current_setting('jwt.claims.user_id', true), '')::integer INTO user_id;
	
	INSERT INTO erp.users_invitations (code, "role", email, create_date, expiration_date, grantor)
	VALUES ( code, "role", email_invited, now, now + interval '72 hours', user_id )
	RETURNING *;
END;
$$;


ALTER FUNCTION erp.create_user_invitation(email_invited character varying, role character varying) OWNER TO postgres;

--
-- Name: customers; Type: TABLE; Schema: erp; Owner: postgres
--

CREATE TABLE erp.customers (
    id integer NOT NULL,
    slug character varying NOT NULL,
    "pricelistId" integer NOT NULL,
    "eshopAccess" boolean DEFAULT true NOT NULL,
    "contactId" integer,
    "companyId" integer
);


ALTER TABLE erp.customers OWNER TO postgres;

--
-- Name: customer_by_slug(character varying); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.customer_by_slug(slug character varying) RETURNS SETOF erp.customers
    LANGUAGE sql STABLE STRICT
    AS $$SELECT *
FROM erp.customers
WHERE customers.slug = customer_by_slug.slug$$;


ALTER FUNCTION erp.customer_by_slug(slug character varying) OWNER TO postgres;

--
-- Name: demote_user(integer); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.demote_user(user_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$BEGIN
	IF (SELECT id FROM erp.users WHERE id = user_id) IS NULL THEN
		RAISE EXCEPTION 'User not found';
	END IF;
	IF (SELECT COUNT(*) FROM erp.users WHERE role = 'administrator') = 1 AND (SELECT "role" FROM erp.users WHERE id = user_id) = 'administrator' THEN
		RAISE EXCEPTION 'Cannot remove the last admin';
	END IF;
	
	DELETE FROM erp.users WHERE id = user_id;
END;$$;


ALTER FUNCTION erp.demote_user(user_id integer) OWNER TO postgres;

--
-- Name: filter_articles(character varying); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.filter_articles(search_term character varying) RETURNS SETOF erp.article_display
    LANGUAGE sql STABLE
    AS $$
SELECT a.id, c.name as containerName, a."quantityPerContainer", p.name as productName, ss.name as stockshapeName, u.abbreviation as unitAbbreviation
FROM erp.articles a
INNER JOIN containers c ON a."containerId" = c.id
INNER JOIN stock_shapes ss ON a."stockShapeId" = ss.id
INNER JOIN products p ON ss."productId" = p.id
INNER JOIN units u ON ss."unitId" = u.id
WHERE ss.name ILIKE '%' || search_term || '%' OR p.name ILIKE '%' || search_term || '%' OR c.name ILIKE '%' || search_term || '%'
$$;


ALTER FUNCTION erp.filter_articles(search_term character varying) OWNER TO postgres;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: erp; Owner: postgres
--

CREATE SEQUENCE erp.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE erp.companies_id_seq OWNER TO postgres;

--
-- Name: companies; Type: TABLE; Schema: erp; Owner: postgres
--

CREATE TABLE erp.companies (
    id integer DEFAULT nextval('erp.companies_id_seq'::regclass) NOT NULL,
    name character varying NOT NULL,
    "addressLine1" character varying,
    "addressLine2" character varying,
    "companyNumber" character varying,
    "zipCode" character varying,
    city character varying,
    "mainContactId" integer
);


ALTER TABLE erp.companies OWNER TO postgres;

--
-- Name: filter_companies(character varying); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.filter_companies(search_term character varying) RETURNS SETOF erp.companies
    LANGUAGE sql STABLE
    AS $$
  select companies.*
  from erp.companies
  where name ilike '%' || search_term || '%' or "companyNumber" ilike '%' || search_term || '%'
  order by name, "companyNumber"
  fetch next 40 rows only
$$;


ALTER FUNCTION erp.filter_companies(search_term character varying) OWNER TO postgres;

--
-- Name: contacts; Type: TABLE; Schema: erp; Owner: postgres
--

CREATE TABLE erp.contacts (
    id integer NOT NULL,
    firstname character varying,
    lastname character varying NOT NULL,
    email character varying,
    phone character varying,
    "addressLine1" character varying,
    "addressLine2" character varying,
    "zipCode" character varying,
    city character varying,
    "companyId" integer
);


ALTER TABLE erp.contacts OWNER TO postgres;

--
-- Name: filter_contacts(character varying); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.filter_contacts(search_term character varying) RETURNS SETOF erp.contacts
    LANGUAGE sql STABLE
    AS $$
  select contacts.*
  from erp.contacts
  where "lastname" ilike '%' || search_term || '%' or "firstname" ilike '%' || search_term || '%'
  order by "lastname", "firstname"
  fetch next 40 rows only
$$;


ALTER FUNCTION erp.filter_contacts(search_term character varying) OWNER TO postgres;

--
-- Name: containers; Type: TABLE; Schema: erp; Owner: postgres
--

CREATE TABLE erp.containers (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying NOT NULL
);


ALTER TABLE erp.containers OWNER TO postgres;

--
-- Name: filter_containers(character varying); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.filter_containers(search_term character varying) RETURNS SETOF erp.containers
    LANGUAGE sql STABLE
    AS $$  select containers.*
  from erp.containers
  where name ilike search_term || '%'$$;


ALTER FUNCTION erp.filter_containers(search_term character varying) OWNER TO postgres;

--
-- Name: pricelists; Type: TABLE; Schema: erp; Owner: postgres
--

CREATE TABLE erp.pricelists (
    id integer NOT NULL,
    name character varying NOT NULL,
    "vatIncluded" boolean DEFAULT false NOT NULL
);


ALTER TABLE erp.pricelists OWNER TO postgres;

--
-- Name: filter_pricelists(character varying); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.filter_pricelists(search_term character varying) RETURNS SETOF erp.pricelists
    LANGUAGE sql STABLE
    AS $$
SELECT id, name, "vatIncluded"
FROM erp.priceLists
WHERE name ILIKE '%' || search_term || '%'
$$;


ALTER FUNCTION erp.filter_pricelists(search_term character varying) OWNER TO postgres;

--
-- Name: products; Type: TABLE; Schema: erp; Owner: postgres
--

CREATE TABLE erp.products (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    "parentProduct" integer
);


ALTER TABLE erp.products OWNER TO postgres;

--
-- Name: filter_products(character varying); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.filter_products(search_term character varying) RETURNS SETOF erp.products
    LANGUAGE sql STABLE
    AS $$
  select products.*
  from erp.products
  where name ilike search_term || '%'
$$;


ALTER FUNCTION erp.filter_products(search_term character varying) OWNER TO postgres;

--
-- Name: filter_stockshapes(character varying); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.filter_stockshapes(search_term character varying) RETURNS SETOF erp.stock_shape_display
    LANGUAGE sql STABLE
    AS $$SELECT ss.id, ss.name, p.name as productName, u.abbreviation as unitAbbreviation
FROM erp.stock_shapes ss
INNER JOIN erp.products p ON ss."productId" = p.id
INNER JOIN erp.units u ON ss."unitId" = u.id
WHERE ss.name ILIKE '%' || search_term || '%' OR p.name ILIKE '%' || search_term || '%'$$;


ALTER FUNCTION erp.filter_stockshapes(search_term character varying) OWNER TO postgres;

--
-- Name: units; Type: TABLE; Schema: erp; Owner: postgres
--

CREATE TABLE erp.units (
    id integer NOT NULL,
    name character varying NOT NULL,
    abbreviation character varying NOT NULL
);


ALTER TABLE erp.units OWNER TO postgres;

--
-- Name: filter_units(character varying); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.filter_units(search_term character varying) RETURNS SETOF erp.units
    LANGUAGE sql STABLE
    AS $$  select units.*
  from erp.units
  where name ilike search_term || '%'$$;


ALTER FUNCTION erp.filter_units(search_term character varying) OWNER TO postgres;

--
-- Name: get_current_user(); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.get_current_user() RETURNS erp.contacts
    LANGUAGE sql STABLE
    AS $$SELECT * FROM erp.contacts WHERE id=
(SELECT contact_id FROM erp.users WHERE id =
(SELECT NULLIF(current_setting('jwt.claims.user_id', true), '')::integer)
)$$;


ALTER FUNCTION erp.get_current_user() OWNER TO postgres;

--
-- Name: get_password_hash_salt(character varying); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.get_password_hash_salt(password character varying, OUT hash character varying, OUT salt character varying) RETURNS record
    LANGUAGE plpgsql
    AS $$BEGIN
	IF LENGTH(password) < 8 OR regexp_count(password, '[A-Z0-9]') = 0 OR regexp_count(password, '[^\w]') = 0 THEN
		RAISE EXCEPTION 'Password must be minimum 8 characters long, contain at least one capitalized letter or number, and contain at least one non-alphanumeric character';
	END IF;
	
	SELECT gen_salt('md5') INTO salt;
	SELECT crypt(password, salt) INTO hash;
END;$$;


ALTER FUNCTION erp.get_password_hash_salt(password character varying, OUT hash character varying, OUT salt character varying) OWNER TO postgres;

--
-- Name: get_session_data(); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.get_session_data() RETURNS erp.session_data
    LANGUAGE sql STABLE
    AS $$
SELECT ct.id, ct.firstname, ct.email, u.role, u.id, ct.lastname
FROM erp.users u INNER JOIN erp.contacts ct ON u.contact_id = ct.id
WHERE u.id = (SELECT NULLIF(current_setting('jwt.claims.user_id', true), '')::integer)
$$;


ALTER FUNCTION erp.get_session_data() OWNER TO postgres;

--
-- Name: password_recoveries; Type: TABLE; Schema: erp; Owner: postgres
--

CREATE TABLE erp.password_recoveries (
    id integer NOT NULL,
    email character varying NOT NULL,
    creation_date timestamp without time zone DEFAULT now() NOT NULL,
    expiration_date timestamp without time zone NOT NULL,
    code character varying NOT NULL,
    recovery_date timestamp without time zone
);


ALTER TABLE erp.password_recoveries OWNER TO postgres;

--
-- Name: TABLE password_recoveries; Type: COMMENT; Schema: erp; Owner: postgres
--

COMMENT ON TABLE erp.password_recoveries IS '@omit create,update,delete,read,all,many';


--
-- Name: password_recovery_by_code(character varying); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.password_recovery_by_code(recovery_code character varying) RETURNS erp.password_recoveries
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$DECLARE res erp.password_recoveries;
BEGIN
	SELECT * FROM erp.password_recoveries 
	INTO res
	WHERE code = recovery_code;
	
	IF res IS NULL THEN
		RAISE EXCEPTION 'Invalid code';
	ELSE
		RETURN res;
	END IF;
END;$$;


ALTER FUNCTION erp.password_recovery_by_code(recovery_code character varying) OWNER TO postgres;

--
-- Name: promote_user(character varying, character varying); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.promote_user(email_invited character varying, role character varying) RETURNS erp.users_invitations
    LANGUAGE plpgsql
    AS $$
DECLARE now timestamp;
DECLARE res erp.users_invitations;
DECLARE code text;
DECLARE user_id integer;
DECLARE contact_id integer;
BEGIN
	SELECT contacts.id FROM erp.users INNER JOIN erp.contacts ON users.contact_id = contacts.id WHERE email = email_invited
	INTO contact_id;
	IF contact_id IS NOT NULL THEN
		INSERT INTO erp.users (contact_id, "role")
		VALUES (contact_id, "role");
		
		RETURN NULL;
	ELSE
		SELECT NOW() INTO now;
	
		SELECT array_to_string(array(select substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',((random()*(36-1)+1)::integer),1) FROM generate_series(1,16)),'')
		INTO code;

		SELECT NULLIF(current_setting('jwt.claims.user_id', true), '')::integer INTO user_id;

		INSERT INTO erp.users_invitations (code, "role", email, create_date, expiration_date, grantor)
		VALUES ( code, "role", email_invited, now, now + interval '72 hours', user_id )
		RETURNING * INTO res;
		
		PERFORM erp.add_job('mailInviteAdmin', json_build_object('email', email_invited, 'code', code));
		
		RETURN res;
	END IF;
END;
$$;


ALTER FUNCTION erp.promote_user(email_invited character varying, role character varying) OWNER TO postgres;

--
-- Name: recover_password(character varying, character varying); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.recover_password(recovery_code character varying, new_password character varying) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE recovery_id integer;
DECLARE recovery_email text;
BEGIN
	SELECT id FROM erp.password_recoveries
	INTO recovery_id
	WHERE code = recovery_code;
	
	IF recovery_id IS NULL THEN
		RAISE EXCEPTION 'Failure';
	END IF;
	IF (SELECT expiration_date FROM erp.password_recoveries WHERE code = recovery_code) < NOW() THEN
		RAISE EXCEPTION 'Expired';
	END IF;
	
	UPDATE erp.password_recoveries SET recovery_date = NOW()
	WHERE code = recovery_code
	RETURNING email INTO recovery_email;
	
	UPDATE erp.users SET password_hash = f.hash, salt = f.salt
	FROM erp.get_password_hash_salt(new_password) f
	WHERE contact_id = (SELECT id FROM erp.contacts Where email = recovery_email);
END;$$;


ALTER FUNCTION erp.recover_password(recovery_code character varying, new_password character varying) OWNER TO postgres;

--
-- Name: register_user(character varying, character varying, integer, character varying); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.register_user(updated_firstname character varying, updated_lastname character varying, invitation_id integer, password character varying) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare invite erp.users_invitations;
declare cid INTEGER;
begin
	SELECT * INTO invite
	FROM erp.users_invitations
	WHERE id = invitation_id;
	
	IF invite.accepted_date IS NOT NULL THEN
		RAISE EXCEPTION 'Invitation invalid';
	ELSE
		IF invite.expiration_date < NOW() THEN
			RAISE EXCEPTION 'Invitation expired';
		END IF;
	END IF;
	
	SELECT id INTO cid
	FROM erp.contacts 
	WHERE email = invite.email;
	
	IF cid IS NULL THEN
		INSERT INTO erp.contacts(
			firstname, lastname, email)
			VALUES (updated_firstname, updated_lastname, invite.email)
		RETURNING id INTO cid;
	ELSE
		UPDATE erp.contacts
		SET firstname = updated_firstname, lastname = updated_lastname
		WHERE id = cid;
	END IF;
	
	INSERT INTO erp.users(contact_id, "role", password_hash, salt)
	SELECT cid, invite.role, hash, salt FROM erp.get_password_hash_salt(password);
	
	UPDATE erp.users_invitations SET accepted_date = NOW()
	WHERE id = invitation_id;
end;
$$;


ALTER FUNCTION erp.register_user(updated_firstname character varying, updated_lastname character varying, invitation_id integer, password character varying) OWNER TO postgres;

--
-- Name: update_sales_schedule_with_deps(integer, timestamp without time zone, character varying, timestamp without time zone, money, money, timestamp without time zone, boolean, integer[], integer[]); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.update_sales_schedule_with_deps(ssid integer, pfulfillment_date timestamp without time zone, pname character varying, porder_closure_date timestamp without time zone, pdelivery_price money, pfree_delivery_turnover money, pbegin_sales_date timestamp without time zone, pdisabled boolean, pfulfillment_methods integer[], ppricelists integer[]) RETURNS erp.sales_schedules
    LANGUAGE plpgsql
    AS $$
DECLARE res erp.sales_schedules;
BEGIN

IF pbegin_sales_date IS NULL THEN
	--Ignore any change other than enabling/disabling the sales schedule
	UPDATE erp.sales_schedules
	SET disabled=pdisabled
	WHERE id=ssid;
END IF;

IF pfulfillment_date < CURRENT_TIMESTAMP OR porder_closure_date < CURRENT_TIMESTAMP THEN
	RAISE EXCEPTION 'fulfillment date and order closure date must be in the future';
END IF;

UPDATE erp.sales_schedules
SET fulfillment_date=pfulfillment_date, "name"=pname, 
	order_closure_date=porder_closure_date, delivery_price=pdelivery_price,
	free_delivery_turnover=pfree_delivery_turnover, begin_sales_date=pbegin_sales_date,
	disabled=pdisabled
WHERE id=ssid;

DELETE FROM erp.sales_schedules_pricelists WHERE sales_schedule_id=ssid;
INSERT INTO erp.sales_schedules_pricelists (pricelist_id, sales_schedule_id)
SELECT unnest(ppricelists), ssid;

DELETE FROM erp.sales_schedules_fulfillment_methods WHERE sales_schedule_id=ssid;
INSERT INTO erp.sales_schedules_fulfillment_methods (fulfillment_method_id, sales_schedule_id)
SELECT unnest(pfulfillment_methods), ssid;

SELECT * INTO res FROM erp.sales_schedules WHERE id = ssid;

RETURN res;
END;
$$;


ALTER FUNCTION erp.update_sales_schedule_with_deps(ssid integer, pfulfillment_date timestamp without time zone, pname character varying, porder_closure_date timestamp without time zone, pdelivery_price money, pfree_delivery_turnover money, pbegin_sales_date timestamp without time zone, pdisabled boolean, pfulfillment_methods integer[], ppricelists integer[]) OWNER TO postgres;

--
-- Name: users_invitation_contact_by_code(character varying); Type: FUNCTION; Schema: erp; Owner: postgres
--

CREATE FUNCTION erp.users_invitation_contact_by_code(invitation_code character varying) RETURNS erp.users_invitation_contact
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE res erp.users_invitation_contact;
BEGIN
	SELECT i.id, i.role, i.expiration_date, i.accepted_date, i.email, c.firstname, c.lastname
	FROM erp.users_invitations i LEFT JOIN erp.contacts c ON c.email = i.email
	INTO res
	WHERE i.code = invitation_code;
	
	RETURN res;
END;
$$;


ALTER FUNCTION erp.users_invitation_contact_by_code(invitation_code character varying) OWNER TO postgres;

--
-- Name: articles; Type: TABLE; Schema: erp; Owner: postgres
--

CREATE TABLE erp.articles (
    id integer NOT NULL,
    "stockShapeId" integer NOT NULL,
    "containerId" integer NOT NULL,
    "quantityPerContainer" numeric NOT NULL
);


ALTER TABLE erp.articles OWNER TO postgres;

--
-- Name: articles_id_seq; Type: SEQUENCE; Schema: erp; Owner: postgres
--

CREATE SEQUENCE erp.articles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE erp.articles_id_seq OWNER TO postgres;

--
-- Name: articles_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: postgres
--

ALTER SEQUENCE erp.articles_id_seq OWNED BY erp.articles.id;


--
-- Name: articles_prices; Type: TABLE; Schema: erp; Owner: postgres
--

CREATE TABLE erp.articles_prices (
    id integer NOT NULL,
    "articleId" integer NOT NULL,
    "priceListId" integer NOT NULL,
    price money NOT NULL
);


ALTER TABLE erp.articles_prices OWNER TO postgres;

--
-- Name: contacts_id_seq; Type: SEQUENCE; Schema: erp; Owner: postgres
--

CREATE SEQUENCE erp.contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE erp.contacts_id_seq OWNER TO postgres;

--
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: postgres
--

ALTER SEQUENCE erp.contacts_id_seq OWNED BY erp.contacts.id;


--
-- Name: containers_id_seq; Type: SEQUENCE; Schema: erp; Owner: postgres
--

CREATE SEQUENCE erp.containers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE erp.containers_id_seq OWNER TO postgres;

--
-- Name: containers_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: postgres
--

ALTER SEQUENCE erp.containers_id_seq OWNED BY erp.containers.id;


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: erp; Owner: postgres
--

CREATE SEQUENCE erp.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE erp.customers_id_seq OWNER TO postgres;

--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: postgres
--

ALTER SEQUENCE erp.customers_id_seq OWNED BY erp.customers.id;


--
-- Name: fulfillment_methods; Type: TABLE; Schema: erp; Owner: postgres
--

CREATE TABLE erp.fulfillment_methods (
    id integer NOT NULL,
    name character varying NOT NULL,
    needs_pickup_address boolean NOT NULL,
    needs_customer_address boolean NOT NULL
);


ALTER TABLE erp.fulfillment_methods OWNER TO postgres;

--
-- Name: fulfillment_method_id_seq; Type: SEQUENCE; Schema: erp; Owner: postgres
--

CREATE SEQUENCE erp.fulfillment_method_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE erp.fulfillment_method_id_seq OWNER TO postgres;

--
-- Name: fulfillment_method_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: postgres
--

ALTER SEQUENCE erp.fulfillment_method_id_seq OWNED BY erp.fulfillment_methods.id;


--
-- Name: password_recoveries_id_seq; Type: SEQUENCE; Schema: erp; Owner: postgres
--

CREATE SEQUENCE erp.password_recoveries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE erp.password_recoveries_id_seq OWNER TO postgres;

--
-- Name: password_recoveries_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: postgres
--

ALTER SEQUENCE erp.password_recoveries_id_seq OWNED BY erp.password_recoveries.id;


--
-- Name: pricelists_id_seq; Type: SEQUENCE; Schema: erp; Owner: postgres
--

CREATE SEQUENCE erp.pricelists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE erp.pricelists_id_seq OWNER TO postgres;

--
-- Name: pricelists_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: postgres
--

ALTER SEQUENCE erp.pricelists_id_seq OWNED BY erp.pricelists.id;


--
-- Name: product_prices_id_seq; Type: SEQUENCE; Schema: erp; Owner: postgres
--

CREATE SEQUENCE erp.product_prices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE erp.product_prices_id_seq OWNER TO postgres;

--
-- Name: product_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: postgres
--

ALTER SEQUENCE erp.product_prices_id_seq OWNED BY erp.articles_prices.id;


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: erp; Owner: postgres
--

CREATE SEQUENCE erp.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE erp.products_id_seq OWNER TO postgres;

--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: postgres
--

ALTER SEQUENCE erp.products_id_seq OWNED BY erp.products.id;


--
-- Name: sales_schedules_fulfillment_methods; Type: TABLE; Schema: erp; Owner: postgres
--

CREATE TABLE erp.sales_schedules_fulfillment_methods (
    sales_schedule_id integer NOT NULL,
    fulfillment_method_id integer NOT NULL
);


ALTER TABLE erp.sales_schedules_fulfillment_methods OWNER TO postgres;

--
-- Name: sales_schedules_id_seq; Type: SEQUENCE; Schema: erp; Owner: postgres
--

CREATE SEQUENCE erp.sales_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE erp.sales_schedules_id_seq OWNER TO postgres;

--
-- Name: sales_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: postgres
--

ALTER SEQUENCE erp.sales_schedules_id_seq OWNED BY erp.sales_schedules.id;


--
-- Name: sales_schedules_pricelists; Type: TABLE; Schema: erp; Owner: postgres
--

CREATE TABLE erp.sales_schedules_pricelists (
    pricelist_id integer NOT NULL,
    sales_schedule_id integer NOT NULL
);


ALTER TABLE erp.sales_schedules_pricelists OWNER TO postgres;

--
-- Name: settings_id_seq; Type: SEQUENCE; Schema: erp; Owner: postgres
--

CREATE SEQUENCE erp.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE erp.settings_id_seq OWNER TO postgres;

--
-- Name: settings; Type: TABLE; Schema: erp; Owner: postgres
--

CREATE TABLE erp.settings (
    "ownerId" integer NOT NULL,
    id integer DEFAULT nextval('erp.settings_id_seq'::regclass) NOT NULL
);


ALTER TABLE erp.settings OWNER TO postgres;

--
-- Name: stock_shapes; Type: TABLE; Schema: erp; Owner: postgres
--

CREATE TABLE erp.stock_shapes (
    id integer NOT NULL,
    name character varying NOT NULL,
    "productId" integer NOT NULL,
    "unitId" integer NOT NULL,
    "inStock" numeric DEFAULT 0 NOT NULL
);


ALTER TABLE erp.stock_shapes OWNER TO postgres;

--
-- Name: stock_shapes_id_seq; Type: SEQUENCE; Schema: erp; Owner: postgres
--

CREATE SEQUENCE erp.stock_shapes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE erp.stock_shapes_id_seq OWNER TO postgres;

--
-- Name: stock_shapes_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: postgres
--

ALTER SEQUENCE erp.stock_shapes_id_seq OWNED BY erp.stock_shapes.id;


--
-- Name: units_id_seq; Type: SEQUENCE; Schema: erp; Owner: postgres
--

CREATE SEQUENCE erp.units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE erp.units_id_seq OWNER TO postgres;

--
-- Name: units_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: postgres
--

ALTER SEQUENCE erp.units_id_seq OWNED BY erp.units.id;


--
-- Name: users; Type: TABLE; Schema: erp; Owner: postgres
--

CREATE TABLE erp.users (
    id integer NOT NULL,
    contact_id integer NOT NULL,
    role character varying NOT NULL,
    password_hash character varying NOT NULL,
    salt character varying NOT NULL
);


ALTER TABLE erp.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: erp; Owner: postgres
--

CREATE SEQUENCE erp.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE erp.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: erp; Owner: postgres
--

ALTER SEQUENCE erp.users_id_seq OWNED BY erp.users.id;


--
-- Name: articles id; Type: DEFAULT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.articles ALTER COLUMN id SET DEFAULT nextval('erp.articles_id_seq'::regclass);


--
-- Name: articles_prices id; Type: DEFAULT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.articles_prices ALTER COLUMN id SET DEFAULT nextval('erp.product_prices_id_seq'::regclass);


--
-- Name: contacts id; Type: DEFAULT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.contacts ALTER COLUMN id SET DEFAULT nextval('erp.contacts_id_seq'::regclass);


--
-- Name: containers id; Type: DEFAULT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.containers ALTER COLUMN id SET DEFAULT nextval('erp.containers_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.customers ALTER COLUMN id SET DEFAULT nextval('erp.customers_id_seq'::regclass);


--
-- Name: fulfillment_methods id; Type: DEFAULT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.fulfillment_methods ALTER COLUMN id SET DEFAULT nextval('erp.fulfillment_method_id_seq'::regclass);


--
-- Name: password_recoveries id; Type: DEFAULT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.password_recoveries ALTER COLUMN id SET DEFAULT nextval('erp.password_recoveries_id_seq'::regclass);


--
-- Name: pricelists id; Type: DEFAULT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.pricelists ALTER COLUMN id SET DEFAULT nextval('erp.pricelists_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.products ALTER COLUMN id SET DEFAULT nextval('erp.products_id_seq'::regclass);


--
-- Name: sales_schedules id; Type: DEFAULT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.sales_schedules ALTER COLUMN id SET DEFAULT nextval('erp.sales_schedules_id_seq'::regclass);


--
-- Name: stock_shapes id; Type: DEFAULT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.stock_shapes ALTER COLUMN id SET DEFAULT nextval('erp.stock_shapes_id_seq'::regclass);


--
-- Name: units id; Type: DEFAULT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.units ALTER COLUMN id SET DEFAULT nextval('erp.units_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.users ALTER COLUMN id SET DEFAULT nextval('erp.users_id_seq'::regclass);


--
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: containers containers_pkey; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.containers
    ADD CONSTRAINT containers_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: fulfillment_methods fulfillment_method_pkey; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.fulfillment_methods
    ADD CONSTRAINT fulfillment_method_pkey PRIMARY KEY (id);


--
-- Name: password_recoveries password_recoveries_pkey; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.password_recoveries
    ADD CONSTRAINT password_recoveries_pkey PRIMARY KEY (id);


--
-- Name: pricelists pricelists_pkey; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.pricelists
    ADD CONSTRAINT pricelists_pkey PRIMARY KEY (id);


--
-- Name: articles_prices product_prices_pkey; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.articles_prices
    ADD CONSTRAINT product_prices_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: sales_schedules_fulfillment_methods sales_schedules_fulfillment_methods_pkey; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.sales_schedules_fulfillment_methods
    ADD CONSTRAINT sales_schedules_fulfillment_methods_pkey PRIMARY KEY (sales_schedule_id, fulfillment_method_id);


--
-- Name: sales_schedules sales_schedules_pkey; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.sales_schedules
    ADD CONSTRAINT sales_schedules_pkey PRIMARY KEY (id);


--
-- Name: sales_schedules_pricelists sales_schedules_pricelists_pkey; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.sales_schedules_pricelists
    ADD CONSTRAINT sales_schedules_pricelists_pkey PRIMARY KEY (pricelist_id, sales_schedule_id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: stock_shapes stock_shapes_pkey; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.stock_shapes
    ADD CONSTRAINT stock_shapes_pkey PRIMARY KEY (id);


--
-- Name: articles_prices unique_articlesprices_articlepricelist; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.articles_prices
    ADD CONSTRAINT unique_articlesprices_articlepricelist UNIQUE ("articleId", "priceListId");


--
-- Name: companies unique_companyNumber; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.companies
    ADD CONSTRAINT "unique_companyNumber" UNIQUE ("companyNumber");


--
-- Name: contacts unique_contacts_email; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.contacts
    ADD CONSTRAINT unique_contacts_email UNIQUE (email);


--
-- Name: users unique_role; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.users
    ADD CONSTRAINT unique_role UNIQUE (contact_id, role);


--
-- Name: users_invitations unique_users_invitations_code; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.users_invitations
    ADD CONSTRAINT unique_users_invitations_code UNIQUE (code);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: users_invitations users_invitations_pkey; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.users_invitations
    ADD CONSTRAINT users_invitations_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: fki_fk_article_container; Type: INDEX; Schema: erp; Owner: postgres
--

CREATE INDEX fki_fk_article_container ON erp.articles USING btree ("containerId");


--
-- Name: fki_fk_article_stockshape; Type: INDEX; Schema: erp; Owner: postgres
--

CREATE INDEX fki_fk_article_stockshape ON erp.articles USING btree ("stockShapeId");


--
-- Name: fki_fk_articlesPrice_pricelists; Type: INDEX; Schema: erp; Owner: postgres
--

CREATE INDEX "fki_fk_articlesPrice_pricelists" ON erp.articles_prices USING btree ("priceListId");


--
-- Name: fki_fk_companies_contact; Type: INDEX; Schema: erp; Owner: postgres
--

CREATE INDEX fki_fk_companies_contact ON erp.companies USING btree ("mainContactId");


--
-- Name: fki_fk_companies_contacts; Type: INDEX; Schema: erp; Owner: postgres
--

CREATE INDEX fki_fk_companies_contacts ON erp.contacts USING btree ("companyId");


--
-- Name: fki_fk_product_product; Type: INDEX; Schema: erp; Owner: postgres
--

CREATE INDEX fki_fk_product_product ON erp.products USING btree ("parentProduct");


--
-- Name: fki_fk_sales_schedules_fulfillment_methods_fulfillment_method; Type: INDEX; Schema: erp; Owner: postgres
--

CREATE INDEX fki_fk_sales_schedules_fulfillment_methods_fulfillment_method ON erp.sales_schedules_fulfillment_methods USING btree (fulfillment_method_id);


--
-- Name: fki_fk_sales_schedules_fulfillment_methods_sales_schedule; Type: INDEX; Schema: erp; Owner: postgres
--

CREATE INDEX fki_fk_sales_schedules_fulfillment_methods_sales_schedule ON erp.sales_schedules_fulfillment_methods USING btree (sales_schedule_id);


--
-- Name: fki_fk_sales_schedules_pricelists_pricelists; Type: INDEX; Schema: erp; Owner: postgres
--

CREATE INDEX fki_fk_sales_schedules_pricelists_pricelists ON erp.sales_schedules_pricelists USING btree (pricelist_id);


--
-- Name: fki_fk_sales_schedules_pricelists_sales_schedules; Type: INDEX; Schema: erp; Owner: postgres
--

CREATE INDEX fki_fk_sales_schedules_pricelists_sales_schedules ON erp.sales_schedules_pricelists USING btree (sales_schedule_id);


--
-- Name: fki_fk_settings_companies; Type: INDEX; Schema: erp; Owner: postgres
--

CREATE INDEX fki_fk_settings_companies ON erp.settings USING btree ("ownerId");


--
-- Name: fki_fk_stock_shapes_products; Type: INDEX; Schema: erp; Owner: postgres
--

CREATE INDEX fki_fk_stock_shapes_products ON erp.stock_shapes USING btree ("productId");


--
-- Name: fki_fk_stock_shapes_units; Type: INDEX; Schema: erp; Owner: postgres
--

CREATE INDEX fki_fk_stock_shapes_units ON erp.stock_shapes USING btree ("unitId");


--
-- Name: fki_fk_users_contacts; Type: INDEX; Schema: erp; Owner: postgres
--

CREATE INDEX fki_fk_users_contacts ON erp.users USING btree (contact_id);


--
-- Name: fki_fk_users_invitations_contacts; Type: INDEX; Schema: erp; Owner: postgres
--

CREATE INDEX fki_fk_users_invitations_contacts ON erp.users_invitations USING btree (grantor);


--
-- Name: articles fk_article_container; Type: FK CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.articles
    ADD CONSTRAINT fk_article_container FOREIGN KEY ("containerId") REFERENCES erp.containers(id) NOT VALID;


--
-- Name: articles fk_article_stockshape; Type: FK CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.articles
    ADD CONSTRAINT fk_article_stockshape FOREIGN KEY ("stockShapeId") REFERENCES erp.stock_shapes(id) NOT VALID;


--
-- Name: articles_prices fk_articles_prices_articles; Type: FK CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.articles_prices
    ADD CONSTRAINT fk_articles_prices_articles FOREIGN KEY ("articleId") REFERENCES erp.articles(id) NOT VALID;


--
-- Name: articles_prices fk_articles_prices_pricelists; Type: FK CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.articles_prices
    ADD CONSTRAINT fk_articles_prices_pricelists FOREIGN KEY ("priceListId") REFERENCES erp.pricelists(id) NOT VALID;


--
-- Name: companies fk_companies_contact; Type: FK CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.companies
    ADD CONSTRAINT fk_companies_contact FOREIGN KEY ("mainContactId") REFERENCES erp.contacts(id) NOT VALID;


--
-- Name: contacts fk_companies_contacts; Type: FK CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.contacts
    ADD CONSTRAINT fk_companies_contacts FOREIGN KEY ("companyId") REFERENCES erp.companies(id) NOT VALID;


--
-- Name: customers fk_customer_priceList; Type: FK CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.customers
    ADD CONSTRAINT "fk_customer_priceList" FOREIGN KEY ("pricelistId") REFERENCES erp.pricelists(id) NOT VALID;


--
-- Name: products fk_product_product; Type: FK CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.products
    ADD CONSTRAINT fk_product_product FOREIGN KEY ("parentProduct") REFERENCES erp.products(id) NOT VALID;


--
-- Name: sales_schedules_fulfillment_methods fk_sales_schedules_fulfillment_methods_fulfillment_method; Type: FK CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.sales_schedules_fulfillment_methods
    ADD CONSTRAINT fk_sales_schedules_fulfillment_methods_fulfillment_method FOREIGN KEY (fulfillment_method_id) REFERENCES erp.fulfillment_methods(id);


--
-- Name: sales_schedules_fulfillment_methods fk_sales_schedules_fulfillment_methods_sales_schedule; Type: FK CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.sales_schedules_fulfillment_methods
    ADD CONSTRAINT fk_sales_schedules_fulfillment_methods_sales_schedule FOREIGN KEY (sales_schedule_id) REFERENCES erp.sales_schedules(id);


--
-- Name: sales_schedules_pricelists fk_sales_schedules_pricelists_pricelists; Type: FK CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.sales_schedules_pricelists
    ADD CONSTRAINT fk_sales_schedules_pricelists_pricelists FOREIGN KEY (pricelist_id) REFERENCES erp.pricelists(id) NOT VALID;


--
-- Name: sales_schedules_pricelists fk_sales_schedules_pricelists_sales_schedules; Type: FK CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.sales_schedules_pricelists
    ADD CONSTRAINT fk_sales_schedules_pricelists_sales_schedules FOREIGN KEY (sales_schedule_id) REFERENCES erp.sales_schedules(id) NOT VALID;


--
-- Name: settings fk_settings_companies; Type: FK CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.settings
    ADD CONSTRAINT fk_settings_companies FOREIGN KEY ("ownerId") REFERENCES erp.companies(id) NOT VALID;


--
-- Name: stock_shapes fk_stock_shapes_products; Type: FK CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.stock_shapes
    ADD CONSTRAINT fk_stock_shapes_products FOREIGN KEY ("productId") REFERENCES erp.products(id) NOT VALID;


--
-- Name: stock_shapes fk_stock_shapes_units; Type: FK CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.stock_shapes
    ADD CONSTRAINT fk_stock_shapes_units FOREIGN KEY ("unitId") REFERENCES erp.units(id) NOT VALID;


--
-- Name: users fk_users_contacts; Type: FK CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.users
    ADD CONSTRAINT fk_users_contacts FOREIGN KEY (contact_id) REFERENCES erp.contacts(id) NOT VALID;


--
-- Name: users_invitations fk_users_invitations_users; Type: FK CONSTRAINT; Schema: erp; Owner: postgres
--

ALTER TABLE ONLY erp.users_invitations
    ADD CONSTRAINT fk_users_invitations_users FOREIGN KEY (grantor) REFERENCES erp.users(id) NOT VALID;


--
-- Name: SCHEMA erp; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA erp TO anonymous;
GRANT USAGE ON SCHEMA erp TO administrator;


--
-- Name: FUNCTION authenticate(login character varying, password character varying); Type: ACL; Schema: erp; Owner: postgres
--

GRANT ALL ON FUNCTION erp.authenticate(login character varying, password character varying) TO anonymous;


--
-- Name: FUNCTION change_password(current_password character varying, new_password character varying, user_id integer); Type: ACL; Schema: erp; Owner: postgres
--

GRANT ALL ON FUNCTION erp.change_password(current_password character varying, new_password character varying, user_id integer) TO administrator;


--
-- Name: FUNCTION create_password_recovery(recovery_email character varying); Type: ACL; Schema: erp; Owner: postgres
--

REVOKE ALL ON FUNCTION erp.create_password_recovery(recovery_email character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION erp.create_password_recovery(recovery_email character varying) TO anonymous;


--
-- Name: TABLE sales_schedules; Type: ACL; Schema: erp; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE erp.sales_schedules TO administrator;


--
-- Name: SEQUENCE users_invitations_id_seq; Type: ACL; Schema: erp; Owner: postgres
--

GRANT ALL ON SEQUENCE erp.users_invitations_id_seq TO administrator;


--
-- Name: TABLE users_invitations; Type: ACL; Schema: erp; Owner: postgres
--

GRANT ALL ON TABLE erp.users_invitations TO administrator;


--
-- Name: FUNCTION create_user_invitation(email_invited character varying, role character varying); Type: ACL; Schema: erp; Owner: postgres
--

REVOKE ALL ON FUNCTION erp.create_user_invitation(email_invited character varying, role character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION erp.create_user_invitation(email_invited character varying, role character varying) TO administrator;


--
-- Name: TABLE customers; Type: ACL; Schema: erp; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE erp.customers TO administrator;


--
-- Name: FUNCTION demote_user(user_id integer); Type: ACL; Schema: erp; Owner: postgres
--

REVOKE ALL ON FUNCTION erp.demote_user(user_id integer) FROM PUBLIC;
GRANT ALL ON FUNCTION erp.demote_user(user_id integer) TO administrator;


--
-- Name: SEQUENCE companies_id_seq; Type: ACL; Schema: erp; Owner: postgres
--

GRANT USAGE ON SEQUENCE erp.companies_id_seq TO administrator;


--
-- Name: TABLE companies; Type: ACL; Schema: erp; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE erp.companies TO administrator;


--
-- Name: TABLE contacts; Type: ACL; Schema: erp; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE erp.contacts TO administrator;


--
-- Name: TABLE containers; Type: ACL; Schema: erp; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE erp.containers TO administrator;


--
-- Name: TABLE pricelists; Type: ACL; Schema: erp; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE erp.pricelists TO administrator;


--
-- Name: TABLE products; Type: ACL; Schema: erp; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE erp.products TO administrator;


--
-- Name: TABLE units; Type: ACL; Schema: erp; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE erp.units TO administrator;


--
-- Name: FUNCTION get_current_user(); Type: ACL; Schema: erp; Owner: postgres
--

GRANT ALL ON FUNCTION erp.get_current_user() TO administrator;


--
-- Name: FUNCTION get_password_hash_salt(password character varying, OUT hash character varying, OUT salt character varying); Type: ACL; Schema: erp; Owner: postgres
--

REVOKE ALL ON FUNCTION erp.get_password_hash_salt(password character varying, OUT hash character varying, OUT salt character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION erp.get_password_hash_salt(password character varying, OUT hash character varying, OUT salt character varying) TO administrator;


--
-- Name: FUNCTION get_session_data(); Type: ACL; Schema: erp; Owner: postgres
--

GRANT ALL ON FUNCTION erp.get_session_data() TO administrator;


--
-- Name: TABLE password_recoveries; Type: ACL; Schema: erp; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE erp.password_recoveries TO administrator;


--
-- Name: FUNCTION password_recovery_by_code(recovery_code character varying); Type: ACL; Schema: erp; Owner: postgres
--

REVOKE ALL ON FUNCTION erp.password_recovery_by_code(recovery_code character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION erp.password_recovery_by_code(recovery_code character varying) TO anonymous;


--
-- Name: FUNCTION promote_user(email_invited character varying, role character varying); Type: ACL; Schema: erp; Owner: postgres
--

REVOKE ALL ON FUNCTION erp.promote_user(email_invited character varying, role character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION erp.promote_user(email_invited character varying, role character varying) TO administrator;


--
-- Name: FUNCTION recover_password(recovery_code character varying, new_password character varying); Type: ACL; Schema: erp; Owner: postgres
--

REVOKE ALL ON FUNCTION erp.recover_password(recovery_code character varying, new_password character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION erp.recover_password(recovery_code character varying, new_password character varying) TO anonymous;


--
-- Name: FUNCTION register_user(updated_firstname character varying, updated_lastname character varying, invitation_id integer, password character varying); Type: ACL; Schema: erp; Owner: postgres
--

GRANT ALL ON FUNCTION erp.register_user(updated_firstname character varying, updated_lastname character varying, invitation_id integer, password character varying) TO administrator;
GRANT ALL ON FUNCTION erp.register_user(updated_firstname character varying, updated_lastname character varying, invitation_id integer, password character varying) TO anonymous;


--
-- Name: FUNCTION users_invitation_contact_by_code(invitation_code character varying); Type: ACL; Schema: erp; Owner: postgres
--

REVOKE ALL ON FUNCTION erp.users_invitation_contact_by_code(invitation_code character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION erp.users_invitation_contact_by_code(invitation_code character varying) TO anonymous;
GRANT ALL ON FUNCTION erp.users_invitation_contact_by_code(invitation_code character varying) TO administrator;


--
-- Name: TABLE articles; Type: ACL; Schema: erp; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE erp.articles TO administrator;


--
-- Name: SEQUENCE articles_id_seq; Type: ACL; Schema: erp; Owner: postgres
--

GRANT USAGE ON SEQUENCE erp.articles_id_seq TO administrator;


--
-- Name: TABLE articles_prices; Type: ACL; Schema: erp; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE erp.articles_prices TO administrator;


--
-- Name: SEQUENCE contacts_id_seq; Type: ACL; Schema: erp; Owner: postgres
--

GRANT USAGE ON SEQUENCE erp.contacts_id_seq TO administrator;


--
-- Name: SEQUENCE containers_id_seq; Type: ACL; Schema: erp; Owner: postgres
--

GRANT USAGE ON SEQUENCE erp.containers_id_seq TO administrator;


--
-- Name: SEQUENCE customers_id_seq; Type: ACL; Schema: erp; Owner: postgres
--

GRANT USAGE ON SEQUENCE erp.customers_id_seq TO administrator;


--
-- Name: TABLE fulfillment_methods; Type: ACL; Schema: erp; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE erp.fulfillment_methods TO administrator;


--
-- Name: SEQUENCE fulfillment_method_id_seq; Type: ACL; Schema: erp; Owner: postgres
--

GRANT USAGE ON SEQUENCE erp.fulfillment_method_id_seq TO administrator;


--
-- Name: SEQUENCE pricelists_id_seq; Type: ACL; Schema: erp; Owner: postgres
--

GRANT USAGE ON SEQUENCE erp.pricelists_id_seq TO administrator;


--
-- Name: SEQUENCE product_prices_id_seq; Type: ACL; Schema: erp; Owner: postgres
--

GRANT USAGE ON SEQUENCE erp.product_prices_id_seq TO administrator;


--
-- Name: SEQUENCE products_id_seq; Type: ACL; Schema: erp; Owner: postgres
--

GRANT USAGE ON SEQUENCE erp.products_id_seq TO administrator;


--
-- Name: TABLE sales_schedules_fulfillment_methods; Type: ACL; Schema: erp; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE erp.sales_schedules_fulfillment_methods TO administrator;


--
-- Name: SEQUENCE sales_schedules_id_seq; Type: ACL; Schema: erp; Owner: postgres
--

GRANT USAGE ON SEQUENCE erp.sales_schedules_id_seq TO administrator;


--
-- Name: TABLE sales_schedules_pricelists; Type: ACL; Schema: erp; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE erp.sales_schedules_pricelists TO administrator;


--
-- Name: SEQUENCE settings_id_seq; Type: ACL; Schema: erp; Owner: postgres
--

GRANT USAGE ON SEQUENCE erp.settings_id_seq TO administrator;


--
-- Name: TABLE settings; Type: ACL; Schema: erp; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE erp.settings TO administrator;


--
-- Name: TABLE stock_shapes; Type: ACL; Schema: erp; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE erp.stock_shapes TO administrator;


--
-- Name: SEQUENCE stock_shapes_id_seq; Type: ACL; Schema: erp; Owner: postgres
--

GRANT USAGE ON SEQUENCE erp.stock_shapes_id_seq TO administrator;


--
-- Name: SEQUENCE units_id_seq; Type: ACL; Schema: erp; Owner: postgres
--

GRANT USAGE ON SEQUENCE erp.units_id_seq TO administrator;


--
-- Name: TABLE users; Type: ACL; Schema: erp; Owner: postgres
--

GRANT ALL ON TABLE erp.users TO administrator;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: erp; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA erp GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES  TO administrator;


--
-- PostgreSQL database dump complete
--

