--
-- PostgreSQL database dump
--

-- Dumped from database version 9.5.12
-- Dumped by pg_dump version 9.5.12

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: plpgsql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;


--
-- Name: EXTENSION plpgsql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION plpgsql IS 'PL/pgSQL procedural language';


SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: accounts_facebook; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_facebook (
    facebook_id character varying(32) NOT NULL,
    "user" character(12) NOT NULL
);


--
-- Name: games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.games (
    id character(12) NOT NULL,
    title character varying(256) NOT NULL,
    description text
);


--
-- Name: session_states; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_states (
    session character(12) NOT NULL,
    key character varying(64) NOT NULL,
    value character varying(64) NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id character(12) NOT NULL,
    "user" character(12) NOT NULL,
    game character(12) NOT NULL
);


--
-- Name: test; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test (
    key character(10) NOT NULL,
    value integer NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id character(12) NOT NULL,
    display_name character varying(256) NOT NULL
);


--
-- Name: account_facebook_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_facebook
    ADD CONSTRAINT account_facebook_pkey PRIMARY KEY (facebook_id);


--
-- Name: games_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT games_pkey PRIMARY KEY (id);


--
-- Name: sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: test_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test
    ADD CONSTRAINT test_pkey PRIMARY KEY (key);


--
-- Name: users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: account_facebook_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_facebook
    ADD CONSTRAINT account_facebook_user_fkey FOREIGN KEY ("user") REFERENCES public.users(id);


--
-- Name: session_states_session_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_states
    ADD CONSTRAINT session_states_session_fkey FOREIGN KEY (session) REFERENCES public.sessions(id);


--
-- Name: sessions_game_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_game_fkey FOREIGN KEY (game) REFERENCES public.games(id);


--
-- Name: sessions_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_fkey FOREIGN KEY ("user") REFERENCES public.users(id);


--
-- PostgreSQL database dump complete
--

