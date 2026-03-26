--
-- PostgreSQL database dump
--

\restrict SwkBE4FcLJGiI0Y5nJCyqf9A4PfW18m6ve3EFed1p5g09VWf6fvedgFs1oBHYdw

-- Dumped from database version 16.11
-- Dumped by pg_dump version 16.11

-- Started on 2026-02-03 17:04:05

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
-- TOC entry 5 (class 2615 OID 33431)
-- Name: public; Type: SCHEMA; Schema: -; Owner: cyberparc_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO cyberparc_user;

--
-- TOC entry 4942 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: cyberparc_user
--

COMMENT ON SCHEMA public IS '';


--
-- TOC entry 851 (class 1247 OID 33444)
-- Name: Role; Type: TYPE; Schema: public; Owner: cyberparc_user
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'COMPANY'
);


ALTER TYPE public."Role" OWNER TO cyberparc_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 223 (class 1259 OID 33481)
-- Name: Comment; Type: TABLE; Schema: public; Owner: cyberparc_user
--

CREATE TABLE public."Comment" (
    id integer NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "postId" integer NOT NULL,
    "authorId" integer NOT NULL
);


ALTER TABLE public."Comment" OWNER TO cyberparc_user;

--
-- TOC entry 222 (class 1259 OID 33480)
-- Name: Comment_id_seq; Type: SEQUENCE; Schema: public; Owner: cyberparc_user
--

CREATE SEQUENCE public."Comment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Comment_id_seq" OWNER TO cyberparc_user;

--
-- TOC entry 4944 (class 0 OID 0)
-- Dependencies: 222
-- Name: Comment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cyberparc_user
--

ALTER SEQUENCE public."Comment_id_seq" OWNED BY public."Comment".id;


--
-- TOC entry 219 (class 1259 OID 33461)
-- Name: Company; Type: TABLE; Schema: public; Owner: cyberparc_user
--

CREATE TABLE public."Company" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    address text,
    website text,
    "logoUrl" text,
    phone text,
    sector text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Company" OWNER TO cyberparc_user;

--
-- TOC entry 218 (class 1259 OID 33460)
-- Name: Company_id_seq; Type: SEQUENCE; Schema: public; Owner: cyberparc_user
--

CREATE SEQUENCE public."Company_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Company_id_seq" OWNER TO cyberparc_user;

--
-- TOC entry 4945 (class 0 OID 0)
-- Dependencies: 218
-- Name: Company_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cyberparc_user
--

ALTER SEQUENCE public."Company_id_seq" OWNED BY public."Company".id;


--
-- TOC entry 221 (class 1259 OID 33471)
-- Name: Post; Type: TABLE; Schema: public; Owner: cyberparc_user
--

CREATE TABLE public."Post" (
    id integer NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "authorId" integer NOT NULL
);


ALTER TABLE public."Post" OWNER TO cyberparc_user;

--
-- TOC entry 220 (class 1259 OID 33470)
-- Name: Post_id_seq; Type: SEQUENCE; Schema: public; Owner: cyberparc_user
--

CREATE SEQUENCE public."Post_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Post_id_seq" OWNER TO cyberparc_user;

--
-- TOC entry 4946 (class 0 OID 0)
-- Dependencies: 220
-- Name: Post_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cyberparc_user
--

ALTER SEQUENCE public."Post_id_seq" OWNED BY public."Post".id;


--
-- TOC entry 217 (class 1259 OID 33450)
-- Name: User; Type: TABLE; Schema: public; Owner: cyberparc_user
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    role public."Role" DEFAULT 'COMPANY'::public."Role" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "companyId" integer
);


ALTER TABLE public."User" OWNER TO cyberparc_user;

--
-- TOC entry 216 (class 1259 OID 33449)
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: cyberparc_user
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."User_id_seq" OWNER TO cyberparc_user;

--
-- TOC entry 4947 (class 0 OID 0)
-- Dependencies: 216
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: cyberparc_user
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- TOC entry 215 (class 1259 OID 33432)
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: cyberparc_user
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO cyberparc_user;

