--
-- PostgreSQL database dump
--

-- Dumped from database version 15.2 (Debian 15.2-1.pgdg110+1)
-- Dumped by pg_dump version 15.1

-- Started on 2023-02-27 17:49:54 CET

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
-- TOC entry 7 (class 2615 OID 17128)
-- Name: postgraphile_watch; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA postgraphile_watch;


ALTER SCHEMA postgraphile_watch OWNER TO postgres;

--
-- TOC entry 2 (class 3079 OID 16388)
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- TOC entry 3594 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 939 (class 1247 OID 16427)
-- Name: article_display; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.article_display AS (
	id integer,
	"containerName" character varying,
	"quantityPerContainer" numeric,
	"productName" character varying,
	"stockshapeName" character varying,
	"unitAbbreviation" character varying
);


ALTER TYPE public.article_display OWNER TO postgres;

--
-- TOC entry 942 (class 1247 OID 16430)
-- Name: jwt_token; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.jwt_token AS (
	role character varying,
	user_id integer,
	customer_id integer,
	expiration integer
);


ALTER TYPE public.jwt_token OWNER TO postgres;

--
-- TOC entry 945 (class 1247 OID 16433)
-- Name: session_data; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.session_data AS (
	contact_id integer,
	firstname character varying,
	email character varying,
	role character varying,
	user_id integer,
	lastname character varying
);


ALTER TYPE public.session_data OWNER TO postgres;

--
-- TOC entry 948 (class 1247 OID 16436)
-- Name: stock_shape_display; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.stock_shape_display AS (
	id integer,
	"stockShapeName" character varying,
	"productName" character varying,
	"unitAbbreviation" character varying
);


ALTER TYPE public.stock_shape_display OWNER TO postgres;

--
-- TOC entry 1002 (class 1247 OID 16939)
-- Name: users_invitation_contact; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_invitation_contact AS (
	id integer,
	role character varying,
	expiration_date timestamp without time zone,
	accepted_date timestamp without time zone,
	email character varying,
	firstname character varying,
	lastname character varying
);


ALTER TYPE public.users_invitation_contact OWNER TO postgres;

--
-- TOC entry 326 (class 1255 OID 17129)
-- Name: notify_watchers_ddl(); Type: FUNCTION; Schema: postgraphile_watch; Owner: postgres
--

CREATE FUNCTION postgraphile_watch.notify_watchers_ddl() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
begin
  perform pg_notify(
    'postgraphile_watch',
    json_build_object(
      'type',
      'ddl',
      'payload',
      (select json_agg(json_build_object('schema', schema_name, 'command', command_tag)) from pg_event_trigger_ddl_commands() as x)
    )::text
  );
end;
$$;


ALTER FUNCTION postgraphile_watch.notify_watchers_ddl() OWNER TO postgres;

--
-- TOC entry 327 (class 1255 OID 17130)
-- Name: notify_watchers_drop(); Type: FUNCTION; Schema: postgraphile_watch; Owner: postgres
--

CREATE FUNCTION postgraphile_watch.notify_watchers_drop() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
begin
  perform pg_notify(
    'postgraphile_watch',
    json_build_object(
      'type',
      'drop',
      'payload',
      (select json_agg(distinct x.schema_name) from pg_event_trigger_dropped_objects() as x)
    )::text
  );
end;
$$;


ALTER FUNCTION postgraphile_watch.notify_watchers_drop() OWNER TO postgres;

