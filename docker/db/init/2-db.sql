--
-- PostgreSQL database dump
--

-- Dumped from database version 15.1 (Debian 15.1-1.pgdg110+1)
-- Dumped by pg_dump version 15.1

-- Started on 2023-02-17 13:37:14 CET

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
-- TOC entry 6 (class 2615 OID 16387)
-- Name: postgraphile_watch; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA postgraphile_watch;


ALTER SCHEMA postgraphile_watch OWNER TO postgres;

--
-- TOC entry 882 (class 1247 OID 16390)
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
-- TOC entry 885 (class 1247 OID 16393)
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
-- TOC entry 888 (class 1247 OID 16396)
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
-- TOC entry 246 (class 1255 OID 16397)
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
-- TOC entry 247 (class 1255 OID 16398)
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
-- TOC entry 248 (class 1255 OID 16399)
-- Name: authenticate_pub_key(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.authenticate_pub_key(pub_key character varying) RETURNS public.jwt_token
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$declare
  account public.contacts;
begin
  select a.* into account
    from public.contacts as a
    where a.public_key = pub_key;

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
end;$$;


ALTER FUNCTION public.authenticate_pub_key(pub_key character varying) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 218 (class 1259 OID 16400)
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
-- TOC entry 3501 (class 0 OID 0)
-- Dependencies: 218
-- Name: TABLE sales_schedules; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.sales_schedules IS '@omit delete,update';


--
-- TOC entry 260 (class 1255 OID 16406)
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
-- TOC entry 219 (class 1259 OID 16407)
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
-- TOC entry 261 (class 1255 OID 16413)
-- Name: customer_by_slug(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.customer_by_slug(slug character varying) RETURNS SETOF public.customers
    LANGUAGE sql STABLE STRICT
    AS $$SELECT *
FROM customers
WHERE customers.slug = customer_by_slug.slug$$;


ALTER FUNCTION public.customer_by_slug(slug character varying) OWNER TO postgres;

--
-- TOC entry 262 (class 1255 OID 16414)
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
-- TOC entry 220 (class 1259 OID 16415)
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
-- TOC entry 221 (class 1259 OID 16416)
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
-- TOC entry 263 (class 1255 OID 16422)
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
-- TOC entry 222 (class 1259 OID 16423)
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
    id integer NOT NULL,
    "firstName" character varying,
    "lastName" character varying NOT NULL,
    email character varying,
    phone character varying,
    "addressLine1" character varying,
    "addressLine2" character varying,
    "zipCode" character varying,
    city character varying,
    public_key character varying,
    "companyId" integer
);


ALTER TABLE public.contacts OWNER TO postgres;

--
-- TOC entry 264 (class 1255 OID 16428)
-- Name: filter_contacts(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.filter_contacts(search_term character varying) RETURNS SETOF public.contacts
    LANGUAGE sql STABLE
    AS $$
  select contacts.*
  from public.contacts
  where "lastName" ilike '%' || search_term || '%' or "firstName" ilike '%' || search_term || '%'
  order by "lastName", "firstName"
  fetch next 40 rows only
$$;


ALTER FUNCTION public.filter_contacts(search_term character varying) OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 16429)
-- Name: containers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.containers (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying NOT NULL
);


ALTER TABLE public.containers OWNER TO postgres;

--
-- TOC entry 265 (class 1255 OID 16434)
-- Name: filter_containers(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.filter_containers(search_term character varying) RETURNS SETOF public.containers
    LANGUAGE sql STABLE
    AS $$  select containers.*
  from public.containers
  where name ilike search_term || '%'$$;


ALTER FUNCTION public.filter_containers(search_term character varying) OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16435)
-- Name: pricelists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pricelists (
    id integer NOT NULL,
    name character varying NOT NULL,
    "vatIncluded" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.pricelists OWNER TO postgres;

--
-- TOC entry 266 (class 1255 OID 16441)
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
-- TOC entry 225 (class 1259 OID 16442)
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
-- TOC entry 267 (class 1255 OID 16447)
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
-- TOC entry 268 (class 1255 OID 16448)
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
-- TOC entry 226 (class 1259 OID 16449)
-- Name: units; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.units (
    id integer NOT NULL,
    name character varying NOT NULL,
    abbreviation character varying NOT NULL
);


ALTER TABLE public.units OWNER TO postgres;

--
-- TOC entry 269 (class 1255 OID 16454)
-- Name: filter_units(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.filter_units(search_term character varying) RETURNS SETOF public.units
    LANGUAGE sql STABLE
    AS $$  select units.*
  from public.units
  where name ilike search_term || '%'$$;


ALTER FUNCTION public.filter_units(search_term character varying) OWNER TO postgres;

--
-- TOC entry 270 (class 1255 OID 16455)
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
-- TOC entry 227 (class 1259 OID 16456)
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
-- TOC entry 228 (class 1259 OID 16461)
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
-- TOC entry 3512 (class 0 OID 0)
-- Dependencies: 228
-- Name: articles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.articles_id_seq OWNED BY public.articles.id;


--
-- TOC entry 229 (class 1259 OID 16462)
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
-- TOC entry 230 (class 1259 OID 16465)
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
-- TOC entry 3515 (class 0 OID 0)
-- Dependencies: 230
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- TOC entry 231 (class 1259 OID 16466)
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
-- TOC entry 3517 (class 0 OID 0)
-- Dependencies: 231
-- Name: containers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.containers_id_seq OWNED BY public.containers.id;


--
-- TOC entry 232 (class 1259 OID 16467)
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
-- TOC entry 3519 (class 0 OID 0)
-- Dependencies: 232
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- TOC entry 233 (class 1259 OID 16468)
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
-- TOC entry 234 (class 1259 OID 16473)
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
-- TOC entry 3522 (class 0 OID 0)
-- Dependencies: 234
-- Name: fulfillment_method_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.fulfillment_method_id_seq OWNED BY public.fulfillment_methods.id;


--
-- TOC entry 235 (class 1259 OID 16474)
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
-- TOC entry 3524 (class 0 OID 0)
-- Dependencies: 235
-- Name: pricelists_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pricelists_id_seq OWNED BY public.pricelists.id;


--
-- TOC entry 236 (class 1259 OID 16475)
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
-- TOC entry 3526 (class 0 OID 0)
-- Dependencies: 236
-- Name: product_prices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_prices_id_seq OWNED BY public.articles_prices.id;


--
-- TOC entry 237 (class 1259 OID 16476)
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
-- TOC entry 3528 (class 0 OID 0)
-- Dependencies: 237
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- TOC entry 238 (class 1259 OID 16477)
-- Name: sales_schedules_fulfillment_methods; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_schedules_fulfillment_methods (
    sales_schedule_id integer NOT NULL,
    fulfillment_method_id integer NOT NULL
);


ALTER TABLE public.sales_schedules_fulfillment_methods OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 16480)
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
-- TOC entry 3531 (class 0 OID 0)
-- Dependencies: 239
-- Name: sales_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sales_schedules_id_seq OWNED BY public.sales_schedules.id;


--
-- TOC entry 240 (class 1259 OID 16481)
-- Name: sales_schedules_pricelists; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sales_schedules_pricelists (
    pricelist_id integer NOT NULL,
    sales_schedule_id integer NOT NULL
);


ALTER TABLE public.sales_schedules_pricelists OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 16484)
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
-- TOC entry 242 (class 1259 OID 16485)
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    "ownerId" integer NOT NULL,
    id integer DEFAULT nextval('public.settings_id_seq'::regclass) NOT NULL
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 16489)
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
-- TOC entry 244 (class 1259 OID 16495)
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
-- TOC entry 3537 (class 0 OID 0)
-- Dependencies: 244
-- Name: stock_shapes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.stock_shapes_id_seq OWNED BY public.stock_shapes.id;


