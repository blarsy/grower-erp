--
-- PostgreSQL database dump
--

-- Dumped from database version 15.2 (Debian 15.2-1.pgdg110+1)
-- Dumped by pg_dump version 15.2 (Ubuntu 15.2-1.pgdg22.04+1)

-- Started on 2023-03-28 18:40:36 CEST

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
-- TOC entry 3719 (class 0 OID 16502)
-- Dependencies: 234
-- Data for Name: containers; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.containers (id, name, description, refund_price, refund_tax_rate) FROM stdin;
1	Caisse EPS 246	Caisse EPS 246	$4.98	0
2	Sachet kraft "2kg"	Sachet kraft "2kg"	$0.00	0
3	Caisse EPS 216	Caisse EPS 216	$4.98	0
\.


--
-- TOC entry 3723 (class 0 OID 16525)
-- Dependencies: 238
-- Data for Name: products; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.products (id, name, description, "parentProduct") FROM stdin;
1	Poireau	Le célèbre légumes présent presque toute l'année	\N
2	Laitue	Les feuilles de formes, couleurs et textures différentes pour vos salades	\N
3	Chou-fleur	La célèbre inflorescence au goût caractéristique, pour les gratins, les soupes, crus en apéritif, ...	\N
\.


--
-- TOC entry 3724 (class 0 OID 16532)
-- Dependencies: 239
-- Data for Name: units; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.units (id, name, abbreviation) FROM stdin;
1	kilo	Kg
2	pièce	Pc
\.


--
-- TOC entry 3734 (class 0 OID 16593)
-- Dependencies: 250
-- Data for Name: stock_shapes; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.stock_shapes (id, name, "productId", "unitId", "inStock") FROM stdin;
1	Hiver-gros	1	1	50
2	Chambre froide	2	2	45
3	Vrac, variétés et calibres mélangés	3	1	76
\.


--
-- TOC entry 3730 (class 0 OID 16579)
-- Dependencies: 246
-- Data for Name: articles; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.articles (id, "stockShapeId", "containerId", "quantityPerContainer", tax_rate) FROM stdin;
1	1	1	20	6
2	2	1	16	6
3	3	1	20	6
4	3	2	2	6
5	2	2	1	6
\.


--
-- TOC entry 3722 (class 0 OID 16519)
-- Dependencies: 237
-- Data for Name: pricelists; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.pricelists (id, name) FROM stdin;
1	B2B gros
2	B2B
3	B2C promos
4	B2C
\.


--
-- TOC entry 3731 (class 0 OID 16585)
-- Dependencies: 247
-- Data for Name: articles_prices; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.articles_prices (id, "articleId", "priceListId", price) FROM stdin;
2	2	1	$15.00
3	3	1	$42.00
1	1	1	$49.00
4	1	2	$53.00
5	2	2	$23.00
6	3	2	$48.00
7	4	4	$5.20
8	5	4	$1.40
\.


--
-- TOC entry 3717 (class 0 OID 16488)
-- Dependencies: 232
-- Data for Name: companies; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.companies (id, name, "addressLine1", "addressLine2", "companyNumber", "zipCode", city, "mainContactId") FROM stdin;
1	Flo'Maraîchage	Rue Tiefry, 43		BE1234567890	7605	Gaurain	\N
2	Restobon			BE0987654321			\N
3	Cuisine du mess			BE5432198765			\N
\.


--
-- TOC entry 3718 (class 0 OID 16495)
-- Dependencies: 233
-- Data for Name: contacts; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.contacts (id, firstname, lastname, email, phone, "addressLine1", "addressLine2", "zipCode", city, "companyId") FROM stdin;
1	bertrand	larsy	bertrand.larsy@gmail.com	\N	\N	\N	\N	\N	\N
2	John	Doeuf	poupoule@noeuf.cot						3
\.


--
-- TOC entry 3721 (class 0 OID 16511)
-- Dependencies: 236
-- Data for Name: customers_categories; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.customers_categories (id, name, vat_included) FROM stdin;
2	Cuisine de collectivité	f
3	Particulier	f
4	Groupe d'achat	f
1	Restaurant	f
\.


--
-- TOC entry 3715 (class 0 OID 16478)
-- Dependencies: 230
-- Data for Name: customers; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.customers (id, slug, customers_category_id, "eshopAccess", "contactId", "companyId") FROM stdin;
1	6KAK177NTKIV	2	t	2	3
2	8Y3HT4WURI63	1	t	1	2
\.