--
-- TOC entry 319 (class 1255 OID 16439)
-- Name: authenticate(character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.authenticate(login character varying, password character varying) RETURNS public.jwt_token
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare user_id INTEGER;
declare "role" TEXT;
begin
  select u.id, u.role into user_id, "role"
    from public.contacts as a left join "users" u on a.id = u.contact_id
    where a.email = login and u.password_hash = crypt(password, u.salt);

  if user_id IS NOT NULL then
    return (
      "role",
      user_id,
	  null,
      extract(epoch from now() + interval '1 day')
    )::public.jwt_token;
  else
    return null;
  end if;
end;
$$;


ALTER FUNCTION public.authenticate(login character varying, password character varying) OWNER TO postgres;

--
-- TOC entry 322 (class 1255 OID 16440)
-- Name: change_password(character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.change_password(current_password character varying, new_password character varying, user_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE new_salt text;
DECLARE updated integer;
BEGIN
	IF current_password = new_password THEN
		RAISE EXCEPTION 'New password must be different from old password';
	END IF;

	UPDATE users SET password_hash = f.hash, salt=f.new_salt
	FROM (SELECT hash, salt as new_salt FROM get_password_hash_salt(new_password)) f WHERE id=user_id AND password_hash = crypt(current_password, salt);
	
	GET DIAGNOSTICS updated = row_count;
	IF updated = 0 THEN
		RAISE EXCEPTION 'Operation failed';
	END IF;
END;
$$;


ALTER FUNCTION public.change_password(current_password character varying, new_password character varying, user_id integer) OWNER TO postgres;

--
-- TOC entry 316 (class 1255 OID 17034)
-- Name: create_password_recovery(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_password_recovery(recovery_email character varying) RETURNS character varying
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE now timestamp;
DECLARE code text;
BEGIN

IF (SELECT c.id FROM contacts c INNER JOIN users u ON u.contact_id = c.id WHERE c.email = recovery_email) IS NULL THEN
	RETURN '';
END IF;

SELECT NOW() INTO now;
SELECT array_to_string(array(select substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',((random()*(36-1)+1)::integer),1) FROM generate_series(1,32)),'')
INTO code;

INSERT INTO password_recoveries (email, creation_date, expiration_date, code)
VALUES (recovery_email, now, now + interval '15 minutes', code);

RETURN code;

END;$$;


ALTER FUNCTION public.create_password_recovery(recovery_email character varying) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 220 (class 1259 OID 16441)
-- Name: sales_schedules; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_schedules (
    id integer NOT NULL,
    fulfillment_date timestamp with time zone NOT NULL,
    name character varying,
    order_closure_date timestamp with time zone NOT NULL,
    delivery_price money,
    free_delivery_turnover money,
    begin_sales_date timestamp without time zone,
    disabled boolean DEFAULT false NOT NULL
);


ALTER TABLE public.sales_schedules OWNER TO postgres;

--
-- TOC entry 3598 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE sales_schedules; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sales_schedules IS '@omit delete,update';


--
-- TOC entry 304 (class 1255 OID 16447)
-- Name: create_sales_schedule_with_deps(timestamp without time zone, character varying, timestamp without time zone, money, money, timestamp without time zone, boolean, integer[], integer[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_sales_schedule_with_deps(fulfillment_date timestamp without time zone, name character varying, order_closure_date timestamp without time zone, delivery_price money, free_delivery_turnover money, begin_sales_date timestamp without time zone, disabled boolean, fulfillment_methods integer[], pricelists integer[]) RETURNS public.sales_schedules
    LANGUAGE plpgsql
    AS $$
DECLARE ssid INTEGER;
DECLARE res sales_schedules;
BEGIN

IF fulfillment_date < CURRENT_TIMESTAMP OR order_closure_date < CURRENT_TIMESTAMP THEN
	RAISE EXCEPTION 'fulfillment date and order closure date must be in the future';
END IF;

INSERT INTO public.sales_schedules (fulfillment_date, "name", order_closure_date, delivery_price, free_delivery_turnover, begin_sales_date, disabled)
VALUES (fulfillment_date, name, order_closure_date, delivery_price, free_delivery_turnover, begin_sales_date, disabled)
RETURNING id INTO ssid;

INSERT INTO public.sales_schedules_pricelists (pricelist_id, sales_schedule_id)
SELECT unnest(pricelists), ssid;

INSERT INTO public.sales_schedules_fulfillment_methods (fulfillment_method_id, sales_schedule_id)
SELECT unnest(fulfillment_methods), ssid;

SELECT * INTO res FROM public.sales_schedules WHERE id = ssid;

RETURN res;
END;
$$;


ALTER FUNCTION public.create_sales_schedule_with_deps(fulfillment_date timestamp without time zone, name character varying, order_closure_date timestamp without time zone, delivery_price money, free_delivery_turnover money, begin_sales_date timestamp without time zone, disabled boolean, fulfillment_methods integer[], pricelists integer[]) OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 16556)
-- Name: users_invitations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_invitations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_invitations_id_seq OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16448)
-- Name: users_invitations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users_invitations (
    id integer DEFAULT nextval('public.users_invitations_id_seq'::regclass) NOT NULL,
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


ALTER TABLE public.users_invitations OWNER TO postgres;

--
-- TOC entry 3601 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE users_invitations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.users_invitations IS '@omit create,update,delete';


--
-- TOC entry 313 (class 1255 OID 16455)
-- Name: create_user_invitation(character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_user_invitation(email_invited character varying, role character varying) RETURNS public.users_invitations
    LANGUAGE plpgsql
    AS $$
DECLARE now timestamp;
DECLARE res users_invitations;
DECLARE code text;
DECLARE user_id integer;
BEGIN
	IF (SELECT "id" FROM contacts WHERE email = email_invited) IS NOT NULL THEN
		RAISE EXCEPTION 'This email is already linked to a contact in the system';
	END IF;
	
	SELECT NOW() INTO now;
	
	SELECT array_to_string(array(select substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',((random()*(36-1)+1)::integer),1) FROM generate_series(1,16)),'')
	INTO code;
	
	SELECT NULLIF(current_setting('jwt.claims.user_id', true), '')::integer INTO user_id;
	
	INSERT INTO users_invitations (code, "role", email, create_date, expiration_date, grantor)
	VALUES ( code, "role", email_invited, now, now + interval '72 hours', user_id )
	RETURNING *;
END;
$$;


ALTER FUNCTION public.create_user_invitation(email_invited character varying, role character varying) OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16456)
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    slug character varying NOT NULL,
    "pricelistId" integer NOT NULL,
    "eshopAccess" boolean DEFAULT true NOT NULL,
    "contactId" integer,
    "companyId" integer
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- TOC entry 305 (class 1255 OID 16462)
-- Name: customer_by_slug(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.customer_by_slug(slug character varying) RETURNS SETOF public.customers
    LANGUAGE sql STABLE STRICT
    AS $$SELECT *
FROM customers
WHERE customers.slug = customer_by_slug.slug$$;


ALTER FUNCTION public.customer_by_slug(slug character varying) OWNER TO postgres;

--
-- TOC entry 314 (class 1255 OID 16866)
-- Name: demote_user(integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.demote_user(user_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$BEGIN
	IF (SELECT id FROM users WHERE id = user_id) IS NULL THEN
		RAISE EXCEPTION 'User not found';
	END IF;
	IF (SELECT COUNT(*) FROM users WHERE role = 'administrator') = 1 AND (SELECT "role" FROM users WHERE id = user_id) = 'administrator' THEN
		RAISE EXCEPTION 'Cannot remove the last admin';
	END IF;
	
	DELETE FROM users WHERE id = user_id;
END;$$;


ALTER FUNCTION public.demote_user(user_id integer) OWNER TO postgres;

--
-- TOC entry 306 (class 1255 OID 16463)
-- Name: filter_articles(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.filter_articles(search_term character varying) RETURNS SETOF public.article_display
    LANGUAGE sql STABLE
    AS $$
SELECT a.id, c.name as containerName, a."quantityPerContainer", p.name as productName, ss.name as stockshapeName, u.abbreviation as unitAbbreviation
FROM articles a
INNER JOIN containers c ON a."containerId" = c.id
INNER JOIN stock_shapes ss ON a."stockShapeId" = ss.id
INNER JOIN products p ON ss."productId" = p.id
INNER JOIN units u ON ss."unitId" = u.id
WHERE ss.name ILIKE '%' || search_term || '%' OR p.name ILIKE '%' || search_term || '%' OR c.name ILIKE '%' || search_term || '%'
$$;


ALTER FUNCTION public.filter_articles(search_term character varying) OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16464)
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.companies_id_seq OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16465)
-- Name: companies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.companies (
    id integer DEFAULT nextval('public.companies_id_seq'::regclass) NOT NULL,
    name character varying NOT NULL,
    "addressLine1" character varying,
    "addressLine2" character varying,
    "companyNumber" character varying,
    "zipCode" character varying,
    city character varying,
    "mainContactId" integer
);


ALTER TABLE public.companies OWNER TO postgres;

--
-- TOC entry 307 (class 1255 OID 16471)
-- Name: filter_companies(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.filter_companies(search_term character varying) RETURNS SETOF public.companies
    LANGUAGE sql STABLE
    AS $$
  select companies.*
  from public.companies
  where name ilike '%' || search_term || '%' or "companyNumber" ilike '%' || search_term || '%'
  order by name, "companyNumber"
  fetch next 40 rows only
$$;


ALTER FUNCTION public.filter_companies(search_term character varying) OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16472)
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
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


ALTER TABLE public.contacts OWNER TO postgres;

--
-- TOC entry 308 (class 1255 OID 16477)
-- Name: filter_contacts(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.filter_contacts(search_term character varying) RETURNS SETOF public.contacts
    LANGUAGE sql STABLE
    AS $$
  select contacts.*
  from public.contacts
  where "lastname" ilike '%' || search_term || '%' or "firstname" ilike '%' || search_term || '%'
  order by "lastname", "firstname"
  fetch next 40 rows only
$$;


ALTER FUNCTION public.filter_contacts(search_term character varying) OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16478)
-- Name: containers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.containers (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying NOT NULL
);


ALTER TABLE public.containers OWNER TO postgres;

--
-- TOC entry 309 (class 1255 OID 16483)
-- Name: filter_containers(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.filter_containers(search_term character varying) RETURNS SETOF public.containers
    LANGUAGE sql STABLE
    AS $$  select containers.*
  from public.containers
  where name ilike search_term || '%'$$;


ALTER FUNCTION public.filter_containers(search_term character varying) OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 16484)
-- Name: pricelists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pricelists (
    id integer NOT NULL,
    name character varying NOT NULL,
    "vatIncluded" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.pricelists OWNER TO postgres;

--
-- TOC entry 310 (class 1255 OID 16490)
-- Name: filter_pricelists(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.filter_pricelists(search_term character varying) RETURNS SETOF public.pricelists
    LANGUAGE sql STABLE
    AS $$
SELECT id, name, "vatIncluded"
FROM priceLists
WHERE name ILIKE '%' || search_term || '%'
$$;


ALTER FUNCTION public.filter_pricelists(search_term character varying) OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16491)
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying,
    "parentProduct" integer
);


ALTER TABLE public.products OWNER TO postgres;

--
-- TOC entry 311 (class 1255 OID 16496)
-- Name: filter_products(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.filter_products(search_term character varying) RETURNS SETOF public.products
    LANGUAGE sql STABLE
    AS $$
  select products.*
  from public.products
  where name ilike search_term || '%'
$$;


ALTER FUNCTION public.filter_products(search_term character varying) OWNER TO postgres;

--
-- TOC entry 291 (class 1255 OID 16497)
-- Name: filter_stockshapes(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.filter_stockshapes(search_term character varying) RETURNS SETOF public.stock_shape_display
    LANGUAGE sql STABLE
    AS $$SELECT ss.id, ss.name, p.name as productName, u.abbreviation as unitAbbreviation
FROM stock_shapes ss
INNER JOIN products p ON ss."productId" = p.id
INNER JOIN units u ON ss."unitId" = u.id
WHERE ss.name ILIKE '%' || search_term || '%' OR p.name ILIKE '%' || search_term || '%'$$;


ALTER FUNCTION public.filter_stockshapes(search_term character varying) OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 16498)
-- Name: units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.units (
    id integer NOT NULL,
    name character varying NOT NULL,
    abbreviation character varying NOT NULL
);


ALTER TABLE public.units OWNER TO postgres;

--
-- TOC entry 292 (class 1255 OID 16503)
-- Name: filter_units(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.filter_units(search_term character varying) RETURNS SETOF public.units
    LANGUAGE sql STABLE
    AS $$  select units.*
  from public.units
  where name ilike search_term || '%'$$;


ALTER FUNCTION public.filter_units(search_term character varying) OWNER TO postgres;

--
-- TOC entry 315 (class 1255 OID 16504)
-- Name: get_current_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_current_user() RETURNS public.contacts
    LANGUAGE sql STABLE
    AS $$SELECT * FROM contacts WHERE id=
(SELECT contact_id FROM users WHERE id =
(SELECT NULLIF(current_setting('jwt.claims.user_id', true), '')::integer)
)$$;


ALTER FUNCTION public.get_current_user() OWNER TO postgres;

--
-- TOC entry 325 (class 1255 OID 17071)
-- Name: get_password_hash_salt(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_password_hash_salt(password character varying, OUT hash character varying, OUT salt character varying) RETURNS record
    LANGUAGE plpgsql
    AS $$BEGIN
	IF LENGTH(password) < 8 OR regexp_count(password, '[A-Z0-9]') = 0 OR regexp_count(password, '[^\w]') = 0 THEN
		RAISE EXCEPTION 'Password must be minimum 8 characters long, contain at least one capitalized letter or number, and contain at least one non-alphanumeric character';
	END IF;
	
	SELECT gen_salt('md5') INTO salt;
	SELECT crypt(password, salt) INTO hash;
END;$$;


ALTER FUNCTION public.get_password_hash_salt(password character varying, OUT hash character varying, OUT salt character varying) OWNER TO postgres;

--
-- TOC entry 317 (class 1255 OID 16505)
-- Name: get_session_data(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_session_data() RETURNS public.session_data
    LANGUAGE sql STABLE
    AS $$
SELECT ct.id, ct.firstname, ct.email, u.role, u.id, ct.lastname
FROM users u INNER JOIN contacts ct ON u.contact_id = ct.id
WHERE u.id = (SELECT NULLIF(current_setting('jwt.claims.user_id', true), '')::integer)
$$;


ALTER FUNCTION public.get_session_data() OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 17019)
-- Name: password_recoveries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_recoveries (
    id integer NOT NULL,
    email character varying NOT NULL,
    creation_date timestamp without time zone DEFAULT now() NOT NULL,
    expiration_date timestamp without time zone NOT NULL,
    code character varying NOT NULL,
    recovery_date timestamp without time zone
);


ALTER TABLE public.password_recoveries OWNER TO postgres;

--
-- TOC entry 3616 (class 0 OID 0)
-- Dependencies: 254
-- Name: TABLE password_recoveries; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.password_recoveries IS '@omit create,update,delete,read,all,many';


--
-- TOC entry 321 (class 1255 OID 17060)
-- Name: password_recovery_by_code(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.password_recovery_by_code(recovery_code character varying) RETURNS public.password_recoveries
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$DECLARE res password_recoveries;
BEGIN
	SELECT * FROM password_recoveries 
	INTO res
	WHERE code = recovery_code;
	
	IF res IS NULL THEN
		RAISE EXCEPTION 'Invalid code';
	ELSE
		RETURN res;
	END IF;
END;$$;


ALTER FUNCTION public.password_recovery_by_code(recovery_code character varying) OWNER TO postgres;

--
-- TOC entry 320 (class 1255 OID 16506)
-- Name: promote_user(character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.promote_user(email_invited character varying, role character varying) RETURNS public.users_invitations
    LANGUAGE plpgsql
    AS $$
DECLARE now timestamp;
DECLARE res users_invitations;
DECLARE code text;
DECLARE user_id integer;
DECLARE contact_id integer;
BEGIN
	SELECT contacts.id FROM users INNER JOIN contacts ON users.contact_id = contacts.id WHERE email = email_invited
	INTO contact_id;
	IF contact_id IS NOT NULL THEN
		INSERT INTO users (contact_id, "role")
		VALUES (contact_id, "role");
		
		RETURN NULL;
	ELSE
		SELECT NOW() INTO now;
	
		SELECT array_to_string(array(select substr('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',((random()*(36-1)+1)::integer),1) FROM generate_series(1,16)),'')
		INTO code;

		SELECT NULLIF(current_setting('jwt.claims.user_id', true), '')::integer INTO user_id;

		INSERT INTO users_invitations (code, "role", email, create_date, expiration_date, grantor)
		VALUES ( code, "role", email_invited, now, now + interval '72 hours', user_id )
		RETURNING * INTO res;
		
		RETURN res;
	END IF;
END;
$$;


ALTER FUNCTION public.promote_user(email_invited character varying, role character varying) OWNER TO postgres;

--
-- TOC entry 324 (class 1255 OID 17073)
-- Name: recover_password(character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.recover_password(recovery_code character varying, new_password character varying) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$DECLARE recovery_id integer;
DECLARE recovery_email text;
BEGIN
	SELECT id FROM password_recoveries
	INTO recovery_id
	WHERE code = recovery_code;
	
	IF recovery_id IS NULL THEN
		RAISE EXCEPTION 'Failure';
	END IF;
	IF (SELECT expiration_date FROM password_recoveries WHERE code = recovery_code) < NOW() THEN
		RAISE EXCEPTION 'Expired';
	END IF;
	
	UPDATE password_recoveries SET recovery_date = NOW()
	WHERE code = recovery_code
	RETURNING email INTO recovery_email;
	
	UPDATE users SET password_hash = f.hash, salt = f.salt
	FROM get_password_hash_salt(new_password) f
	WHERE contact_id = (SELECT id FROM contacts Where email = recovery_email);
END;$$;


ALTER FUNCTION public.recover_password(recovery_code character varying, new_password character varying) OWNER TO postgres;

--
-- TOC entry 323 (class 1255 OID 16957)
-- Name: register_user(character varying, character varying, integer, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.register_user(updated_firstname character varying, updated_lastname character varying, invitation_id integer, password character varying) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$declare invite users_invitations;
declare cid INTEGER;
begin
	SELECT * INTO invite
	FROM users_invitations
	WHERE id = invitation_id;
	
	IF invite.accepted_date IS NOT NULL THEN
		RAISE EXCEPTION 'Invitation invalid';
	ELSE
		IF invite.expiration_date < NOW() THEN
			RAISE EXCEPTION 'Invitation expired';
		END IF;
	END IF;
	
	SELECT id INTO cid
	FROM public.contacts 
	WHERE email = invite.email;
	
	IF cid IS NULL THEN
		INSERT INTO public.contacts(
			firstname, lastname, email)
			VALUES (updated_firstname, updated_lastname, invite.email)
		RETURNING id INTO cid;
	ELSE
		UPDATE public.contacts
		SET firstname = updated_firstname, lastname = updated_lastname
		WHERE id = cid;
	END IF;
	
	INSERT INTO public.users(contact_id, "role", password_hash, salt)
	SELECT cid, invite.role, hash, salt FROM get_password_hash_salt(password);
	
	UPDATE public.users_invitations SET accepted_date = NOW()
	WHERE id = invitation_id;
end;
$$;


ALTER FUNCTION public.register_user(updated_firstname character varying, updated_lastname character varying, invitation_id integer, password character varying) OWNER TO postgres;

--
-- TOC entry 312 (class 1255 OID 16508)
-- Name: update_sales_schedule_with_deps(integer, timestamp without time zone, character varying, timestamp without time zone, money, money, timestamp without time zone, boolean, integer[], integer[]); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_sales_schedule_with_deps(ssid integer, pfulfillment_date timestamp without time zone, pname character varying, porder_closure_date timestamp without time zone, pdelivery_price money, pfree_delivery_turnover money, pbegin_sales_date timestamp without time zone, pdisabled boolean, pfulfillment_methods integer[], ppricelists integer[]) RETURNS public.sales_schedules
    LANGUAGE plpgsql
    AS $$
DECLARE res sales_schedules;
BEGIN

IF pbegin_sales_date IS NULL THEN
	--Ignore any change other than enabling/disabling the sales schedule
	UPDATE public.sales_schedules
	SET disabled=pdisabled
	WHERE id=ssid;
END IF;

IF pfulfillment_date < CURRENT_TIMESTAMP OR porder_closure_date < CURRENT_TIMESTAMP THEN
	RAISE EXCEPTION 'fulfillment date and order closure date must be in the future';
END IF;

UPDATE public.sales_schedules
SET fulfillment_date=pfulfillment_date, "name"=pname, 
	order_closure_date=porder_closure_date, delivery_price=pdelivery_price,
	free_delivery_turnover=pfree_delivery_turnover, begin_sales_date=pbegin_sales_date,
	disabled=pdisabled
WHERE id=ssid;

DELETE FROM public.sales_schedules_pricelists WHERE sales_schedule_id=ssid;
INSERT INTO public.sales_schedules_pricelists (pricelist_id, sales_schedule_id)
SELECT unnest(ppricelists), ssid;

DELETE FROM public.sales_schedules_fulfillment_methods WHERE sales_schedule_id=ssid;
INSERT INTO public.sales_schedules_fulfillment_methods (fulfillment_method_id, sales_schedule_id)
SELECT unnest(pfulfillment_methods), ssid;

SELECT * INTO res FROM public.sales_schedules WHERE id = ssid;

RETURN res;
END;
$$;


ALTER FUNCTION public.update_sales_schedule_with_deps(ssid integer, pfulfillment_date timestamp without time zone, pname character varying, porder_closure_date timestamp without time zone, pdelivery_price money, pfree_delivery_turnover money, pbegin_sales_date timestamp without time zone, pdisabled boolean, pfulfillment_methods integer[], ppricelists integer[]) OWNER TO postgres;

--
-- TOC entry 318 (class 1255 OID 16946)
-- Name: users_invitation_contact_by_code(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.users_invitation_contact_by_code(invitation_code character varying) RETURNS public.users_invitation_contact
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE res users_invitation_contact;
BEGIN
	SELECT i.id, i.role, i.expiration_date, i.accepted_date, i.email, c.firstname, c.lastname
	FROM users_invitations i LEFT JOIN contacts c ON c.email = i.email
	INTO res
	WHERE i.code = invitation_code;
	
	RETURN res;
END;
$$;


ALTER FUNCTION public.users_invitation_contact_by_code(invitation_code character varying) OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16509)
-- Name: articles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.articles (
    id integer NOT NULL,
    "stockShapeId" integer NOT NULL,
    "containerId" integer NOT NULL,
    "quantityPerContainer" numeric NOT NULL
);


ALTER TABLE public.articles OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 16514)
-- Name: articles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.articles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.articles_id_seq OWNER TO postgres;

--
-- TOC entry 3624 (class 0 OID 0)
-- Dependencies: 231
-- Name: articles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.articles_id_seq OWNED BY public.articles.id;


--
-- TOC entry 232 (class 1259 OID 16515)
-- Name: articles_prices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.articles_prices (
    id integer NOT NULL,
    "articleId" integer NOT NULL,
    "priceListId" integer NOT NULL,
    price money NOT NULL
);


ALTER TABLE public.articles_prices OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 16518)
-- Name: contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.contacts_id_seq OWNER TO postgres;

--
-- TOC entry 3627 (class 0 OID 0)
-- Dependencies: 233
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- TOC entry 234 (class 1259 OID 16519)
-- Name: containers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.containers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.containers_id_seq OWNER TO postgres;

--
-- TOC entry 3629 (class 0 OID 0)
-- Dependencies: 234
-- Name: containers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.containers_id_seq OWNED BY public.containers.id;


--
-- TOC entry 235 (class 1259 OID 16520)
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.customers_id_seq OWNER TO postgres;

--
-- TOC entry 3631 (class 0 OID 0)
-- Dependencies: 235
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- TOC entry 236 (class 1259 OID 16521)
-- Name: fulfillment_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.fulfillment_methods (
    id integer NOT NULL,
    name character varying NOT NULL,
    needs_pickup_address boolean NOT NULL,
    needs_customer_address boolean NOT NULL
);


ALTER TABLE public.fulfillment_methods OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 16526)
-- Name: fulfillment_method_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.fulfillment_method_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.fulfillment_method_id_seq OWNER TO postgres;

--
-- TOC entry 3634 (class 0 OID 0)
-- Dependencies: 237
-- Name: fulfillment_method_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fulfillment_method_id_seq OWNED BY public.fulfillment_methods.id;


--
-- TOC entry 253 (class 1259 OID 17018)
-- Name: password_recoveries_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_recoveries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.password_recoveries_id_seq OWNER TO postgres;

--
-- TOC entry 3636 (class 0 OID 0)
-- Dependencies: 253
-- Name: password_recoveries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_recoveries_id_seq OWNED BY public.password_recoveries.id;


--
-- TOC entry 238 (class 1259 OID 16527)
-- Name: pricelists_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pricelists_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.pricelists_id_seq OWNER TO postgres;

--
-- TOC entry 3637 (class 0 OID 0)
-- Dependencies: 238
-- Name: pricelists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pricelists_id_seq OWNED BY public.pricelists.id;


--
-- TOC entry 239 (class 1259 OID 16528)
-- Name: product_prices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_prices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.product_prices_id_seq OWNER TO postgres;

--
-- TOC entry 3639 (class 0 OID 0)
-- Dependencies: 239
-- Name: product_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_prices_id_seq OWNED BY public.articles_prices.id;


--
-- TOC entry 240 (class 1259 OID 16529)
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.products_id_seq OWNER TO postgres;

--
-- TOC entry 3641 (class 0 OID 0)
-- Dependencies: 240
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- TOC entry 241 (class 1259 OID 16530)
-- Name: sales_schedules_fulfillment_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_schedules_fulfillment_methods (
    sales_schedule_id integer NOT NULL,
    fulfillment_method_id integer NOT NULL
);


ALTER TABLE public.sales_schedules_fulfillment_methods OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 16533)
-- Name: sales_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sales_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sales_schedules_id_seq OWNER TO postgres;

--
-- TOC entry 3644 (class 0 OID 0)
-- Dependencies: 242
-- Name: sales_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_schedules_id_seq OWNED BY public.sales_schedules.id;


--
-- TOC entry 243 (class 1259 OID 16534)
-- Name: sales_schedules_pricelists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_schedules_pricelists (
    pricelist_id integer NOT NULL,
    sales_schedule_id integer NOT NULL
);


ALTER TABLE public.sales_schedules_pricelists OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 16537)
-- Name: settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.settings_id_seq OWNER TO postgres;

--
-- TOC entry 245 (class 1259 OID 16538)
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    "ownerId" integer NOT NULL,
    id integer DEFAULT nextval('public.settings_id_seq'::regclass) NOT NULL
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 16542)
-- Name: stock_shapes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_shapes (
    id integer NOT NULL,
    name character varying NOT NULL,
    "productId" integer NOT NULL,
    "unitId" integer NOT NULL,
    "inStock" numeric DEFAULT 0 NOT NULL
);


ALTER TABLE public.stock_shapes OWNER TO postgres;

--
-- TOC entry 247 (class 1259 OID 16548)
-- Name: stock_shapes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.stock_shapes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.stock_shapes_id_seq OWNER TO postgres;

--
-- TOC entry 3650 (class 0 OID 0)
-- Dependencies: 247
-- Name: stock_shapes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_shapes_id_seq OWNED BY public.stock_shapes.id;


--
-- TOC entry 248 (class 1259 OID 16549)
-- Name: units_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.units_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.units_id_seq OWNER TO postgres;

--
-- TOC entry 3652 (class 0 OID 0)
-- Dependencies: 248
-- Name: units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.units_id_seq OWNED BY public.units.id;


--
-- TOC entry 249 (class 1259 OID 16550)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    contact_id integer NOT NULL,
    role character varying NOT NULL,
    password_hash character varying NOT NULL,
    salt character varying NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 16555)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 3655 (class 0 OID 0)
-- Dependencies: 250
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 3360 (class 2604 OID 16557)
-- Name: articles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles ALTER COLUMN id SET DEFAULT nextval('public.articles_id_seq'::regclass);


--
-- TOC entry 3361 (class 2604 OID 16558)
-- Name: articles_prices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles_prices ALTER COLUMN id SET DEFAULT nextval('public.product_prices_id_seq'::regclass);


--
-- TOC entry 3354 (class 2604 OID 16559)
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- TOC entry 3355 (class 2604 OID 16560)
-- Name: containers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.containers ALTER COLUMN id SET DEFAULT nextval('public.containers_id_seq'::regclass);


--
-- TOC entry 3351 (class 2604 OID 16561)
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- TOC entry 3362 (class 2604 OID 16562)
-- Name: fulfillment_methods id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulfillment_methods ALTER COLUMN id SET DEFAULT nextval('public.fulfillment_method_id_seq'::regclass);


--
-- TOC entry 3367 (class 2604 OID 17022)
-- Name: password_recoveries id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_recoveries ALTER COLUMN id SET DEFAULT nextval('public.password_recoveries_id_seq'::regclass);


--
-- TOC entry 3356 (class 2604 OID 16563)
-- Name: pricelists id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricelists ALTER COLUMN id SET DEFAULT nextval('public.pricelists_id_seq'::regclass);


--
-- TOC entry 3358 (class 2604 OID 16564)
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- TOC entry 3346 (class 2604 OID 16565)
-- Name: sales_schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules ALTER COLUMN id SET DEFAULT nextval('public.sales_schedules_id_seq'::regclass);


--
-- TOC entry 3364 (class 2604 OID 16566)
-- Name: stock_shapes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_shapes ALTER COLUMN id SET DEFAULT nextval('public.stock_shapes_id_seq'::regclass);


--
-- TOC entry 3359 (class 2604 OID 16567)
-- Name: units id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units ALTER COLUMN id SET DEFAULT nextval('public.units_id_seq'::regclass);


--
-- TOC entry 3366 (class 2604 OID 16568)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 3398 (class 2606 OID 16571)
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- TOC entry 3379 (class 2606 OID 16573)
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- TOC entry 3384 (class 2606 OID 16575)
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- TOC entry 3389 (class 2606 OID 16577)
-- Name: containers containers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.containers
    ADD CONSTRAINT containers_pkey PRIMARY KEY (id);


--
-- TOC entry 3377 (class 2606 OID 16579)
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- TOC entry 3407 (class 2606 OID 16581)
-- Name: fulfillment_methods fulfillment_method_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulfillment_methods
    ADD CONSTRAINT fulfillment_method_pkey PRIMARY KEY (id);


--
-- TOC entry 3429 (class 2606 OID 17027)
-- Name: password_recoveries password_recoveries_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_recoveries
    ADD CONSTRAINT password_recoveries_pkey PRIMARY KEY (id);


--
-- TOC entry 3391 (class 2606 OID 16583)
-- Name: pricelists pricelists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricelists
    ADD CONSTRAINT pricelists_pkey PRIMARY KEY (id);


--
-- TOC entry 3403 (class 2606 OID 16585)
-- Name: articles_prices product_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles_prices
    ADD CONSTRAINT product_prices_pkey PRIMARY KEY (id);


--
-- TOC entry 3394 (class 2606 OID 16587)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- TOC entry 3411 (class 2606 OID 16589)
-- Name: sales_schedules_fulfillment_methods sales_schedules_fulfillment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules_fulfillment_methods
    ADD CONSTRAINT sales_schedules_fulfillment_methods_pkey PRIMARY KEY (sales_schedule_id, fulfillment_method_id);


--
-- TOC entry 3370 (class 2606 OID 16591)
-- Name: sales_schedules sales_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules
    ADD CONSTRAINT sales_schedules_pkey PRIMARY KEY (id);


--
-- TOC entry 3415 (class 2606 OID 16593)
-- Name: sales_schedules_pricelists sales_schedules_pricelists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules_pricelists
    ADD CONSTRAINT sales_schedules_pricelists_pkey PRIMARY KEY (pricelist_id, sales_schedule_id);


--
-- TOC entry 3418 (class 2606 OID 16595)
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- TOC entry 3422 (class 2606 OID 16597)
-- Name: stock_shapes stock_shapes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_shapes
    ADD CONSTRAINT stock_shapes_pkey PRIMARY KEY (id);


--
-- TOC entry 3405 (class 2606 OID 16599)
-- Name: articles_prices unique_articlesprices_articlepricelist; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles_prices
    ADD CONSTRAINT unique_articlesprices_articlepricelist UNIQUE ("articleId", "priceListId");


--
-- TOC entry 3382 (class 2606 OID 16601)
-- Name: companies unique_companyNumber; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT "unique_companyNumber" UNIQUE ("companyNumber");


--
-- TOC entry 3387 (class 2606 OID 16603)
-- Name: contacts unique_contacts_email; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT unique_contacts_email UNIQUE (email);


--
-- TOC entry 3425 (class 2606 OID 16605)
-- Name: users unique_role; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT unique_role UNIQUE (contact_id, role);


--
-- TOC entry 3373 (class 2606 OID 16607)
-- Name: users_invitations unique_users_invitations_code; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_invitations
    ADD CONSTRAINT unique_users_invitations_code UNIQUE (code);


--
-- TOC entry 3396 (class 2606 OID 16609)
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- TOC entry 3375 (class 2606 OID 16611)
-- Name: users_invitations users_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_invitations
    ADD CONSTRAINT users_invitations_pkey PRIMARY KEY (id);


--
-- TOC entry 3427 (class 2606 OID 16613)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 3399 (class 1259 OID 16614)
-- Name: fki_fk_article_container; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_article_container ON public.articles USING btree ("containerId");


--
-- TOC entry 3400 (class 1259 OID 16615)
-- Name: fki_fk_article_stockshape; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_article_stockshape ON public.articles USING btree ("stockShapeId");


--
-- TOC entry 3401 (class 1259 OID 16616)
-- Name: fki_fk_articlesPrice_pricelists; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fki_fk_articlesPrice_pricelists" ON public.articles_prices USING btree ("priceListId");


--
-- TOC entry 3380 (class 1259 OID 16617)
-- Name: fki_fk_companies_contact; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_companies_contact ON public.companies USING btree ("mainContactId");


--
-- TOC entry 3385 (class 1259 OID 16618)
-- Name: fki_fk_companies_contacts; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_companies_contacts ON public.contacts USING btree ("companyId");


--
-- TOC entry 3392 (class 1259 OID 16619)
-- Name: fki_fk_product_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_product_product ON public.products USING btree ("parentProduct");


--
-- TOC entry 3408 (class 1259 OID 16620)
-- Name: fki_fk_sales_schedules_fulfillment_methods_fulfillment_method; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_sales_schedules_fulfillment_methods_fulfillment_method ON public.sales_schedules_fulfillment_methods USING btree (fulfillment_method_id);


--
-- TOC entry 3409 (class 1259 OID 16621)
-- Name: fki_fk_sales_schedules_fulfillment_methods_sales_schedule; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_sales_schedules_fulfillment_methods_sales_schedule ON public.sales_schedules_fulfillment_methods USING btree (sales_schedule_id);


--
-- TOC entry 3412 (class 1259 OID 16622)
-- Name: fki_fk_sales_schedules_pricelists_pricelists; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_sales_schedules_pricelists_pricelists ON public.sales_schedules_pricelists USING btree (pricelist_id);


--
-- TOC entry 3413 (class 1259 OID 16623)
-- Name: fki_fk_sales_schedules_pricelists_sales_schedules; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_sales_schedules_pricelists_sales_schedules ON public.sales_schedules_pricelists USING btree (sales_schedule_id);


--
-- TOC entry 3416 (class 1259 OID 16624)
-- Name: fki_fk_settings_companies; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_settings_companies ON public.settings USING btree ("ownerId");


--
-- TOC entry 3419 (class 1259 OID 16625)
-- Name: fki_fk_stock_shapes_products; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_stock_shapes_products ON public.stock_shapes USING btree ("productId");


--
-- TOC entry 3420 (class 1259 OID 16626)
-- Name: fki_fk_stock_shapes_units; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_stock_shapes_units ON public.stock_shapes USING btree ("unitId");


--
-- TOC entry 3423 (class 1259 OID 16627)
-- Name: fki_fk_users_contacts; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_users_contacts ON public.users USING btree (contact_id);


--
-- TOC entry 3371 (class 1259 OID 16628)
-- Name: fki_fk_users_invitations_contacts; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_users_invitations_contacts ON public.users_invitations USING btree (grantor);


--
-- TOC entry 3435 (class 2606 OID 16629)
-- Name: articles fk_article_container; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT fk_article_container FOREIGN KEY ("containerId") REFERENCES public.containers(id) NOT VALID;


--
-- TOC entry 3436 (class 2606 OID 16634)
-- Name: articles fk_article_stockshape; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT fk_article_stockshape FOREIGN KEY ("stockShapeId") REFERENCES public.stock_shapes(id) NOT VALID;


--
-- TOC entry 3437 (class 2606 OID 16639)
-- Name: articles_prices fk_articles_prices_articles; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles_prices
    ADD CONSTRAINT fk_articles_prices_articles FOREIGN KEY ("articleId") REFERENCES public.articles(id) NOT VALID;


--
-- TOC entry 3438 (class 2606 OID 16644)
-- Name: articles_prices fk_articles_prices_pricelists; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles_prices
    ADD CONSTRAINT fk_articles_prices_pricelists FOREIGN KEY ("priceListId") REFERENCES public.pricelists(id) NOT VALID;


--
-- TOC entry 3432 (class 2606 OID 16649)
-- Name: companies fk_companies_contact; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT fk_companies_contact FOREIGN KEY ("mainContactId") REFERENCES public.contacts(id) NOT VALID;


--
-- TOC entry 3433 (class 2606 OID 16654)
-- Name: contacts fk_companies_contacts; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT fk_companies_contacts FOREIGN KEY ("companyId") REFERENCES public.companies(id) NOT VALID;


--
-- TOC entry 3431 (class 2606 OID 16659)
-- Name: customers fk_customer_priceList; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "fk_customer_priceList" FOREIGN KEY ("pricelistId") REFERENCES public.pricelists(id) NOT VALID;


--
-- TOC entry 3434 (class 2606 OID 16664)
-- Name: products fk_product_product; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_product_product FOREIGN KEY ("parentProduct") REFERENCES public.products(id) NOT VALID;


--
-- TOC entry 3439 (class 2606 OID 16669)
-- Name: sales_schedules_fulfillment_methods fk_sales_schedules_fulfillment_methods_fulfillment_method; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules_fulfillment_methods
    ADD CONSTRAINT fk_sales_schedules_fulfillment_methods_fulfillment_method FOREIGN KEY (fulfillment_method_id) REFERENCES public.fulfillment_methods(id);


--
-- TOC entry 3440 (class 2606 OID 16674)
-- Name: sales_schedules_fulfillment_methods fk_sales_schedules_fulfillment_methods_sales_schedule; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules_fulfillment_methods
    ADD CONSTRAINT fk_sales_schedules_fulfillment_methods_sales_schedule FOREIGN KEY (sales_schedule_id) REFERENCES public.sales_schedules(id);


--
-- TOC entry 3441 (class 2606 OID 16679)
-- Name: sales_schedules_pricelists fk_sales_schedules_pricelists_pricelists; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules_pricelists
    ADD CONSTRAINT fk_sales_schedules_pricelists_pricelists FOREIGN KEY (pricelist_id) REFERENCES public.pricelists(id) NOT VALID;


--
-- TOC entry 3442 (class 2606 OID 16684)
-- Name: sales_schedules_pricelists fk_sales_schedules_pricelists_sales_schedules; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules_pricelists
    ADD CONSTRAINT fk_sales_schedules_pricelists_sales_schedules FOREIGN KEY (sales_schedule_id) REFERENCES public.sales_schedules(id) NOT VALID;


--
-- TOC entry 3443 (class 2606 OID 16689)
-- Name: settings fk_settings_companies; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT fk_settings_companies FOREIGN KEY ("ownerId") REFERENCES public.companies(id) NOT VALID;


--
-- TOC entry 3444 (class 2606 OID 16694)
-- Name: stock_shapes fk_stock_shapes_products; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_shapes
    ADD CONSTRAINT fk_stock_shapes_products FOREIGN KEY ("productId") REFERENCES public.products(id) NOT VALID;


--
-- TOC entry 3445 (class 2606 OID 16699)
-- Name: stock_shapes fk_stock_shapes_units; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_shapes
    ADD CONSTRAINT fk_stock_shapes_units FOREIGN KEY ("unitId") REFERENCES public.units(id) NOT VALID;


--
-- TOC entry 3446 (class 2606 OID 16704)
-- Name: users fk_users_contacts; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT fk_users_contacts FOREIGN KEY (contact_id) REFERENCES public.contacts(id) NOT VALID;


--
-- TOC entry 3430 (class 2606 OID 16709)
-- Name: users_invitations fk_users_invitations_users; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users_invitations
    ADD CONSTRAINT fk_users_invitations_users FOREIGN KEY (grantor) REFERENCES public.users(id) NOT VALID;


--
-- TOC entry 3595 (class 0 OID 0)
-- Dependencies: 319
-- Name: FUNCTION authenticate(login character varying, password character varying); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.authenticate(login character varying, password character varying) TO anonymous;


--
-- TOC entry 3596 (class 0 OID 0)
-- Dependencies: 322
-- Name: FUNCTION change_password(current_password character varying, new_password character varying, user_id integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.change_password(current_password character varying, new_password character varying, user_id integer) TO administrator;


--
-- TOC entry 3597 (class 0 OID 0)
-- Dependencies: 316
-- Name: FUNCTION create_password_recovery(recovery_email character varying); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.create_password_recovery(recovery_email character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_password_recovery(recovery_email character varying) TO anonymous;


--
-- TOC entry 3599 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE sales_schedules; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sales_schedules TO administrator;


--
-- TOC entry 3600 (class 0 OID 0)
-- Dependencies: 251
-- Name: SEQUENCE users_invitations_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.users_invitations_id_seq TO administrator;


--
-- TOC entry 3602 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE users_invitations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users_invitations TO administrator;


--
-- TOC entry 3603 (class 0 OID 0)
-- Dependencies: 313
-- Name: FUNCTION create_user_invitation(email_invited character varying, role character varying); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.create_user_invitation(email_invited character varying, role character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_user_invitation(email_invited character varying, role character varying) TO administrator;


--
-- TOC entry 3604 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE customers; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.customers TO administrator;


--
-- TOC entry 3605 (class 0 OID 0)
-- Dependencies: 314
-- Name: FUNCTION demote_user(user_id integer); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.demote_user(user_id integer) FROM PUBLIC;
GRANT ALL ON FUNCTION public.demote_user(user_id integer) TO administrator;


--
-- TOC entry 3606 (class 0 OID 0)
-- Dependencies: 223
-- Name: SEQUENCE companies_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.companies_id_seq TO administrator;


--
-- TOC entry 3607 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE companies; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.companies TO administrator;


--
-- TOC entry 3608 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE contacts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.contacts TO administrator;


--
-- TOC entry 3609 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE containers; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.containers TO administrator;


--
-- TOC entry 3610 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE pricelists; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.pricelists TO administrator;


--
-- TOC entry 3611 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE products; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.products TO administrator;


--
-- TOC entry 3612 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE units; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.units TO administrator;


--
-- TOC entry 3613 (class 0 OID 0)
-- Dependencies: 315
-- Name: FUNCTION get_current_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_current_user() TO administrator;


--
-- TOC entry 3614 (class 0 OID 0)
-- Dependencies: 325
-- Name: FUNCTION get_password_hash_salt(password character varying, OUT hash character varying, OUT salt character varying); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_password_hash_salt(password character varying, OUT hash character varying, OUT salt character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_password_hash_salt(password character varying, OUT hash character varying, OUT salt character varying) TO administrator;


--
-- TOC entry 3615 (class 0 OID 0)
-- Dependencies: 317
-- Name: FUNCTION get_session_data(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_session_data() TO administrator;


--
-- TOC entry 3617 (class 0 OID 0)
-- Dependencies: 254
-- Name: TABLE password_recoveries; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.password_recoveries TO administrator;


--
-- TOC entry 3618 (class 0 OID 0)
-- Dependencies: 321
-- Name: FUNCTION password_recovery_by_code(recovery_code character varying); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.password_recovery_by_code(recovery_code character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION public.password_recovery_by_code(recovery_code character varying) TO anonymous;


--
-- TOC entry 3619 (class 0 OID 0)
-- Dependencies: 320
-- Name: FUNCTION promote_user(email_invited character varying, role character varying); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.promote_user(email_invited character varying, role character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION public.promote_user(email_invited character varying, role character varying) TO administrator;


--
-- TOC entry 3620 (class 0 OID 0)
-- Dependencies: 324
-- Name: FUNCTION recover_password(recovery_code character varying, new_password character varying); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.recover_password(recovery_code character varying, new_password character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION public.recover_password(recovery_code character varying, new_password character varying) TO anonymous;


--
-- TOC entry 3621 (class 0 OID 0)
-- Dependencies: 323
-- Name: FUNCTION register_user(updated_firstname character varying, updated_lastname character varying, invitation_id integer, password character varying); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.register_user(updated_firstname character varying, updated_lastname character varying, invitation_id integer, password character varying) TO administrator;
GRANT ALL ON FUNCTION public.register_user(updated_firstname character varying, updated_lastname character varying, invitation_id integer, password character varying) TO anonymous;


--
-- TOC entry 3622 (class 0 OID 0)
-- Dependencies: 318
-- Name: FUNCTION users_invitation_contact_by_code(invitation_code character varying); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.users_invitation_contact_by_code(invitation_code character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION public.users_invitation_contact_by_code(invitation_code character varying) TO anonymous;
GRANT ALL ON FUNCTION public.users_invitation_contact_by_code(invitation_code character varying) TO administrator;


--
-- TOC entry 3623 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE articles; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.articles TO administrator;


--
-- TOC entry 3625 (class 0 OID 0)
-- Dependencies: 231
-- Name: SEQUENCE articles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.articles_id_seq TO administrator;


--
-- TOC entry 3626 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE articles_prices; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.articles_prices TO administrator;


--
-- TOC entry 3628 (class 0 OID 0)
-- Dependencies: 233
-- Name: SEQUENCE contacts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.contacts_id_seq TO administrator;


--
-- TOC entry 3630 (class 0 OID 0)
-- Dependencies: 234
-- Name: SEQUENCE containers_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.containers_id_seq TO administrator;


--
-- TOC entry 3632 (class 0 OID 0)
-- Dependencies: 235
-- Name: SEQUENCE customers_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.customers_id_seq TO administrator;


--
-- TOC entry 3633 (class 0 OID 0)
-- Dependencies: 236
-- Name: TABLE fulfillment_methods; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.fulfillment_methods TO administrator;


--
-- TOC entry 3635 (class 0 OID 0)
-- Dependencies: 237
-- Name: SEQUENCE fulfillment_method_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.fulfillment_method_id_seq TO administrator;


--
-- TOC entry 3638 (class 0 OID 0)
-- Dependencies: 238
-- Name: SEQUENCE pricelists_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.pricelists_id_seq TO administrator;


--
-- TOC entry 3640 (class 0 OID 0)
-- Dependencies: 239
-- Name: SEQUENCE product_prices_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.product_prices_id_seq TO administrator;


--
-- TOC entry 3642 (class 0 OID 0)
-- Dependencies: 240
-- Name: SEQUENCE products_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.products_id_seq TO administrator;


--
-- TOC entry 3643 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE sales_schedules_fulfillment_methods; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sales_schedules_fulfillment_methods TO administrator;


--
-- TOC entry 3645 (class 0 OID 0)
-- Dependencies: 242
-- Name: SEQUENCE sales_schedules_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.sales_schedules_id_seq TO administrator;


--
-- TOC entry 3646 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE sales_schedules_pricelists; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sales_schedules_pricelists TO administrator;


--
-- TOC entry 3647 (class 0 OID 0)
-- Dependencies: 244
-- Name: SEQUENCE settings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.settings_id_seq TO administrator;


--
-- TOC entry 3648 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.settings TO administrator;


--
-- TOC entry 3649 (class 0 OID 0)
-- Dependencies: 246
-- Name: TABLE stock_shapes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stock_shapes TO administrator;


--
-- TOC entry 3651 (class 0 OID 0)
-- Dependencies: 247
-- Name: SEQUENCE stock_shapes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.stock_shapes_id_seq TO administrator;


--
-- TOC entry 3653 (class 0 OID 0)
-- Dependencies: 248
-- Name: SEQUENCE units_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.units_id_seq TO administrator;


--
-- TOC entry 3654 (class 0 OID 0)
-- Dependencies: 249
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.users TO administrator;


--
-- TOC entry 2202 (class 826 OID 16714)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES  TO administrator;


--
-- TOC entry 3344 (class 3466 OID 17131)
-- Name: postgraphile_watch_ddl; Type: EVENT TRIGGER; Schema: -; Owner: postgres
--

CREATE EVENT TRIGGER postgraphile_watch_ddl ON ddl_command_end
         WHEN TAG IN ('ALTER AGGREGATE', 'ALTER DOMAIN', 'ALTER EXTENSION', 'ALTER FOREIGN TABLE', 'ALTER FUNCTION', 'ALTER POLICY', 'ALTER SCHEMA', 'ALTER TABLE', 'ALTER TYPE', 'ALTER VIEW', 'COMMENT', 'CREATE AGGREGATE', 'CREATE DOMAIN', 'CREATE EXTENSION', 'CREATE FOREIGN TABLE', 'CREATE FUNCTION', 'CREATE INDEX', 'CREATE POLICY', 'CREATE RULE', 'CREATE SCHEMA', 'CREATE TABLE', 'CREATE TABLE AS', 'CREATE VIEW', 'DROP AGGREGATE', 'DROP DOMAIN', 'DROP EXTENSION', 'DROP FOREIGN TABLE', 'DROP FUNCTION', 'DROP INDEX', 'DROP OWNED', 'DROP POLICY', 'DROP RULE', 'DROP SCHEMA', 'DROP TABLE', 'DROP TYPE', 'DROP VIEW', 'GRANT', 'REVOKE', 'SELECT INTO')
   EXECUTE FUNCTION postgraphile_watch.notify_watchers_ddl();


ALTER EVENT TRIGGER postgraphile_watch_ddl OWNER TO postgres;

--
-- TOC entry 3345 (class 3466 OID 17132)
-- Name: postgraphile_watch_drop; Type: EVENT TRIGGER; Schema: -; Owner: postgres
--

CREATE EVENT TRIGGER postgraphile_watch_drop ON sql_drop
   EXECUTE FUNCTION postgraphile_watch.notify_watchers_drop();


ALTER EVENT TRIGGER postgraphile_watch_drop OWNER TO postgres;

-- Completed on 2023-02-27 17:49:55 CET

--
-- PostgreSQL database dump complete
--