--
-- TOC entry 245 (class 1259 OID 16496)
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
-- TOC entry 3539 (class 0 OID 0)
-- Dependencies: 245
-- Name: units_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.units_id_seq OWNED BY public.units.id;


--
-- TOC entry 3285 (class 2604 OID 16497)
-- Name: articles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles ALTER COLUMN id SET DEFAULT nextval('public.articles_id_seq'::regclass);


--
-- TOC entry 3286 (class 2604 OID 16498)
-- Name: articles_prices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles_prices ALTER COLUMN id SET DEFAULT nextval('public.product_prices_id_seq'::regclass);


--
-- TOC entry 3279 (class 2604 OID 16499)
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- TOC entry 3280 (class 2604 OID 16500)
-- Name: containers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.containers ALTER COLUMN id SET DEFAULT nextval('public.containers_id_seq'::regclass);


--
-- TOC entry 3276 (class 2604 OID 16501)
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- TOC entry 3287 (class 2604 OID 16502)
-- Name: fulfillment_methods id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulfillment_methods ALTER COLUMN id SET DEFAULT nextval('public.fulfillment_method_id_seq'::regclass);


--
-- TOC entry 3281 (class 2604 OID 16503)
-- Name: pricelists id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricelists ALTER COLUMN id SET DEFAULT nextval('public.pricelists_id_seq'::regclass);