--
-- TOC entry 3739 (class 0 OID 16608)
-- Dependencies: 256
-- Data for Name: fulfillment_methods; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.fulfillment_methods (id, name, needs_pickup_address, needs_customer_address) FROM stdin;
1	Livraison	f	t
2	Retrait	t	f
\.


--
-- TOC entry 3726 (class 0 OID 16546)
-- Dependencies: 241
-- Data for Name: orders; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.orders (id, confirmation_date, customer_id, fulfillment_method_id) FROM stdin;
\.


--
-- TOC entry 3742 (class 0 OID 16615)
-- Dependencies: 259
-- Data for Name: order_lines; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.order_lines (id, order_id, article_id, quantity_per_container, container_name, container_id, stock_shape_name, in_stock, stock_shape_id, unit_name, unit_abbreviation, unit_id, product_name, product_id, price, quantity_ordered, fulfillment_date, container_refund_price, container_refund_tax_rate, article_tax_rate) FROM stdin;
\.


--
-- TOC entry 3727 (class 0 OID 16553)
-- Dependencies: 242
-- Data for Name: password_recoveries; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.password_recoveries (id, email, creation_date, expiration_date, code, recovery_date) FROM stdin;
\.


--
-- TOC entry 3733 (class 0 OID 16589)
-- Dependencies: 249
-- Data for Name: pricelists_customers_categories; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.pricelists_customers_categories (id, pricelist_id, customers_category_id) FROM stdin;
1	1	2
3	2	1
4	2	4
6	4	3
7	4	4
\.


--
-- TOC entry 3712 (class 0 OID 16459)
-- Dependencies: 227
-- Data for Name: sales_schedules; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.sales_schedules (id, fulfillment_date, name, order_closure_date, delivery_price, free_delivery_turnover, begin_sales_date, disabled) FROM stdin;
\.


--
-- TOC entry 3729 (class 0 OID 16570)
-- Dependencies: 244
-- Data for Name: sales_schedules_customers_categories; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.sales_schedules_customers_categories (id, sales_schedule_id, customers_category_id) FROM stdin;
\.


--
-- TOC entry 3748 (class 0 OID 16626)
-- Dependencies: 265
-- Data for Name: sales_schedules_fulfillment_methods; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.sales_schedules_fulfillment_methods (id, sales_schedule_id, fulfillment_method_id) FROM stdin;
\.


--
-- TOC entry 3750 (class 0 OID 16631)
-- Dependencies: 267
-- Data for Name: settings; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.settings ("ownerId", id, default_tax_rate, default_container_refund_tax_rate) FROM stdin;
1	1	6	0
\.


--
-- TOC entry 3753 (class 0 OID 16640)
-- Dependencies: 270
-- Data for Name: users; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.users (id, contact_id, role, password_hash, salt) FROM stdin;
1	1	administrator	$1$aBEZaLJS$wXUBXJP1dsWncsFwT4D9N0	$1$aBEZaLJS
\.


--
-- TOC entry 3714 (class 0 OID 16467)
-- Dependencies: 229
-- Data for Name: users_invitations; Type: TABLE DATA; Schema: erp; Owner: postgres
--

COPY erp.users_invitations (id, code, role, email, create_date, expiration_date, accepted_date, grantor, "Invitation_mail_last_sent", times_invitation_mail_sent) FROM stdin;
1	3M46QKXSEBTPE82J	administrator	bertrand.larsy@gmail.com	2023-03-26 11:27:28.566941	2023-03-29 11:27:28.566941	\N	\N	\N	0
2	GGPZKYHL0ME0NA36	administrator	bertrand.larsy@gmail.com	2023-03-26 11:30:39.132062	2023-03-29 11:30:39.132062	2023-03-26 11:36:29.899349	\N	\N	0
\.


--
-- TOC entry 3756 (class 0 OID 16865)
-- Dependencies: 273
-- Data for Name: job_queues; Type: TABLE DATA; Schema: worker; Owner: postgres
--

COPY worker.job_queues (queue_name, job_count, locked_at, locked_by) FROM stdin;
\.


--
-- TOC entry 3758 (class 0 OID 16873)
-- Dependencies: 275
-- Data for Name: jobs; Type: TABLE DATA; Schema: worker; Owner: postgres
--

COPY worker.jobs (id, queue_name, task_identifier, payload, priority, run_at, attempts, max_attempts, last_error, created_at, updated_at, key, locked_at, locked_by, revision, flags) FROM stdin;
\.


--
-- TOC entry 3759 (class 0 OID 16927)
-- Dependencies: 276
-- Data for Name: known_crontabs; Type: TABLE DATA; Schema: worker; Owner: postgres
--

COPY worker.known_crontabs (identifier, known_since, last_execution) FROM stdin;
\.


