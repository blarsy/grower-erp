CREATE TABLE public.units
(
    id serial,
    name character varying NOT NULL,
    abbreviation character varying NOT NULL,
    PRIMARY KEY (id)
);

ALTER TABLE IF EXISTS public.units
    OWNER to postgres;