--
-- TOC entry 3283 (class 2604 OID 16504)
-- Name: products id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- TOC entry 3274 (class 2604 OID 16505)
-- Name: sales_schedules id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules ALTER COLUMN id SET DEFAULT nextval('public.sales_schedules_id_seq'::regclass);


--
-- TOC entry 3289 (class 2604 OID 16506)
-- Name: stock_shapes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_shapes ALTER COLUMN id SET DEFAULT nextval('public.stock_shapes_id_seq'::regclass);


--
-- TOC entry 3284 (class 2604 OID 16507)
-- Name: units id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units ALTER COLUMN id SET DEFAULT nextval('public.units_id_seq'::regclass);


--
-- TOC entry 3313 (class 2606 OID 16509)
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- TOC entry 3296 (class 2606 OID 16511)
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- TOC entry 3301 (class 2606 OID 16513)
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- TOC entry 3304 (class 2606 OID 16515)
-- Name: containers containers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.containers
    ADD CONSTRAINT containers_pkey PRIMARY KEY (id);


--
-- TOC entry 3294 (class 2606 OID 16517)
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- TOC entry 3322 (class 2606 OID 16519)
-- Name: fulfillment_methods fulfillment_method_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.fulfillment_methods
    ADD CONSTRAINT fulfillment_method_pkey PRIMARY KEY (id);


--
-- TOC entry 3306 (class 2606 OID 16521)
-- Name: pricelists pricelists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pricelists
    ADD CONSTRAINT pricelists_pkey PRIMARY KEY (id);


--
-- TOC entry 3318 (class 2606 OID 16523)
-- Name: articles_prices product_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles_prices
    ADD CONSTRAINT product_prices_pkey PRIMARY KEY (id);


--
-- TOC entry 3309 (class 2606 OID 16525)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- TOC entry 3326 (class 2606 OID 16527)
-- Name: sales_schedules_fulfillment_methods sales_schedules_fulfillment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules_fulfillment_methods
    ADD CONSTRAINT sales_schedules_fulfillment_methods_pkey PRIMARY KEY (sales_schedule_id, fulfillment_method_id);


--
-- TOC entry 3292 (class 2606 OID 16529)
-- Name: sales_schedules sales_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules
    ADD CONSTRAINT sales_schedules_pkey PRIMARY KEY (id);


--
-- TOC entry 3330 (class 2606 OID 16531)
-- Name: sales_schedules_pricelists sales_schedules_pricelists_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules_pricelists
    ADD CONSTRAINT sales_schedules_pricelists_pkey PRIMARY KEY (pricelist_id, sales_schedule_id);


--
-- TOC entry 3333 (class 2606 OID 16533)
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- TOC entry 3337 (class 2606 OID 16535)
-- Name: stock_shapes stock_shapes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_shapes
    ADD CONSTRAINT stock_shapes_pkey PRIMARY KEY (id);


--
-- TOC entry 3320 (class 2606 OID 16537)
-- Name: articles_prices unique_articlesprices_articlepricelist; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles_prices
    ADD CONSTRAINT unique_articlesprices_articlepricelist UNIQUE ("articleId", "priceListId");


--
-- TOC entry 3299 (class 2606 OID 16539)
-- Name: companies unique_companyNumber; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT "unique_companyNumber" UNIQUE ("companyNumber");


--
-- TOC entry 3311 (class 2606 OID 16541)
-- Name: units units_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- TOC entry 3314 (class 1259 OID 16542)
-- Name: fki_fk_article_container; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_article_container ON public.articles USING btree ("containerId");


--
-- TOC entry 3315 (class 1259 OID 16543)
-- Name: fki_fk_article_stockshape; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_article_stockshape ON public.articles USING btree ("stockShapeId");


--
-- TOC entry 3316 (class 1259 OID 16544)
-- Name: fki_fk_articlesPrice_pricelists; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "fki_fk_articlesPrice_pricelists" ON public.articles_prices USING btree ("priceListId");


--
-- TOC entry 3297 (class 1259 OID 16545)
-- Name: fki_fk_companies_contact; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_companies_contact ON public.companies USING btree ("mainContactId");


