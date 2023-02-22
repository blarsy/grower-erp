--
-- PostgreSQL database dump
--

-- Dumped from database version 15.2 (Debian 15.2-1.pgdg110+1)
-- Dumped by pg_dump version 15.1

-- Started on 2023-02-22 09:18:42 CET

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
-- TOC entry 7 (class 2615 OID 17131)
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
-- TOC entry 3540 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- TOC entry 922 (class 1247 OID 16427)
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
-- TOC entry 925 (class 1247 OID 16430)
-- Name: jwt_token; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.jwt_token AS (
	role character varying,
	"contactId" integer,
	"customerId" integer,
	expiration integer
);


ALTER TYPE public.jwt_token OWNER TO postgres;

--
-- TOC entry 928 (class 1247 OID 16433)
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
-- TOC entry 309 (class 1255 OID 17132)
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
-- TOC entry 310 (class 1255 OID 17133)
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
-- TOC entry 283 (class 1255 OID 16436)
-- Name: authenticate(character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.authenticate(login character varying, password character varying) RETURNS public.jwt_token
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  account public.contacts;
begin
  select a.* into account
    from public.contacts as a
    where a.email = login and a."passwordHash" = crypt(password, a."passwordSalt");

  if account.id IS NOT NULL then
    return (
      'administrator',
      account.id,
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
-- TOC entry 308 (class 1255 OID 16951)
-- Name: change_password(character varying, character varying, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.change_password(current_password character varying, new_password character varying, contact_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$DECLARE new_salt text;
DECLARE updated integer;
BEGIN
	IF current_password = new_password THEN
		RAISE EXCEPTION 'New password must be different from old password';
	END IF;
	IF LENGTH(new_password) < 8 OR regexp_count(new_password, '[A-Z0-9]') = 0 OR regexp_count(new_password, '[^\w]') = 0 THEN
		RAISE EXCEPTION 'New password must be minimum 8 characters long, contain at least one capitalized letter or number, and contain at least one non-alphanumeric character';
	END IF;

	SELECT gen_salt('md5') INTO new_salt;
	
	UPDATE contacts SET "passwordHash" = crypt(new_password, new_salt), "passwordSalt"=new_salt
	WHERE id=contact_id AND "passwordHash" = crypt(current_password, "passwordSalt");
	
	GET DIAGNOSTICS updated = row_count;
	IF updated = 0 THEN
		RAISE EXCEPTION 'Operation failed';
	END IF;
END;$$;


ALTER FUNCTION public.change_password(current_password character varying, new_password character varying, contact_id integer) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 219 (class 1259 OID 16437)
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
-- TOC entry 3541 (class 0 OID 0)
-- Dependencies: 219
-- Name: TABLE sales_schedules; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sales_schedules IS '@omit delete,update';


--
-- TOC entry 296 (class 1255 OID 16443)
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
-- TOC entry 220 (class 1259 OID 16444)
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    slug character varying NOT NULL,
    "priceListId" integer NOT NULL,
    "eshopAccess" boolean DEFAULT true NOT NULL,
    "contactId" integer,
    "companyId" integer
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- TOC entry 297 (class 1255 OID 16450)
-- Name: customer_by_slug(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.customer_by_slug(slug character varying) RETURNS SETOF public.customers
    LANGUAGE sql STABLE STRICT
    AS $$SELECT *
FROM customers
WHERE customers.slug = customer_by_slug.slug$$;


ALTER FUNCTION public.customer_by_slug(slug character varying) OWNER TO postgres;

--
-- TOC entry 298 (class 1255 OID 16451)
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
-- TOC entry 221 (class 1259 OID 16452)
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
-- TOC entry 222 (class 1259 OID 16453)
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
-- TOC entry 299 (class 1255 OID 16459)
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
-- TOC entry 223 (class 1259 OID 16460)
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
    "passwordHash" character varying,
    "passwordSalt" character varying,
    "companyId" integer
);


ALTER TABLE public.contacts OWNER TO postgres;

--
-- TOC entry 305 (class 1255 OID 16465)
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
-- TOC entry 224 (class 1259 OID 16466)
-- Name: containers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.containers (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying NOT NULL
);


ALTER TABLE public.containers OWNER TO postgres;

--
-- TOC entry 300 (class 1255 OID 16471)
-- Name: filter_containers(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.filter_containers(search_term character varying) RETURNS SETOF public.containers
    LANGUAGE sql STABLE
    AS $$  select containers.*
  from public.containers
  where name ilike search_term || '%'$$;


ALTER FUNCTION public.filter_containers(search_term character varying) OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16472)
-- Name: pricelists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pricelists (
    id integer NOT NULL,
    name character varying NOT NULL,
    "vatIncluded" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.pricelists OWNER TO postgres;

--
-- TOC entry 301 (class 1255 OID 16478)
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
-- TOC entry 226 (class 1259 OID 16479)
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
-- TOC entry 302 (class 1255 OID 16484)
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
-- TOC entry 303 (class 1255 OID 16485)
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
-- TOC entry 227 (class 1259 OID 16486)
-- Name: units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.units (
    id integer NOT NULL,
    name character varying NOT NULL,
    abbreviation character varying NOT NULL
);


ALTER TABLE public.units OWNER TO postgres;

--
-- TOC entry 304 (class 1255 OID 16491)
-- Name: filter_units(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.filter_units(search_term character varying) RETURNS SETOF public.units
    LANGUAGE sql STABLE
    AS $$  select units.*
  from public.units
  where name ilike search_term || '%'$$;


ALTER FUNCTION public.filter_units(search_term character varying) OWNER TO postgres;

--
-- TOC entry 284 (class 1255 OID 16795)
-- Name: get_current_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_current_user() RETURNS public.contacts
    LANGUAGE sql STABLE
    AS $$SELECT * FROM contacts WHERE id=
(SELECT NULLIF(current_setting('jwt.claims.contactId', true), '')::integer)$$;


ALTER FUNCTION public.get_current_user() OWNER TO postgres;

--
-- TOC entry 307 (class 1255 OID 16492)
-- Name: register_user(character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.register_user(firstname character varying, lastname character varying, email character varying, phone character varying, addressline1 character varying, addressline2 character varying, zipcode character varying, city character varying, password character varying) RETURNS public.contacts
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare salt text;
declare res contacts;
declare ssid INTEGER;
begin
	SELECT gen_salt('md5') INTO salt;
	INSERT INTO public.contacts(
		firstname, lastname, email, phone, "addressLine1", "addressLine2", "zipCode", city, "passwordHash", "passwordSalt")
		VALUES (firstname, lastname, email, phone, addressLine1, addressLine2, zipCode, city, crypt(password, salt), salt)
	RETURNING id INTO ssid;

	SELECT * INTO res FROM contacts WHERE id = ssid;

	RETURN res;
end;
$$;


ALTER FUNCTION public.register_user(firstname character varying, lastname character varying, email character varying, phone character varying, addressline1 character varying, addressline2 character varying, zipcode character varying, city character varying, password character varying) OWNER TO postgres;

--
-- TOC entry 306 (class 1255 OID 16493)
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
-- TOC entry 228 (class 1259 OID 16494)
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
-- TOC entry 229 (class 1259 OID 16499)
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
-- TOC entry 3553 (class 0 OID 0)
-- Dependencies: 229
-- Name: articles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.articles_id_seq OWNED BY public.articles.id;


--
-- TOC entry 230 (class 1259 OID 16500)
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
-- TOC entry 231 (class 1259 OID 16503)
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
-- TOC entry 3556 (class 0 OID 0)
-- Dependencies: 231
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- TOC entry 232 (class 1259 OID 16504)
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
-- TOC entry 3558 (class 0 OID 0)
-- Dependencies: 232
-- Name: containers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.containers_id_seq OWNED BY public.containers.id;


--
-- TOC entry 233 (class 1259 OID 16505)
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
-- TOC entry 3560 (class 0 OID 0)
-- Dependencies: 233
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- TOC entry 234 (class 1259 OID 16506)
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
-- TOC entry 235 (class 1259 OID 16511)
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
-- TOC entry 3563 (class 0 OID 0)
-- Dependencies: 235
-- Name: fulfillment_method_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fulfillment_method_id_seq OWNED BY public.fulfillment_methods.id;


--
-- TOC entry 236 (class 1259 OID 16512)
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
-- TOC entry 3565 (class 0 OID 0)
-- Dependencies: 236
-- Name: pricelists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pricelists_id_seq OWNED BY public.pricelists.id;


--
-- TOC entry 237 (class 1259 OID 16513)
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
-- TOC entry 3567 (class 0 OID 0)
-- Dependencies: 237
-- Name: product_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_prices_id_seq OWNED BY public.articles_prices.id;


--
-- TOC entry 238 (class 1259 OID 16514)
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
-- TOC entry 3569 (class 0 OID 0)
-- Dependencies: 238
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- TOC entry 239 (class 1259 OID 16515)
-- Name: sales_schedules_fulfillment_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_schedules_fulfillment_methods (
    sales_schedule_id integer NOT NULL,
    fulfillment_method_id integer NOT NULL
);


ALTER TABLE public.sales_schedules_fulfillment_methods OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 16518)
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
-- TOC entry 3572 (class 0 OID 0)
-- Dependencies: 240
-- Name: sales_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_schedules_id_seq OWNED BY public.sales_schedules.id;


--
-- TOC entry 241 (class 1259 OID 16519)
-- Name: sales_schedules_pricelists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_schedules_pricelists (
    pricelist_id integer NOT NULL,
    sales_schedule_id integer NOT NULL
);


ALTER TABLE public.sales_schedules_pricelists OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 16522)
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
-- TOC entry 243 (class 1259 OID 16523)
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    "ownerId" integer NOT NULL,
    id integer DEFAULT nextval('public.settings_id_seq'::regclass) NOT NULL
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 16527)
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
-- TOC entry 245 (class 1259 OID 16533)
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
-- TOC entry 3578 (class 0 OID 0)
-- Dependencies: 245
-- Name: stock_shapes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_shapes_id_seq OWNED BY public.stock_shapes.id;


--
-- TOC entry 246 (class 1259 OID 16534)
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
-- TOC entry 3580 (class 0 OID 0)
-- Dependencies: 246
-- Name: units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.units_id_seq OWNED BY public.units.id;


--
-- TOC entry 3325 (class 2604 OID 16535)
-- Name: articles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles ALTER COLUMN id SET DEFAULT nextval('public.articles_id_seq'::regclass);


--
-- TOC entry 3326 (class 2604 OID 16536)
-- Name: articles_prices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles_prices ALTER COLUMN id SET DEFAULT nextval('public.product_prices_id_seq'::regclass);


--
-- TOC entry 3319 (class 2604 OID 16537)
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- TOC entry 3320 (class 2604 OID 16538)
-- Name: containers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.containers ALTER COLUMN id SET DEFAULT nextval('public.containers_id_seq'::regclass);


--
-- TOC entry 3316 (class 2604 OID 16539)
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- TOC entry 3327 (class 2604 OID 16540)
-- Name: fulfillment_methods id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulfillment_methods ALTER COLUMN id SET DEFAULT nextval('public.fulfillment_method_id_seq'::regclass);


--
-- TOC entry 3321 (class 2604 OID 16541)
-- Name: pricelists id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricelists ALTER COLUMN id SET DEFAULT nextval('public.pricelists_id_seq'::regclass);


--
-- TOC entry 3323 (class 2604 OID 16542)
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- TOC entry 3314 (class 2604 OID 16543)
-- Name: sales_schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules ALTER COLUMN id SET DEFAULT nextval('public.sales_schedules_id_seq'::regclass);


--
-- TOC entry 3329 (class 2604 OID 16544)
-- Name: stock_shapes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_shapes ALTER COLUMN id SET DEFAULT nextval('public.stock_shapes_id_seq'::regclass);


--
-- TOC entry 3324 (class 2604 OID 16545)
-- Name: units id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units ALTER COLUMN id SET DEFAULT nextval('public.units_id_seq'::regclass);


--
-- TOC entry 3353 (class 2606 OID 16547)
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- TOC entry 3336 (class 2606 OID 16549)
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- TOC entry 3341 (class 2606 OID 16551)
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- TOC entry 3344 (class 2606 OID 16553)
-- Name: containers containers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.containers
    ADD CONSTRAINT containers_pkey PRIMARY KEY (id);


--
-- TOC entry 3334 (class 2606 OID 16555)
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- TOC entry 3362 (class 2606 OID 16557)
-- Name: fulfillment_methods fulfillment_method_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulfillment_methods
    ADD CONSTRAINT fulfillment_method_pkey PRIMARY KEY (id);


--
-- TOC entry 3346 (class 2606 OID 16559)
-- Name: pricelists pricelists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricelists
    ADD CONSTRAINT pricelists_pkey PRIMARY KEY (id);


--
-- TOC entry 3358 (class 2606 OID 16561)
-- Name: articles_prices product_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles_prices
    ADD CONSTRAINT product_prices_pkey PRIMARY KEY (id);


--
-- TOC entry 3349 (class 2606 OID 16563)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- TOC entry 3366 (class 2606 OID 16565)
-- Name: sales_schedules_fulfillment_methods sales_schedules_fulfillment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules_fulfillment_methods
    ADD CONSTRAINT sales_schedules_fulfillment_methods_pkey PRIMARY KEY (sales_schedule_id, fulfillment_method_id);


--
-- TOC entry 3332 (class 2606 OID 16567)
-- Name: sales_schedules sales_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules
    ADD CONSTRAINT sales_schedules_pkey PRIMARY KEY (id);


--
-- TOC entry 3370 (class 2606 OID 16569)
-- Name: sales_schedules_pricelists sales_schedules_pricelists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules_pricelists
    ADD CONSTRAINT sales_schedules_pricelists_pkey PRIMARY KEY (pricelist_id, sales_schedule_id);


--
-- TOC entry 3373 (class 2606 OID 16571)
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- TOC entry 3377 (class 2606 OID 16573)
-- Name: stock_shapes stock_shapes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_shapes
    ADD CONSTRAINT stock_shapes_pkey PRIMARY KEY (id);


--
-- TOC entry 3360 (class 2606 OID 16575)
-- Name: articles_prices unique_articlesprices_articlepricelist; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles_prices
    ADD CONSTRAINT unique_articlesprices_articlepricelist UNIQUE ("articleId", "priceListId");


--
-- TOC entry 3339 (class 2606 OID 16577)
-- Name: companies unique_companyNumber; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT "unique_companyNumber" UNIQUE ("companyNumber");


--
-- TOC entry 3351 (class 2606 OID 16579)
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- TOC entry 3354 (class 1259 OID 16580)
-- Name: fki_fk_article_container; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_article_container ON public.articles USING btree ("containerId");


--
-- TOC entry 3355 (class 1259 OID 16581)
-- Name: fki_fk_article_stockshape; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_article_stockshape ON public.articles USING btree ("stockShapeId");


--
-- TOC entry 3356 (class 1259 OID 16582)
-- Name: fki_fk_articlesPrice_pricelists; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fki_fk_articlesPrice_pricelists" ON public.articles_prices USING btree ("priceListId");


--
-- TOC entry 3337 (class 1259 OID 16583)
-- Name: fki_fk_companies_contact; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_companies_contact ON public.companies USING btree ("mainContactId");


--
-- TOC entry 3342 (class 1259 OID 16733)
-- Name: fki_fk_companies_contacts; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_companies_contacts ON public.contacts USING btree ("companyId");


--
-- TOC entry 3347 (class 1259 OID 16584)
-- Name: fki_fk_product_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_product_product ON public.products USING btree ("parentProduct");


--
-- TOC entry 3363 (class 1259 OID 16585)
-- Name: fki_fk_sales_schedules_fulfillment_methods_fulfillment_method; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_sales_schedules_fulfillment_methods_fulfillment_method ON public.sales_schedules_fulfillment_methods USING btree (fulfillment_method_id);


--
-- TOC entry 3364 (class 1259 OID 16586)
-- Name: fki_fk_sales_schedules_fulfillment_methods_sales_schedule; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_sales_schedules_fulfillment_methods_sales_schedule ON public.sales_schedules_fulfillment_methods USING btree (sales_schedule_id);


--
-- TOC entry 3367 (class 1259 OID 16587)
-- Name: fki_fk_sales_schedules_pricelists_pricelists; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_sales_schedules_pricelists_pricelists ON public.sales_schedules_pricelists USING btree (pricelist_id);


--
-- TOC entry 3368 (class 1259 OID 16588)
-- Name: fki_fk_sales_schedules_pricelists_sales_schedules; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_sales_schedules_pricelists_sales_schedules ON public.sales_schedules_pricelists USING btree (sales_schedule_id);


--
-- TOC entry 3371 (class 1259 OID 16589)
-- Name: fki_fk_settings_companies; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_settings_companies ON public.settings USING btree ("ownerId");


--
-- TOC entry 3374 (class 1259 OID 16590)
-- Name: fki_fk_stock_shapes_products; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_stock_shapes_products ON public.stock_shapes USING btree ("productId");


--
-- TOC entry 3375 (class 1259 OID 16591)
-- Name: fki_fk_stock_shapes_units; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_stock_shapes_units ON public.stock_shapes USING btree ("unitId");


--
-- TOC entry 3382 (class 2606 OID 16592)
-- Name: articles fk_article_container; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT fk_article_container FOREIGN KEY ("containerId") REFERENCES public.containers(id) NOT VALID;


--
-- TOC entry 3383 (class 2606 OID 16597)
-- Name: articles fk_article_stockshape; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT fk_article_stockshape FOREIGN KEY ("stockShapeId") REFERENCES public.stock_shapes(id) NOT VALID;


--
-- TOC entry 3384 (class 2606 OID 16602)
-- Name: articles_prices fk_articles_prices_articles; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles_prices
    ADD CONSTRAINT fk_articles_prices_articles FOREIGN KEY ("articleId") REFERENCES public.articles(id) NOT VALID;


--
-- TOC entry 3385 (class 2606 OID 16607)
-- Name: articles_prices fk_articles_prices_pricelists; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles_prices
    ADD CONSTRAINT fk_articles_prices_pricelists FOREIGN KEY ("priceListId") REFERENCES public.pricelists(id) NOT VALID;


--
-- TOC entry 3379 (class 2606 OID 16612)
-- Name: companies fk_companies_contact; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT fk_companies_contact FOREIGN KEY ("mainContactId") REFERENCES public.contacts(id) NOT VALID;


--
-- TOC entry 3380 (class 2606 OID 16728)
-- Name: contacts fk_companies_contacts; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT fk_companies_contacts FOREIGN KEY ("companyId") REFERENCES public.companies(id) NOT VALID;


--
-- TOC entry 3378 (class 2606 OID 16617)
-- Name: customers fk_customer_priceList; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "fk_customer_priceList" FOREIGN KEY ("priceListId") REFERENCES public.pricelists(id) NOT VALID;


--
-- TOC entry 3381 (class 2606 OID 16622)
-- Name: products fk_product_product; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_product_product FOREIGN KEY ("parentProduct") REFERENCES public.products(id) NOT VALID;


--
-- TOC entry 3386 (class 2606 OID 16627)
-- Name: sales_schedules_fulfillment_methods fk_sales_schedules_fulfillment_methods_fulfillment_method; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules_fulfillment_methods
    ADD CONSTRAINT fk_sales_schedules_fulfillment_methods_fulfillment_method FOREIGN KEY (fulfillment_method_id) REFERENCES public.fulfillment_methods(id);


--
-- TOC entry 3387 (class 2606 OID 16632)
-- Name: sales_schedules_fulfillment_methods fk_sales_schedules_fulfillment_methods_sales_schedule; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules_fulfillment_methods
    ADD CONSTRAINT fk_sales_schedules_fulfillment_methods_sales_schedule FOREIGN KEY (sales_schedule_id) REFERENCES public.sales_schedules(id);


--
-- TOC entry 3388 (class 2606 OID 16637)
-- Name: sales_schedules_pricelists fk_sales_schedules_pricelists_pricelists; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules_pricelists
    ADD CONSTRAINT fk_sales_schedules_pricelists_pricelists FOREIGN KEY (pricelist_id) REFERENCES public.pricelists(id) NOT VALID;


--
-- TOC entry 3389 (class 2606 OID 16642)
-- Name: sales_schedules_pricelists fk_sales_schedules_pricelists_sales_schedules; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules_pricelists
    ADD CONSTRAINT fk_sales_schedules_pricelists_sales_schedules FOREIGN KEY (sales_schedule_id) REFERENCES public.sales_schedules(id) NOT VALID;


--
-- TOC entry 3390 (class 2606 OID 16647)
-- Name: settings fk_settings_companies; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT fk_settings_companies FOREIGN KEY ("ownerId") REFERENCES public.companies(id) NOT VALID;


--
-- TOC entry 3391 (class 2606 OID 16652)
-- Name: stock_shapes fk_stock_shapes_products; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_shapes
    ADD CONSTRAINT fk_stock_shapes_products FOREIGN KEY ("productId") REFERENCES public.products(id) NOT VALID;


--
-- TOC entry 3392 (class 2606 OID 16657)
-- Name: stock_shapes fk_stock_shapes_units; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_shapes
    ADD CONSTRAINT fk_stock_shapes_units FOREIGN KEY ("unitId") REFERENCES public.units(id) NOT VALID;


--
-- TOC entry 3542 (class 0 OID 0)
-- Dependencies: 219
-- Name: TABLE sales_schedules; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sales_schedules TO administrator;


--
-- TOC entry 3543 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE customers; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.customers TO administrator;


--
-- TOC entry 3544 (class 0 OID 0)
-- Dependencies: 221
-- Name: SEQUENCE companies_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.companies_id_seq TO administrator;


--
-- TOC entry 3545 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE companies; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.companies TO administrator;


--
-- TOC entry 3546 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE contacts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.contacts TO administrator;


--
-- TOC entry 3547 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE containers; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.containers TO administrator;


--
-- TOC entry 3548 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE pricelists; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.pricelists TO administrator;


--
-- TOC entry 3549 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE products; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.products TO administrator;


--
-- TOC entry 3550 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE units; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.units TO administrator;


--
-- TOC entry 3551 (class 0 OID 0)
-- Dependencies: 307
-- Name: FUNCTION register_user(firstname character varying, lastname character varying, email character varying, phone character varying, addressline1 character varying, addressline2 character varying, zipcode character varying, city character varying, password character varying); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.register_user(firstname character varying, lastname character varying, email character varying, phone character varying, addressline1 character varying, addressline2 character varying, zipcode character varying, city character varying, password character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION public.register_user(firstname character varying, lastname character varying, email character varying, phone character varying, addressline1 character varying, addressline2 character varying, zipcode character varying, city character varying, password character varying) TO administrator;


--
-- TOC entry 3552 (class 0 OID 0)
-- Dependencies: 228
-- Name: TABLE articles; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.articles TO administrator;


--
-- TOC entry 3554 (class 0 OID 0)
-- Dependencies: 229
-- Name: SEQUENCE articles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.articles_id_seq TO administrator;


--
-- TOC entry 3555 (class 0 OID 0)
-- Dependencies: 230
-- Name: TABLE articles_prices; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.articles_prices TO administrator;


--
-- TOC entry 3557 (class 0 OID 0)
-- Dependencies: 231
-- Name: SEQUENCE contacts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.contacts_id_seq TO administrator;


--
-- TOC entry 3559 (class 0 OID 0)
-- Dependencies: 232
-- Name: SEQUENCE containers_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.containers_id_seq TO administrator;


--
-- TOC entry 3561 (class 0 OID 0)
-- Dependencies: 233
-- Name: SEQUENCE customers_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.customers_id_seq TO administrator;


--
-- TOC entry 3562 (class 0 OID 0)
-- Dependencies: 234
-- Name: TABLE fulfillment_methods; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.fulfillment_methods TO administrator;


--
-- TOC entry 3564 (class 0 OID 0)
-- Dependencies: 235
-- Name: SEQUENCE fulfillment_method_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.fulfillment_method_id_seq TO administrator;


--
-- TOC entry 3566 (class 0 OID 0)
-- Dependencies: 236
-- Name: SEQUENCE pricelists_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.pricelists_id_seq TO administrator;


--
-- TOC entry 3568 (class 0 OID 0)
-- Dependencies: 237
-- Name: SEQUENCE product_prices_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.product_prices_id_seq TO administrator;


--
-- TOC entry 3570 (class 0 OID 0)
-- Dependencies: 238
-- Name: SEQUENCE products_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.products_id_seq TO administrator;


--
-- TOC entry 3571 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE sales_schedules_fulfillment_methods; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sales_schedules_fulfillment_methods TO administrator;


--
-- TOC entry 3573 (class 0 OID 0)
-- Dependencies: 240
-- Name: SEQUENCE sales_schedules_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.sales_schedules_id_seq TO administrator;


--
-- TOC entry 3574 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE sales_schedules_pricelists; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sales_schedules_pricelists TO administrator;


--
-- TOC entry 3575 (class 0 OID 0)
-- Dependencies: 242
-- Name: SEQUENCE settings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.settings_id_seq TO administrator;


--
-- TOC entry 3576 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.settings TO administrator;


--
-- TOC entry 3577 (class 0 OID 0)
-- Dependencies: 244
-- Name: TABLE stock_shapes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stock_shapes TO administrator;


--
-- TOC entry 3579 (class 0 OID 0)
-- Dependencies: 245
-- Name: SEQUENCE stock_shapes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.stock_shapes_id_seq TO administrator;


--
-- TOC entry 3581 (class 0 OID 0)
-- Dependencies: 246
-- Name: SEQUENCE units_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.units_id_seq TO administrator;


--
-- TOC entry 2170 (class 826 OID 16662)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES  TO administrator;


--
-- TOC entry 3312 (class 3466 OID 17134)
-- Name: postgraphile_watch_ddl; Type: EVENT TRIGGER; Schema: -; Owner: postgres
--

CREATE EVENT TRIGGER postgraphile_watch_ddl ON ddl_command_end
         WHEN TAG IN ('ALTER AGGREGATE', 'ALTER DOMAIN', 'ALTER EXTENSION', 'ALTER FOREIGN TABLE', 'ALTER FUNCTION', 'ALTER POLICY', 'ALTER SCHEMA', 'ALTER TABLE', 'ALTER TYPE', 'ALTER VIEW', 'COMMENT', 'CREATE AGGREGATE', 'CREATE DOMAIN', 'CREATE EXTENSION', 'CREATE FOREIGN TABLE', 'CREATE FUNCTION', 'CREATE INDEX', 'CREATE POLICY', 'CREATE RULE', 'CREATE SCHEMA', 'CREATE TABLE', 'CREATE TABLE AS', 'CREATE VIEW', 'DROP AGGREGATE', 'DROP DOMAIN', 'DROP EXTENSION', 'DROP FOREIGN TABLE', 'DROP FUNCTION', 'DROP INDEX', 'DROP OWNED', 'DROP POLICY', 'DROP RULE', 'DROP SCHEMA', 'DROP TABLE', 'DROP TYPE', 'DROP VIEW', 'GRANT', 'REVOKE', 'SELECT INTO')
   EXECUTE FUNCTION postgraphile_watch.notify_watchers_ddl();


ALTER EVENT TRIGGER postgraphile_watch_ddl OWNER TO postgres;

--
-- TOC entry 3313 (class 3466 OID 17135)
-- Name: postgraphile_watch_drop; Type: EVENT TRIGGER; Schema: -; Owner: postgres
--

CREATE EVENT TRIGGER postgraphile_watch_drop ON sql_drop
   EXECUTE FUNCTION postgraphile_watch.notify_watchers_drop();


ALTER EVENT TRIGGER postgraphile_watch_drop OWNER TO postgres;

-- Completed on 2023-02-22 09:18:42 CET

--
-- PostgreSQL database dump complete
--