--
-- TOC entry 3755 (class 0 OID 16859)
-- Dependencies: 272
-- Data for Name: migrations; Type: TABLE DATA; Schema: worker; Owner: postgres
--

COPY worker.migrations (id, ts) FROM stdin;
1	2023-03-26 11:35:49.800775+00
2	2023-03-26 11:35:49.912807+00
3	2023-03-26 11:35:49.94661+00
4	2023-03-26 11:35:49.970903+00
5	2023-03-26 11:35:50.001728+00
6	2023-03-26 11:35:50.573469+00
7	2023-03-26 11:35:50.605695+00
8	2023-03-26 11:35:50.619562+00
9	2023-03-26 11:35:50.649827+00
10	2023-03-26 11:35:50.658949+00
\.


--
-- TOC entry 3765 (class 0 OID 0)
-- Dependencies: 252
-- Name: articles_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.articles_id_seq', 5, true);


--
-- TOC entry 3766 (class 0 OID 0)
-- Dependencies: 231
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.companies_id_seq', 3, true);


--
-- TOC entry 3767 (class 0 OID 0)
-- Dependencies: 253
-- Name: contacts_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.contacts_id_seq', 2, true);


--
-- TOC entry 3768 (class 0 OID 0)
-- Dependencies: 254
-- Name: containers_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.containers_id_seq', 3, true);


--
-- TOC entry 3769 (class 0 OID 0)
-- Dependencies: 235
-- Name: customers_categories_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.customers_categories_id_seq', 4, true);


--
-- TOC entry 3770 (class 0 OID 0)
-- Dependencies: 255
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.customers_id_seq', 2, true);


--
-- TOC entry 3771 (class 0 OID 0)
-- Dependencies: 257
-- Name: fulfillment_method_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.fulfillment_method_id_seq', 2, true);


--
-- TOC entry 3772 (class 0 OID 0)
-- Dependencies: 258
-- Name: order_lines_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.order_lines_id_seq', 1, false);


--
-- TOC entry 3773 (class 0 OID 0)
-- Dependencies: 240
-- Name: orders_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.orders_id_seq', 1, false);


--
-- TOC entry 3774 (class 0 OID 0)
-- Dependencies: 260
-- Name: password_recoveries_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.password_recoveries_id_seq', 1, false);


--
-- TOC entry 3775 (class 0 OID 0)
-- Dependencies: 248
-- Name: pricelists_customers_categories_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.pricelists_customers_categories_id_seq', 7, true);


--
-- TOC entry 3776 (class 0 OID 0)
-- Dependencies: 261
-- Name: pricelists_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.pricelists_id_seq', 4, true);


--
-- TOC entry 3777 (class 0 OID 0)
-- Dependencies: 262
-- Name: product_prices_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.product_prices_id_seq', 8, true);


--
-- TOC entry 3778 (class 0 OID 0)
-- Dependencies: 263
-- Name: products_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.products_id_seq', 3, true);


--
-- TOC entry 3779 (class 0 OID 0)
-- Dependencies: 243
-- Name: sales_schedules_customers_categories_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.sales_schedules_customers_categories_id_seq', 1, false);


--
-- TOC entry 3780 (class 0 OID 0)
-- Dependencies: 264
-- Name: sales_schedules_fulfillment_methods_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.sales_schedules_fulfillment_methods_id_seq', 1, false);


--
-- TOC entry 3781 (class 0 OID 0)
-- Dependencies: 266
-- Name: sales_schedules_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.sales_schedules_id_seq', 1, false);


--
-- TOC entry 3782 (class 0 OID 0)
-- Dependencies: 268
-- Name: stock_shapes_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.stock_shapes_id_seq', 3, true);


--
-- TOC entry 3783 (class 0 OID 0)
-- Dependencies: 269
-- Name: units_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.units_id_seq', 2, true);


--
-- TOC entry 3784 (class 0 OID 0)
-- Dependencies: 271
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.users_id_seq', 1, true);


--
-- TOC entry 3785 (class 0 OID 0)
-- Dependencies: 228
-- Name: users_invitations_id_seq; Type: SEQUENCE SET; Schema: erp; Owner: postgres
--

SELECT pg_catalog.setval('erp.users_invitations_id_seq', 2, true);


--
-- TOC entry 3786 (class 0 OID 0)
-- Dependencies: 274
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: worker; Owner: postgres
--

SELECT pg_catalog.setval('worker.jobs_id_seq', 1, false);


-- Completed on 2023-03-28 18:40:36 CEST

--
-- PostgreSQL database dump complete
--