--
-- TOC entry 3302 (class 1259 OID 16546)
-- Name: fki_fk_contacts_companies; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_contacts_companies ON public.contacts USING btree ("companyId");


--
-- TOC entry 3307 (class 1259 OID 16547)
-- Name: fki_fk_product_product; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_product_product ON public.products USING btree ("parentProduct");


--
-- TOC entry 3323 (class 1259 OID 16548)
-- Name: fki_fk_sales_schedules_fulfillment_methods_fulfillment_method; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_sales_schedules_fulfillment_methods_fulfillment_method ON public.sales_schedules_fulfillment_methods USING btree (fulfillment_method_id);


--
-- TOC entry 3324 (class 1259 OID 16549)
-- Name: fki_fk_sales_schedules_fulfillment_methods_sales_schedule; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_sales_schedules_fulfillment_methods_sales_schedule ON public.sales_schedules_fulfillment_methods USING btree (sales_schedule_id);


--
-- TOC entry 3327 (class 1259 OID 16550)
-- Name: fki_fk_sales_schedules_pricelists_pricelists; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_sales_schedules_pricelists_pricelists ON public.sales_schedules_pricelists USING btree (pricelist_id);


--
-- TOC entry 3328 (class 1259 OID 16551)
-- Name: fki_fk_sales_schedules_pricelists_sales_schedules; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_sales_schedules_pricelists_sales_schedules ON public.sales_schedules_pricelists USING btree (sales_schedule_id);


--
-- TOC entry 3331 (class 1259 OID 16552)
-- Name: fki_fk_settings_companies; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_settings_companies ON public.settings USING btree ("ownerId");


--
-- TOC entry 3334 (class 1259 OID 16553)
-- Name: fki_fk_stock_shapes_products; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_stock_shapes_products ON public.stock_shapes USING btree ("productId");


--
-- TOC entry 3335 (class 1259 OID 16554)
-- Name: fki_fk_stock_shapes_units; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX fki_fk_stock_shapes_units ON public.stock_shapes USING btree ("unitId");


--
-- TOC entry 3342 (class 2606 OID 16555)
-- Name: articles fk_article_container; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT fk_article_container FOREIGN KEY ("containerId") REFERENCES public.containers(id) NOT VALID;


--
-- TOC entry 3343 (class 2606 OID 16560)
-- Name: articles fk_article_stockshape; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT fk_article_stockshape FOREIGN KEY ("stockShapeId") REFERENCES public.stock_shapes(id) NOT VALID;


--
-- TOC entry 3344 (class 2606 OID 16565)
-- Name: articles_prices fk_articles_prices_articles; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles_prices
    ADD CONSTRAINT fk_articles_prices_articles FOREIGN KEY ("articleId") REFERENCES public.articles(id) NOT VALID;


--
-- TOC entry 3345 (class 2606 OID 16570)
-- Name: articles_prices fk_articles_prices_pricelists; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.articles_prices
    ADD CONSTRAINT fk_articles_prices_pricelists FOREIGN KEY ("priceListId") REFERENCES public.pricelists(id) NOT VALID;


--
-- TOC entry 3339 (class 2606 OID 16575)
-- Name: companies fk_companies_contact; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT fk_companies_contact FOREIGN KEY ("mainContactId") REFERENCES public.contacts(id) NOT VALID;


--
-- TOC entry 3340 (class 2606 OID 16580)
-- Name: contacts fk_contacts_companies; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT fk_contacts_companies FOREIGN KEY ("companyId") REFERENCES public.companies(id) NOT VALID;


--
-- TOC entry 3338 (class 2606 OID 16585)
-- Name: customers fk_customer_priceList; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT "fk_customer_priceList" FOREIGN KEY ("priceListId") REFERENCES public.pricelists(id) NOT VALID;


--
-- TOC entry 3341 (class 2606 OID 16590)
-- Name: products fk_product_product; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fk_product_product FOREIGN KEY ("parentProduct") REFERENCES public.products(id) NOT VALID;


--
-- TOC entry 3346 (class 2606 OID 16595)
-- Name: sales_schedules_fulfillment_methods fk_sales_schedules_fulfillment_methods_fulfillment_method; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules_fulfillment_methods
    ADD CONSTRAINT fk_sales_schedules_fulfillment_methods_fulfillment_method FOREIGN KEY (fulfillment_method_id) REFERENCES public.fulfillment_methods(id);