--
-- TOC entry 4766 (class 2604 OID 33484)
-- Name: Comment id; Type: DEFAULT; Schema: public; Owner: cyberparc_user
--

ALTER TABLE ONLY public."Comment" ALTER COLUMN id SET DEFAULT nextval('public."Comment_id_seq"'::regclass);


--
-- TOC entry 4762 (class 2604 OID 33464)
-- Name: Company id; Type: DEFAULT; Schema: public; Owner: cyberparc_user
--

ALTER TABLE ONLY public."Company" ALTER COLUMN id SET DEFAULT nextval('public."Company_id_seq"'::regclass);


--
-- TOC entry 4764 (class 2604 OID 33474)
-- Name: Post id; Type: DEFAULT; Schema: public; Owner: cyberparc_user
--

ALTER TABLE ONLY public."Post" ALTER COLUMN id SET DEFAULT nextval('public."Post_id_seq"'::regclass);


--
-- TOC entry 4759 (class 2604 OID 33453)
-- Name: User id; Type: DEFAULT; Schema: public; Owner: cyberparc_user
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- TOC entry 4936 (class 0 OID 33481)
-- Dependencies: 223
-- Data for Name: Comment; Type: TABLE DATA; Schema: public; Owner: cyberparc_user
--

COPY public."Comment" (id, content, "createdAt", "updatedAt", "postId", "authorId") FROM stdin;
1	Bienvenue ! Hâte de collaborer avec vous sur des projets innovants.	2026-02-03 15:03:54.198	2026-02-03 15:03:54.198	1	2
2	Excellente initiative ! Nous serions intéressés par cet atelier.	2026-02-03 15:03:54.202	2026-02-03 15:03:54.202	3	1
3	Très intéressant ! Nous avons justement un projet de migration en cours.	2026-02-03 15:03:54.205	2026-02-03 15:03:54.205	4	2
4	Flutter est notre choix numéro 1 ! Très stable et performant.	2026-02-03 15:03:54.208	2026-02-03 15:03:54.208	5	3
5	Nous utilisons React Native avec succès depuis 2 ans.	2026-02-03 15:03:54.211	2026-02-03 15:03:54.211	5	2
6	Super idée ! Nous pouvons vous aider sur la partie web. Contactons-nous !	2026-02-03 15:03:54.214	2026-02-03 15:03:54.214	6	2
7	Nous avons de l'expérience en sécurisation d'API IA. On peut en discuter.	2026-02-03 15:03:54.217	2026-02-03 15:03:54.217	6	3
8	Merci pour l'accueil ! Nous sommes impatients de participer activement.	2026-02-03 15:03:54.219	2026-02-03 15:03:54.219	1	5
\.


--
-- TOC entry 4932 (class 0 OID 33461)
-- Dependencies: 219
-- Data for Name: Company; Type: TABLE DATA; Schema: public; Owner: cyberparc_user
--

COPY public."Company" (id, name, description, address, website, "logoUrl", phone, sector, "createdAt", "updatedAt") FROM stdin;
1	TechInnovate	Startup spécialisée dans l'IA et le machine learning	123 Rue de la Tech, Tunis	https://techinnovate.tn	\N	+216 71 234 567	Intelligence Artificielle	2026-02-03 15:03:53.928	2026-02-03 15:03:53.928
2	WebSolutions Pro	Agence de développement web et mobile	456 Avenue du Développement, Tunis	https://websolutions.tn	\N	+216 71 345 678	Développement Web	2026-02-03 15:03:53.986	2026-02-03 15:03:53.986
3	DataSecure	Expert en cybersécurité et protection des données	789 Boulevard Sécurité, Tunis	https://datasecure.tn	\N	+216 71 456 789	Cybersécurité	2026-02-03 15:03:54.044	2026-02-03 15:03:54.044
4	CloudMasters	Services cloud et infrastructure	321 Rue du Cloud, Tunis	https://cloudmasters.tn	\N	+216 71 567 890	Cloud Computing	2026-02-03 15:03:54.11	2026-02-03 15:03:54.11
5	MobileFirst	Applications mobiles iOS et Android	654 Avenue Mobile, Tunis	https://mobilefirst.tn	\N	+216 71 678 901	Développement Mobile	2026-02-03 15:03:54.176	2026-02-03 15:03:54.176
\.