--
-- TOC entry 3347 (class 2606 OID 16600)
-- Name: sales_schedules_fulfillment_methods fk_sales_schedules_fulfillment_methods_sales_schedule; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules_fulfillment_methods
    ADD CONSTRAINT fk_sales_schedules_fulfillment_methods_sales_schedule FOREIGN KEY (sales_schedule_id) REFERENCES public.sales_schedules(id);


--
-- TOC entry 3348 (class 2606 OID 16605)
-- Name: sales_schedules_pricelists fk_sales_schedules_pricelists_pricelists; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules_pricelists
    ADD CONSTRAINT fk_sales_schedules_pricelists_pricelists FOREIGN KEY (pricelist_id) REFERENCES public.pricelists(id) NOT VALID;


--
-- TOC entry 3349 (class 2606 OID 16610)
-- Name: sales_schedules_pricelists fk_sales_schedules_pricelists_sales_schedules; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sales_schedules_pricelists
    ADD CONSTRAINT fk_sales_schedules_pricelists_sales_schedules FOREIGN KEY (sales_schedule_id) REFERENCES public.sales_schedules(id) NOT VALID;


--
-- TOC entry 3350 (class 2606 OID 16615)
-- Name: settings fk_settings_companies; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT fk_settings_companies FOREIGN KEY ("ownerId") REFERENCES public.companies(id) NOT VALID;


--
-- TOC entry 3351 (class 2606 OID 16620)
-- Name: stock_shapes fk_stock_shapes_products; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_shapes
    ADD CONSTRAINT fk_stock_shapes_products FOREIGN KEY ("productId") REFERENCES public.products(id) NOT VALID;


--
-- TOC entry 3352 (class 2606 OID 16625)
-- Name: stock_shapes fk_stock_shapes_units; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_shapes
    ADD CONSTRAINT fk_stock_shapes_units FOREIGN KEY ("unitId") REFERENCES public.units(id) NOT VALID;


--
-- TOC entry 3500 (class 0 OID 0)
-- Dependencies: 248
-- Name: FUNCTION authenticate_pub_key(pub_key character varying); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.authenticate_pub_key(pub_key character varying) TO anonymous;


--
-- TOC entry 3502 (class 0 OID 0)
-- Dependencies: 218
-- Name: TABLE sales_schedules; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sales_schedules TO administrator;


--
-- TOC entry 3503 (class 0 OID 0)
-- Dependencies: 219
-- Name: TABLE customers; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.customers TO administrator;


--
-- TOC entry 3504 (class 0 OID 0)
-- Dependencies: 220
-- Name: SEQUENCE companies_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.companies_id_seq TO administrator;


--
-- TOC entry 3505 (class 0 OID 0)
-- Dependencies: 221
-- Name: TABLE companies; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.companies TO administrator;


--
-- TOC entry 3506 (class 0 OID 0)
-- Dependencies: 222
-- Name: TABLE contacts; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.contacts TO administrator;


--
-- TOC entry 3507 (class 0 OID 0)
-- Dependencies: 223
-- Name: TABLE containers; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.containers TO administrator;


--
-- TOC entry 3508 (class 0 OID 0)
-- Dependencies: 224
-- Name: TABLE pricelists; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.pricelists TO administrator;


--
-- TOC entry 3509 (class 0 OID 0)
-- Dependencies: 225
-- Name: TABLE products; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.products TO administrator;


--
-- TOC entry 3510 (class 0 OID 0)
-- Dependencies: 226
-- Name: TABLE units; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.units TO administrator;


--
-- TOC entry 3511 (class 0 OID 0)
-- Dependencies: 227
-- Name: TABLE articles; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.articles TO administrator;


--
-- TOC entry 3513 (class 0 OID 0)
-- Dependencies: 228
-- Name: SEQUENCE articles_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.articles_id_seq TO administrator;


--
-- TOC entry 3514 (class 0 OID 0)
-- Dependencies: 229
-- Name: TABLE articles_prices; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.articles_prices TO administrator;


--
-- TOC entry 3516 (class 0 OID 0)
-- Dependencies: 230
-- Name: SEQUENCE contacts_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.contacts_id_seq TO administrator;


--
-- TOC entry 3518 (class 0 OID 0)
-- Dependencies: 231
-- Name: SEQUENCE containers_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.containers_id_seq TO administrator;


--
-- TOC entry 3520 (class 0 OID 0)
-- Dependencies: 232
-- Name: SEQUENCE customers_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.customers_id_seq TO administrator;


--
-- TOC entry 3521 (class 0 OID 0)
-- Dependencies: 233
-- Name: TABLE fulfillment_methods; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.fulfillment_methods TO administrator;


--
-- TOC entry 3523 (class 0 OID 0)
-- Dependencies: 234
-- Name: SEQUENCE fulfillment_method_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.fulfillment_method_id_seq TO administrator;


--
-- TOC entry 3525 (class 0 OID 0)
-- Dependencies: 235
-- Name: SEQUENCE pricelists_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.pricelists_id_seq TO administrator;


--
-- TOC entry 3527 (class 0 OID 0)
-- Dependencies: 236
-- Name: SEQUENCE product_prices_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.product_prices_id_seq TO administrator;


--
-- TOC entry 3529 (class 0 OID 0)
-- Dependencies: 237
-- Name: SEQUENCE products_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.products_id_seq TO administrator;


--
-- TOC entry 3530 (class 0 OID 0)
-- Dependencies: 238
-- Name: TABLE sales_schedules_fulfillment_methods; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sales_schedules_fulfillment_methods TO administrator;


--
-- TOC entry 3532 (class 0 OID 0)
-- Dependencies: 239
-- Name: SEQUENCE sales_schedules_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.sales_schedules_id_seq TO administrator;


--
-- TOC entry 3533 (class 0 OID 0)
-- Dependencies: 240
-- Name: TABLE sales_schedules_pricelists; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sales_schedules_pricelists TO administrator;


--
-- TOC entry 3534 (class 0 OID 0)
-- Dependencies: 241
-- Name: SEQUENCE settings_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.settings_id_seq TO administrator;


--
-- TOC entry 3535 (class 0 OID 0)
-- Dependencies: 242
-- Name: TABLE settings; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.settings TO administrator;


--
-- TOC entry 3536 (class 0 OID 0)
-- Dependencies: 243
-- Name: TABLE stock_shapes; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.stock_shapes TO administrator;


--
-- TOC entry 3538 (class 0 OID 0)
-- Dependencies: 244
-- Name: SEQUENCE stock_shapes_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.stock_shapes_id_seq TO administrator;


--
-- TOC entry 3540 (class 0 OID 0)
-- Dependencies: 245
-- Name: SEQUENCE units_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT USAGE ON SEQUENCE public.units_id_seq TO administrator;


--
-- TOC entry 2130 (class 826 OID 16630)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES  TO administrator;


--
-- TOC entry 3272 (class 3466 OID 16631)
-- Name: postgraphile_watch_ddl; Type: EVENT TRIGGER; Schema: -; Owner: postgres
--

CREATE EVENT TRIGGER postgraphile_watch_ddl ON ddl_command_end
         WHEN TAG IN ('ALTER AGGREGATE', 'ALTER DOMAIN', 'ALTER EXTENSION', 'ALTER FOREIGN TABLE', 'ALTER FUNCTION', 'ALTER POLICY', 'ALTER SCHEMA', 'ALTER TABLE', 'ALTER TYPE', 'ALTER VIEW', 'COMMENT', 'CREATE AGGREGATE', 'CREATE DOMAIN', 'CREATE EXTENSION', 'CREATE FOREIGN TABLE', 'CREATE FUNCTION', 'CREATE INDEX', 'CREATE POLICY', 'CREATE RULE', 'CREATE SCHEMA', 'CREATE TABLE', 'CREATE TABLE AS', 'CREATE VIEW', 'DROP AGGREGATE', 'DROP DOMAIN', 'DROP EXTENSION', 'DROP FOREIGN TABLE', 'DROP FUNCTION', 'DROP INDEX', 'DROP OWNED', 'DROP POLICY', 'DROP RULE', 'DROP SCHEMA', 'DROP TABLE', 'DROP TYPE', 'DROP VIEW', 'GRANT', 'REVOKE', 'SELECT INTO')
   EXECUTE FUNCTION postgraphile_watch.notify_watchers_ddl();


ALTER EVENT TRIGGER postgraphile_watch_ddl OWNER TO postgres;

--
-- TOC entry 3273 (class 3466 OID 16632)
-- Name: postgraphile_watch_drop; Type: EVENT TRIGGER; Schema: -; Owner: postgres
--

CREATE EVENT TRIGGER postgraphile_watch_drop ON sql_drop
   EXECUTE FUNCTION postgraphile_watch.notify_watchers_drop();


ALTER EVENT TRIGGER postgraphile_watch_drop OWNER TO postgres;

-- Completed on 2023-02-17 13:37:14 CET

--
-- PostgreSQL database dump complete
--