--
-- TOC entry 4934 (class 0 OID 33471)
-- Dependencies: 221
-- Data for Name: Post; Type: TABLE DATA; Schema: public; Owner: cyberparc_user
--

COPY public."Post" (id, title, content, "createdAt", "updatedAt", "authorId") FROM stdin;
1	Bienvenue au Cyberparc !	Bonjour à tous ! Nous sommes ravis de faire partie de cette communauté technologique. N'hésitez pas à nous contacter pour discuter de projets en IA et machine learning.	2026-02-03 15:03:54.18	2026-02-03 15:03:54.18	1
2	Recherche partenariat développement web	Nous recherchons des partenaires pour collaborer sur des projets web innovants. Si vous êtes intéressés par des synergies, contactez-nous !	2026-02-03 15:03:54.184	2026-02-03 15:03:54.184	2
3	Atelier cybersécurité - Inscriptions ouvertes	DataSecure organise un atelier gratuit sur les bonnes pratiques de cybersécurité pour les entreprises. Places limitées ! Contactez-nous pour vous inscrire.	2026-02-03 15:03:54.187	2026-02-03 15:03:54.187	3
4	Migration vers le cloud : notre retour d'expérience	Nous avons aidé plusieurs entreprises du Cyberparc à migrer vers le cloud. Voici notre retour d'expérience et quelques conseils pour une migration réussie...	2026-02-03 15:03:54.189	2026-02-03 15:03:54.189	4
5	Nouvelles tendances en développement mobile 2026	Quelles sont les technologies mobiles qui vont dominer en 2026 ? Flutter, React Native, ou natif ? Partageons nos expériences !	2026-02-03 15:03:54.192	2026-02-03 15:03:54.192	5
6	Opportunité de collaboration IA + Web	TechInnovate cherche à intégrer des solutions d'IA dans des applications web. Nous aimerions discuter avec des experts en développement web pour explorer les possibilités.	2026-02-03 15:03:54.195	2026-02-03 15:03:54.195	1
\.


--
-- TOC entry 4930 (class 0 OID 33450)
-- Dependencies: 217
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: cyberparc_user
--

COPY public."User" (id, email, password, role, "createdAt", "updatedAt", "companyId") FROM stdin;
1	admin@cyberparc.com	$2a$10$R1QtUlxVvOWoMKZeF9vNveFK1xkRilxAcT1QacrdqUt2IStDyQYay	ADMIN	2026-02-03 15:03:53.87	2026-02-03 15:03:53.87	\N
2	contact@techinnovate.tn	$2a$10$e7gHwtB53ULFZRn5C72EaesXFDdQpAvAxxr0z2GkEpAF5kPQtePFu	COMPANY	2026-02-03 15:03:53.928	2026-02-03 15:03:53.928	1
3	contact@websolutions.tn	$2a$10$Ga6y4yhmtBDzOXwiIP5LUeBrBq8Uke09Q1iOteozimXUAplKBge7y	COMPANY	2026-02-03 15:03:53.986	2026-02-03 15:03:53.986	2
4	contact@datasecure.tn	$2a$10$XtM1M1geyGCEI6e25/EDvOvXM4jjKvwJM6snXPkZSZnc0UgdKIW5a	COMPANY	2026-02-03 15:03:54.044	2026-02-03 15:03:54.044	3
5	contact@cloudmasters.tn	$2a$10$osoKlWEjp7wPmbtjXcPGguuCvLhEr2NIOumQ/wF5os73dsDt.1jQq	COMPANY	2026-02-03 15:03:54.11	2026-02-03 15:03:54.11	4
6	contact@mobilefirst.tn	$2a$10$XmKtnuMe0Cq1DoUMUmDV3.XurEqEGXFR.pfKU0IY76RK72kjbl0..	COMPANY	2026-02-03 15:03:54.176	2026-02-03 15:03:54.176	5
\.


--
-- TOC entry 4928 (class 0 OID 33432)
-- Dependencies: 215
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: cyberparc_user
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
3d757c11-5421-4542-89fa-df43a0e5d829	02d199824291496289f1c975789528f0d7f62da525127b59e3ba2c28b0751f41	2026-02-03 16:03:53.276234+01	20260203150353_init	\N	\N	2026-02-03 16:03:53.229512+01	1
\.


--
-- TOC entry 4948 (class 0 OID 0)
-- Dependencies: 222
-- Name: Comment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cyberparc_user
--

SELECT pg_catalog.setval('public."Comment_id_seq"', 8, true);


--
-- TOC entry 4949 (class 0 OID 0)
-- Dependencies: 218
-- Name: Company_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cyberparc_user
--

SELECT pg_catalog.setval('public."Company_id_seq"', 5, true);


--
-- TOC entry 4950 (class 0 OID 0)
-- Dependencies: 220
-- Name: Post_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cyberparc_user
--

SELECT pg_catalog.setval('public."Post_id_seq"', 6, true);


--
-- TOC entry 4951 (class 0 OID 0)
-- Dependencies: 216
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: cyberparc_user
--

SELECT pg_catalog.setval('public."User_id_seq"', 6, true);


--
-- TOC entry 4780 (class 2606 OID 33489)
-- Name: Comment Comment_pkey; Type: CONSTRAINT; Schema: public; Owner: cyberparc_user
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_pkey" PRIMARY KEY (id);


--
-- TOC entry 4776 (class 2606 OID 33469)
-- Name: Company Company_pkey; Type: CONSTRAINT; Schema: public; Owner: cyberparc_user
--

ALTER TABLE ONLY public."Company"
    ADD CONSTRAINT "Company_pkey" PRIMARY KEY (id);


--
-- TOC entry 4778 (class 2606 OID 33479)
-- Name: Post Post_pkey; Type: CONSTRAINT; Schema: public; Owner: cyberparc_user
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_pkey" PRIMARY KEY (id);


--
-- TOC entry 4773 (class 2606 OID 33459)
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: cyberparc_user
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- TOC entry 4769 (class 2606 OID 33440)
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: cyberparc_user
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 4774 (class 1259 OID 33492)
-- Name: Company_name_key; Type: INDEX; Schema: public; Owner: cyberparc_user
--

CREATE UNIQUE INDEX "Company_name_key" ON public."Company" USING btree (name);


--
-- TOC entry 4770 (class 1259 OID 33491)
-- Name: User_companyId_key; Type: INDEX; Schema: public; Owner: cyberparc_user
--

CREATE UNIQUE INDEX "User_companyId_key" ON public."User" USING btree ("companyId");


--
-- TOC entry 4771 (class 1259 OID 33490)
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: cyberparc_user
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- TOC entry 4783 (class 2606 OID 33508)
-- Name: Comment Comment_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cyberparc_user
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4784 (class 2606 OID 33503)
-- Name: Comment Comment_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cyberparc_user
--

ALTER TABLE ONLY public."Comment"
    ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."Post"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4782 (class 2606 OID 33498)
-- Name: Post Post_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cyberparc_user
--

ALTER TABLE ONLY public."Post"
    ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4781 (class 2606 OID 33493)
-- Name: User User_companyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: cyberparc_user
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Company"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- TOC entry 4943 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: cyberparc_user
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


-- Completed on 2026-02-03 17:04:05

--
-- PostgreSQL database dump complete
--

\unrestrict SwkBE4FcLJGiI0Y5nJCyqf9A4PfW18m6ve3EFed1p5g09VWf6fvedgFs1oBHYdw

