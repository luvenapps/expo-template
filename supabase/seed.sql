SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict ttCQ79duPKs4ID6e8C2lGrxUVCtNOYUvrtY1lGd6qiUXaE8m0be3OljeKrQOMag

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000000', '60a5c042-2c27-465d-86f6-dece1019baee', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"android@test.com","user_id":"a6599f6a-d138-4d5d-94d3-60990c260961","user_phone":""}}', '2025-11-08 18:40:47.594322+00', ''),
	('00000000-0000-0000-0000-000000000000', '0ad48157-0e42-422a-8b86-18baf346a4c5', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"ios@test.com","user_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","user_phone":""}}', '2025-11-08 18:41:02.583607+00', ''),
	('00000000-0000-0000-0000-000000000000', '9f4fa548-92bf-4f8a-a564-529b94364a8d', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-08 18:49:55.460452+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e8b3fb4e-0136-410b-be1e-7512ceca4f6f', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-08 19:18:21.180045+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b53da9ce-285a-43e4-b105-c7b1d0db56ef', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-08 19:19:31.516863+00', ''),
	('00000000-0000-0000-0000-000000000000', '64efd3b3-b5ad-45d7-8aa3-445f5e6eef1a', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-08 20:43:08.520552+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f07e8829-aaf5-4f49-94fc-3252c120ad70', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-08 20:49:57.101387+00', ''),
	('00000000-0000-0000-0000-000000000000', '232d33d3-3241-49f5-b2c7-ad08ec42a9bb', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-08 21:55:13.151798+00', ''),
	('00000000-0000-0000-0000-000000000000', 'dca86915-8a65-4b61-8209-75dcc7bf1005', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-08 23:08:28.198369+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a46ca1ff-6bed-4df8-b3dd-74327d3d6684', '{"action":"user_signedup","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"provider":"email","user_email":"web@test.com","user_id":"10c13703-2fa9-4c09-8c3b-e3e1696daf85","user_phone":""}}', '2025-11-08 23:14:28.146887+00', ''),
	('00000000-0000-0000-0000-000000000000', '36e7cba9-c9be-4773-89a8-03174c0cb856', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-09 19:48:19.88303+00', ''),
	('00000000-0000-0000-0000-000000000000', '1f4a93b1-0bf4-49eb-9ba9-ba37d7ca3c75', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-09 19:48:51.569661+00', ''),
	('00000000-0000-0000-0000-000000000000', '25665034-7dd9-4284-9a15-078f12904193', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-09 19:49:29.367675+00', ''),
	('00000000-0000-0000-0000-000000000000', '1a34ff37-8263-4662-81a0-5d5a666a5a0e', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-09 19:50:03.205414+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd73b866b-68d8-40bc-8268-d887e34e8edc', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-09 23:39:44.232538+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f7b96dd2-72b5-44b5-ad97-7f687fb2f96e', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-09 23:40:09.352323+00', ''),
	('00000000-0000-0000-0000-000000000000', 'cf1a8ccd-b153-4090-bb46-1b16b93bd8a9', '{"action":"login","actor_id":"10c13703-2fa9-4c09-8c3b-e3e1696daf85","actor_username":"web@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-09 23:40:40.044887+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b227f1fd-05c6-4021-acca-d1e16a614808', '{"action":"login","actor_id":"10c13703-2fa9-4c09-8c3b-e3e1696daf85","actor_username":"web@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-09 23:40:40.045857+00', ''),
	('00000000-0000-0000-0000-000000000000', '7e17aa3b-f84a-44f3-b1d3-87865d6c0bfc', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-10 00:40:51.71084+00', ''),
	('00000000-0000-0000-0000-000000000000', '4cb6656a-68d7-476c-911a-8f288464ab0d', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-10 00:44:27.797542+00', ''),
	('00000000-0000-0000-0000-000000000000', '1872ab0b-f0a9-47f7-b58e-49a910df6dc9', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-10 00:48:19.936269+00', ''),
	('00000000-0000-0000-0000-000000000000', '136c3e60-7fbc-4748-ae6c-5670615ec3d2', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-10 01:47:20.346377+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a9bc9b6e-1948-4e98-9872-46e71169d35f', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-10 01:47:55.045487+00', ''),
	('00000000-0000-0000-0000-000000000000', '5dae9db7-d4f1-421e-90d4-5b3c585659d1', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-10 23:03:05.56551+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b2d4059b-8251-4b57-bfe8-c68b83117dcd', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-10 23:04:44.57806+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ca397d78-8966-4a79-b47f-dacc28ca6c07', '{"action":"login","actor_id":"10c13703-2fa9-4c09-8c3b-e3e1696daf85","actor_username":"web@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-10 23:25:37.456241+00', ''),
	('00000000-0000-0000-0000-000000000000', '1f404b06-19db-4c64-bb2d-52777d6983a4', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-10 23:26:21.458282+00', ''),
	('00000000-0000-0000-0000-000000000000', '427acf95-e027-40c2-9dee-549986dd2177', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-10 23:26:58.863872+00', ''),
	('00000000-0000-0000-0000-000000000000', '22f22000-1293-4603-a1ad-c4cd20c363cc', '{"action":"logout","actor_id":"10c13703-2fa9-4c09-8c3b-e3e1696daf85","actor_username":"web@test.com","actor_via_sso":false,"log_type":"account"}', '2025-11-10 23:27:06.076556+00', ''),
	('00000000-0000-0000-0000-000000000000', '0ca6b2b3-f038-4339-9082-28a48b4530d2', '{"action":"login","actor_id":"10c13703-2fa9-4c09-8c3b-e3e1696daf85","actor_username":"web@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-10 23:27:27.031286+00', ''),
	('00000000-0000-0000-0000-000000000000', '16586f17-c2d2-4a3a-93a6-a9f303c72f45', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-11 05:25:02.814921+00', ''),
	('00000000-0000-0000-0000-000000000000', '3e19f130-884f-4d7a-9db1-6036839bd2ef', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-11 08:23:31.538277+00', ''),
	('00000000-0000-0000-0000-000000000000', '1791a96d-265a-49c4-8856-8313c99c2de2', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-11 08:23:44.140992+00', ''),
	('00000000-0000-0000-0000-000000000000', '1188d5ca-5410-4e13-9581-47ad7570cd20', '{"action":"login","actor_id":"10c13703-2fa9-4c09-8c3b-e3e1696daf85","actor_username":"web@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-11 08:24:03.713537+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bac56d9d-034b-4243-a243-df2b2ff01c8b', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-12 03:26:06.011763+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd78af73f-5d9e-4b53-bc6c-8f3b9cc8c5bb', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-12 03:27:05.124026+00', ''),
	('00000000-0000-0000-0000-000000000000', '474eca5b-9831-43fe-9b71-5b95a243797c', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-14 05:35:23.3267+00', ''),
	('00000000-0000-0000-0000-000000000000', 'da663c54-d0fc-4894-8eee-b83039fe697b', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-14 05:37:24.303945+00', ''),
	('00000000-0000-0000-0000-000000000000', '6dccaebe-eb7a-4a05-8297-56e1c3309e25', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-14 05:37:55.647865+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a8310774-6cc9-42b4-acc2-a5653b620850', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-14 05:59:37.965749+00', ''),
	('00000000-0000-0000-0000-000000000000', '16498fc1-9c95-4c2d-815d-d42fb7311539', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-14 06:00:08.697805+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ee27fece-8d21-4948-b2f7-46e342888dcb', '{"action":"login","actor_id":"10c13703-2fa9-4c09-8c3b-e3e1696daf85","actor_username":"web@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-14 06:14:45.754539+00', ''),
	('00000000-0000-0000-0000-000000000000', '2c237f74-a7c3-4c0f-900d-de1fa2ebd56a', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-15 03:55:50.781991+00', ''),
	('00000000-0000-0000-0000-000000000000', '4a9828dc-5841-49f6-9897-e397ab6d50ad', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-15 05:03:15.718325+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ab9cf735-eb78-48f1-9b14-3c43b897acd0', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-15 05:11:52.126043+00', ''),
	('00000000-0000-0000-0000-000000000000', 'eb2c2857-36fa-488d-b059-ac5ddd23428c', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-15 05:14:08.17415+00', ''),
	('00000000-0000-0000-0000-000000000000', '5c8e8406-0897-49d9-a5fe-a7068335d52d', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-15 05:52:19.296206+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b3d02c1e-ef66-4a2d-a8da-4f2f56167a66', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-15 06:04:27.987484+00', ''),
	('00000000-0000-0000-0000-000000000000', '0bc61031-1db7-47de-a72b-caa5bd91ada5', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-15 06:04:27.997732+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f0b0d184-d1c7-43af-8a95-cefe63400400', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-15 06:53:57.915412+00', ''),
	('00000000-0000-0000-0000-000000000000', 'aab15bc0-5f7f-4f10-94cc-b0a788b49653', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-15 06:54:55.374647+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f1eb981d-bece-4f78-94e1-1b54eba5a9e2', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-14 05:35:23.322793+00', ''),
	('00000000-0000-0000-0000-000000000000', 'acd98284-286a-4c94-bffc-a1f606604efa', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-16 03:17:14.378061+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c6f21e35-7e8d-490d-a197-78c6c1a120af', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-16 03:17:14.384158+00', ''),
	('00000000-0000-0000-0000-000000000000', '23551837-6c47-4e3d-a8b8-f2d504e9ef0e', '{"action":"logout","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account"}', '2025-11-16 04:04:04.859426+00', ''),
	('00000000-0000-0000-0000-000000000000', '0dddd4ef-a4fd-4310-a456-118fb0ece84f', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-16 04:04:23.897362+00', ''),
	('00000000-0000-0000-0000-000000000000', '9012214a-1917-4469-9b8a-ff2d1cd71c2f', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-16 06:00:49.812166+00', ''),
	('00000000-0000-0000-0000-000000000000', '8096d2a9-51ec-4172-bb5e-dbe3fe62fb62', '{"action":"logout","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account"}', '2025-11-16 06:04:24.498469+00', ''),
	('00000000-0000-0000-0000-000000000000', '16905d99-9c53-4d6d-a15b-0d65714a691d', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-16 06:04:41.754314+00', ''),
	('00000000-0000-0000-0000-000000000000', '53643ceb-566a-4b46-a458-88312635a3c2', '{"action":"logout","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account"}', '2025-11-16 06:11:15.807755+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c9dc8c43-86db-433e-87e8-4742ed76c867', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-16 06:11:30.769312+00', ''),
	('00000000-0000-0000-0000-000000000000', 'aba1638c-1984-467f-a214-295524779703', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-16 06:13:42.47433+00', ''),
	('00000000-0000-0000-0000-000000000000', '1cfe47ea-f234-4468-986d-73bda36a395b', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-17 00:31:48.860173+00', ''),
	('00000000-0000-0000-0000-000000000000', 'eb201bf0-d262-498a-88d8-419a66403b6b', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-17 00:38:54.222873+00', ''),
	('00000000-0000-0000-0000-000000000000', 'cbdefb7a-9325-4ace-a117-38f801577f3c', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-17 01:41:52.015681+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a1fec05d-8637-4a56-9819-f157724a1295', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-17 01:50:24.528341+00', ''),
	('00000000-0000-0000-0000-000000000000', 'cdfadbd2-82d1-4023-8fae-3b3575d52a8f', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-17 01:51:19.857135+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a60b8df9-7db0-4dab-b5e9-681460597ce8', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-17 01:51:19.86318+00', ''),
	('00000000-0000-0000-0000-000000000000', '146f538a-45ff-4ba9-a951-657131440b20', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-17 01:57:26.885821+00', ''),
	('00000000-0000-0000-0000-000000000000', '02c4b4ff-a475-4833-a652-206ac16cfbac', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-17 01:59:31.732701+00', ''),
	('00000000-0000-0000-0000-000000000000', '5233b065-7acb-44e1-ac84-d43a9919584f', '{"action":"login","actor_id":"1a8be309-c6ae-486c-aed2-830ba8975ba5","actor_username":"ios@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-17 02:01:13.074616+00', ''),
	('00000000-0000-0000-0000-000000000000', '355c5153-f4b5-46cf-887e-ef90a87ddddb', '{"action":"login","actor_id":"a6599f6a-d138-4d5d-94d3-60990c260961","actor_username":"android@test.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-11-17 02:03:15.547657+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '10c13703-2fa9-4c09-8c3b-e3e1696daf85', 'authenticated', 'authenticated', 'web@test.com', '$2a$10$OwnVp0I2e.C5TGdQ9Oz/5uecs3.pzwwx4k1A3hx/8NR0lAy30XvpK', '2025-11-08 23:14:28.147535+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-11-14 06:14:45.755273+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-11-08 23:14:28.145685+00', '2025-11-14 06:14:45.756554+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'authenticated', 'authenticated', 'ios@test.com', '$2a$10$IVI1BLlv2RWCvjOq3/prh.Pxcv2zrsRRuh4iHVJhxC1j6aqCckMSO', '2025-11-08 18:41:02.584346+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-11-17 02:01:13.075149+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-11-08 18:41:02.58284+00', '2025-11-17 02:01:13.076079+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'authenticated', 'authenticated', 'android@test.com', '$2a$10$mvGx43CIyfoEgNWbs2nz.eMUSsBbB6ixfPo5Fyb3sKhUW1xmTtKy.', '2025-11-08 18:40:47.595692+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-11-17 02:03:15.54807+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-11-08 18:40:47.592703+00', '2025-11-17 02:03:15.548935+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('a6599f6a-d138-4d5d-94d3-60990c260961', 'a6599f6a-d138-4d5d-94d3-60990c260961', '{"sub": "a6599f6a-d138-4d5d-94d3-60990c260961", "email": "android@test.com", "email_verified": false, "phone_verified": false}', 'email', '2025-11-08 18:40:47.593702+00', '2025-11-08 18:40:47.593725+00', '2025-11-08 18:40:47.593725+00', 'd100605c-1da1-4619-9a8b-482f80b72fb7'),
	('1a8be309-c6ae-486c-aed2-830ba8975ba5', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '{"sub": "1a8be309-c6ae-486c-aed2-830ba8975ba5", "email": "ios@test.com", "email_verified": false, "phone_verified": false}', 'email', '2025-11-08 18:41:02.583307+00', '2025-11-08 18:41:02.583327+00', '2025-11-08 18:41:02.583327+00', '27fe10d5-2c2d-4754-a329-b001ab587c76'),
	('10c13703-2fa9-4c09-8c3b-e3e1696daf85', '10c13703-2fa9-4c09-8c3b-e3e1696daf85', '{"sub": "10c13703-2fa9-4c09-8c3b-e3e1696daf85", "email": "web@test.com", "email_verified": false, "phone_verified": false}', 'email', '2025-11-08 23:14:28.146418+00', '2025-11-08 23:14:28.146438+00', '2025-11-08 23:14:28.146438+00', '2b22b24b-497e-4e38-9d3d-d0f8b491814b');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter") VALUES
	('94c18c48-eadc-4e70-8a55-cb96ba9430d6', '10c13703-2fa9-4c09-8c3b-e3e1696daf85', '2025-11-10 23:27:27.031741+00', '2025-11-10 23:27:27.031741+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0.1 Safari/605.1.15', '172.18.0.1', NULL, NULL, NULL, NULL),
	('270d8b8b-00bb-42a1-8f53-f2c48afddbe6', '10c13703-2fa9-4c09-8c3b-e3e1696daf85', '2025-11-11 08:24:03.713932+00', '2025-11-11 08:24:03.713932+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0.1 Safari/605.1.15', '172.18.0.1', NULL, NULL, NULL, NULL),
	('3908fd08-021e-435f-b602-baacfeef05c8', '10c13703-2fa9-4c09-8c3b-e3e1696daf85', '2025-11-14 06:14:45.755328+00', '2025-11-14 06:14:45.755328+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0.1 Safari/605.1.15', '172.18.0.1', NULL, NULL, NULL, NULL),
	('b2442127-1a11-48ef-b6de-14472248b591', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '2025-11-16 06:11:30.7698+00', '2025-11-16 06:11:30.7698+00', NULL, 'aal1', NULL, NULL, 'betterhabits/1 CFNetwork/1335.0.3.4 Darwin/21.6.0', '172.18.0.1', NULL, NULL, NULL, NULL),
	('069632da-bd7e-4ad7-85eb-9cf6f3d56939', 'a6599f6a-d138-4d5d-94d3-60990c260961', '2025-11-16 06:13:42.47462+00', '2025-11-16 06:13:42.47462+00', NULL, 'aal1', NULL, NULL, 'okhttp/4.12.0', '172.18.0.1', NULL, NULL, NULL, NULL),
	('d4883785-e12d-4503-8c16-a4e339d0b3fe', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '2025-11-17 00:31:48.862594+00', '2025-11-17 00:31:48.862594+00', NULL, 'aal1', NULL, NULL, 'betterhabits/1 CFNetwork/1335.0.3.4 Darwin/21.6.0', '172.18.0.1', NULL, NULL, NULL, NULL),
	('769266a0-a3fd-44c1-b265-0094e8932451', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '2025-11-17 00:38:54.22352+00', '2025-11-17 00:38:54.22352+00', NULL, 'aal1', NULL, NULL, 'betterhabits/1 CFNetwork/1335.0.3.4 Darwin/21.6.0', '172.18.0.1', NULL, NULL, NULL, NULL),
	('ba21fe7b-768d-4652-8e1e-8b92d51da9d6', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '2025-11-17 01:41:52.016304+00', '2025-11-17 01:41:52.016304+00', NULL, 'aal1', NULL, NULL, 'betterhabits/1 CFNetwork/1335.0.3.4 Darwin/21.6.0', '172.18.0.1', NULL, NULL, NULL, NULL),
	('55d47a67-1cce-49e3-80bf-de94def92096', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '2025-11-17 01:50:24.529005+00', '2025-11-17 01:50:24.529005+00', NULL, 'aal1', NULL, NULL, 'betterhabits/1 CFNetwork/1335.0.3.4 Darwin/21.6.0', '172.18.0.1', NULL, NULL, NULL, NULL),
	('49cbd9f4-5100-472e-a931-8393bab4aa11', 'a6599f6a-d138-4d5d-94d3-60990c260961', '2025-11-17 01:51:19.863561+00', '2025-11-17 01:51:19.863561+00', NULL, 'aal1', NULL, NULL, 'okhttp/4.12.0', '172.18.0.1', NULL, NULL, NULL, NULL),
	('634bbb3b-23ea-419b-98aa-f702cbad775e', 'a6599f6a-d138-4d5d-94d3-60990c260961', '2025-11-17 01:51:19.864549+00', '2025-11-17 01:51:19.864549+00', NULL, 'aal1', NULL, NULL, 'okhttp/4.12.0', '172.18.0.1', NULL, NULL, NULL, NULL),
	('f05c62a2-9f95-49f7-adc1-a2e2625328dd', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '2025-11-17 01:57:26.886332+00', '2025-11-17 01:57:26.886332+00', NULL, 'aal1', NULL, NULL, 'betterhabits/1 CFNetwork/1335.0.3.4 Darwin/21.6.0', '172.18.0.1', NULL, NULL, NULL, NULL),
	('4c37cdcf-2e7e-4140-9b6d-1882e299d49f', 'a6599f6a-d138-4d5d-94d3-60990c260961', '2025-11-17 01:59:31.733204+00', '2025-11-17 01:59:31.733204+00', NULL, 'aal1', NULL, NULL, 'okhttp/4.12.0', '172.18.0.1', NULL, NULL, NULL, NULL),
	('e8d8a7cb-e227-4e34-8f8f-f5259ed8ddaa', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '2025-11-17 02:01:13.075198+00', '2025-11-17 02:01:13.075198+00', NULL, 'aal1', NULL, NULL, 'betterhabits/1 CFNetwork/3860.100.1 Darwin/25.0.0', '172.18.0.1', NULL, NULL, NULL, NULL),
	('1e77aad2-fbed-4b7f-a473-e085ae0f284f', 'a6599f6a-d138-4d5d-94d3-60990c260961', '2025-11-17 02:03:15.548114+00', '2025-11-17 02:03:15.548114+00', NULL, 'aal1', NULL, NULL, 'okhttp/4.12.0', '172.18.0.1', NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('94c18c48-eadc-4e70-8a55-cb96ba9430d6', '2025-11-10 23:27:27.03257+00', '2025-11-10 23:27:27.03257+00', 'password', '3bd98681-eec1-4f23-a94b-faa3fa35b20b'),
	('270d8b8b-00bb-42a1-8f53-f2c48afddbe6', '2025-11-11 08:24:03.714953+00', '2025-11-11 08:24:03.714953+00', 'password', '5a870dc7-9ad2-4741-acaf-d98603d4b0bb'),
	('3908fd08-021e-435f-b602-baacfeef05c8', '2025-11-14 06:14:45.756683+00', '2025-11-14 06:14:45.756683+00', 'password', '829b6a46-db8b-40b5-aaa3-47475909cb7c'),
	('b2442127-1a11-48ef-b6de-14472248b591', '2025-11-16 06:11:30.770641+00', '2025-11-16 06:11:30.770641+00', 'password', '026ac3f3-33a6-416c-b20b-b042fa88ed49'),
	('069632da-bd7e-4ad7-85eb-9cf6f3d56939', '2025-11-16 06:13:42.475187+00', '2025-11-16 06:13:42.475187+00', 'password', 'd8cde7f1-c28e-46d5-8f3b-a0ded47d154c'),
	('d4883785-e12d-4503-8c16-a4e339d0b3fe', '2025-11-17 00:31:48.865401+00', '2025-11-17 00:31:48.865401+00', 'password', '4764b0ea-45ff-4c4f-bc83-bdcca0f5880d'),
	('769266a0-a3fd-44c1-b265-0094e8932451', '2025-11-17 00:38:54.22508+00', '2025-11-17 00:38:54.22508+00', 'password', '5617d50d-8b34-4c30-90f0-482bdd01d147'),
	('ba21fe7b-768d-4652-8e1e-8b92d51da9d6', '2025-11-17 01:41:52.017393+00', '2025-11-17 01:41:52.017393+00', 'password', '01697d3c-7822-436f-b893-db3d9d80a37f'),
	('55d47a67-1cce-49e3-80bf-de94def92096', '2025-11-17 01:50:24.530613+00', '2025-11-17 01:50:24.530613+00', 'password', 'ed71676f-9503-4c02-9a54-10d65d4efe37'),
	('49cbd9f4-5100-472e-a931-8393bab4aa11', '2025-11-17 01:51:19.865884+00', '2025-11-17 01:51:19.865884+00', 'password', 'adf7d92c-baab-4807-905b-a0f76bc66886'),
	('634bbb3b-23ea-419b-98aa-f702cbad775e', '2025-11-17 01:51:19.867652+00', '2025-11-17 01:51:19.867652+00', 'password', '5f8503e2-45c4-4f72-a1c6-e8553e230dd8'),
	('f05c62a2-9f95-49f7-adc1-a2e2625328dd', '2025-11-17 01:57:26.887527+00', '2025-11-17 01:57:26.887527+00', 'password', 'f3c72334-78b9-4ce3-a2fd-a14b3a5983a6'),
	('4c37cdcf-2e7e-4140-9b6d-1882e299d49f', '2025-11-17 01:59:31.733941+00', '2025-11-17 01:59:31.733941+00', 'password', 'c86d28c4-4b86-4e47-b31a-9082ba3272e6'),
	('e8d8a7cb-e227-4e34-8f8f-f5259ed8ddaa', '2025-11-17 02:01:13.076206+00', '2025-11-17 02:01:13.076206+00', 'password', '38940c08-c70d-4cd7-a42a-267791a562c6'),
	('1e77aad2-fbed-4b7f-a473-e085ae0f284f', '2025-11-17 02:03:15.549047+00', '2025-11-17 02:03:15.549047+00', 'password', 'fd25d8e1-4020-409f-b670-7f96bff49928');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 26, 'lkr3he5qfsge', '10c13703-2fa9-4c09-8c3b-e3e1696daf85', false, '2025-11-10 23:27:27.032043+00', '2025-11-10 23:27:27.032043+00', NULL, '94c18c48-eadc-4e70-8a55-cb96ba9430d6'),
	('00000000-0000-0000-0000-000000000000', 30, 'qfsvp7lvqrgf', '10c13703-2fa9-4c09-8c3b-e3e1696daf85', false, '2025-11-11 08:24:03.714295+00', '2025-11-11 08:24:03.714295+00', NULL, '270d8b8b-00bb-42a1-8f53-f2c48afddbe6'),
	('00000000-0000-0000-0000-000000000000', 39, '6mgt5sgqj6ei', '10c13703-2fa9-4c09-8c3b-e3e1696daf85', false, '2025-11-14 06:14:45.755967+00', '2025-11-14 06:14:45.755967+00', NULL, '3908fd08-021e-435f-b602-baacfeef05c8'),
	('00000000-0000-0000-0000-000000000000', 54, 'dqkyd7da7p7d', '1a8be309-c6ae-486c-aed2-830ba8975ba5', false, '2025-11-16 06:11:30.770183+00', '2025-11-16 06:11:30.770183+00', NULL, 'b2442127-1a11-48ef-b6de-14472248b591'),
	('00000000-0000-0000-0000-000000000000', 55, 'c5bab7fqemmv', 'a6599f6a-d138-4d5d-94d3-60990c260961', false, '2025-11-16 06:13:42.474848+00', '2025-11-16 06:13:42.474848+00', NULL, '069632da-bd7e-4ad7-85eb-9cf6f3d56939'),
	('00000000-0000-0000-0000-000000000000', 56, '5lyeyqshtobo', '1a8be309-c6ae-486c-aed2-830ba8975ba5', false, '2025-11-17 00:31:48.864133+00', '2025-11-17 00:31:48.864133+00', NULL, 'd4883785-e12d-4503-8c16-a4e339d0b3fe'),
	('00000000-0000-0000-0000-000000000000', 57, 's3pancwlu74l', '1a8be309-c6ae-486c-aed2-830ba8975ba5', false, '2025-11-17 00:38:54.223999+00', '2025-11-17 00:38:54.223999+00', NULL, '769266a0-a3fd-44c1-b265-0094e8932451'),
	('00000000-0000-0000-0000-000000000000', 58, '445i2b5w6juj', '1a8be309-c6ae-486c-aed2-830ba8975ba5', false, '2025-11-17 01:41:52.01676+00', '2025-11-17 01:41:52.01676+00', NULL, 'ba21fe7b-768d-4652-8e1e-8b92d51da9d6'),
	('00000000-0000-0000-0000-000000000000', 59, 'fr4gfggl3aa5', '1a8be309-c6ae-486c-aed2-830ba8975ba5', false, '2025-11-17 01:50:24.529754+00', '2025-11-17 01:50:24.529754+00', NULL, '55d47a67-1cce-49e3-80bf-de94def92096'),
	('00000000-0000-0000-0000-000000000000', 60, 'wru5uqpohgep', 'a6599f6a-d138-4d5d-94d3-60990c260961', false, '2025-11-17 01:51:19.864571+00', '2025-11-17 01:51:19.864571+00', NULL, '49cbd9f4-5100-472e-a931-8393bab4aa11'),
	('00000000-0000-0000-0000-000000000000', 61, 'dj5xbq66ngb4', 'a6599f6a-d138-4d5d-94d3-60990c260961', false, '2025-11-17 01:51:19.865508+00', '2025-11-17 01:51:19.865508+00', NULL, '634bbb3b-23ea-419b-98aa-f702cbad775e'),
	('00000000-0000-0000-0000-000000000000', 62, '4o4khbcihq7s', '1a8be309-c6ae-486c-aed2-830ba8975ba5', false, '2025-11-17 01:57:26.88684+00', '2025-11-17 01:57:26.88684+00', NULL, 'f05c62a2-9f95-49f7-adc1-a2e2625328dd'),
	('00000000-0000-0000-0000-000000000000', 63, 'geroqua23pgm', 'a6599f6a-d138-4d5d-94d3-60990c260961', false, '2025-11-17 01:59:31.733491+00', '2025-11-17 01:59:31.733491+00', NULL, '4c37cdcf-2e7e-4140-9b6d-1882e299d49f'),
	('00000000-0000-0000-0000-000000000000', 64, '2digfkpsa64i', '1a8be309-c6ae-486c-aed2-830ba8975ba5', false, '2025-11-17 02:01:13.075624+00', '2025-11-17 02:01:13.075624+00', NULL, 'e8d8a7cb-e227-4e34-8f8f-f5259ed8ddaa'),
	('00000000-0000-0000-0000-000000000000', 65, 'aeh66jmzki5c', 'a6599f6a-d138-4d5d-94d3-60990c260961', false, '2025-11-17 02:03:15.548492+00', '2025-11-17 02:03:15.548492+00', NULL, '1e77aad2-fbed-4b7f-a473-e085ae0f284f');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: devices; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."devices" ("id", "user_id", "platform", "last_sync_at", "created_at", "updated_at", "version", "deleted_at") VALUES
	('de9394f6-1947-4802-8eff-3c24fec8dac7', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'android', '2025-11-08 18:50:04.389+00', '2025-11-08 19:15:46.243+00', '2025-11-08 19:15:46.243+00', 1, NULL),
	('7a458515-6df4-4767-80d0-a6d8926a9782', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'android', '2025-11-08 19:17:23.639+00', '2025-11-08 19:18:23.499+00', '2025-11-08 19:18:23.499+00', 1, NULL),
	('f7770c2b-7a6c-4217-9fe6-035e02beb913', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'android', '2025-11-08 19:18:37.017+00', '2025-11-08 19:19:33.947+00', '2025-11-08 19:19:33.947+00', 1, NULL),
	('fee299ca-9ef9-4d83-ac72-98816bb9a920', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-08 20:43:30.768+00', '2025-11-08 20:44:09.034+00', '2025-11-08 20:44:09.034+00', 1, NULL),
	('a915ce00-86fc-428e-8fa0-374e668b8346', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-08 20:44:28.72+00', '2025-11-08 20:48:54.036+00', '2025-11-08 20:48:54.036+00', 1, NULL),
	('82d1b408-3b4b-457e-9d36-62dccfc75ae4', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-08 20:49:21.537+00', '2025-11-08 20:49:58.398+00', '2025-11-08 20:49:58.398+00', 1, NULL),
	('8782a42d-099f-427e-baef-b6e1d564e057', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'android', '2025-11-09 23:54:11.366+00', '2025-11-09 23:54:15.696+00', '2025-11-09 23:54:15.696+00', 1, NULL),
	('7b7697c3-195b-4971-930a-01e66d63cf99', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'android', '2025-11-10 00:06:13.498+00', '2025-11-10 00:06:13.957+00', '2025-11-10 00:06:13.957+00', 1, NULL),
	('89200430-c229-4532-88a7-f352be946a09', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'android', '2025-11-10 00:22:57.942+00', '2025-11-10 00:23:39.797+00', '2025-11-10 00:23:39.797+00', 1, NULL),
	('0872418a-1066-41ad-beae-a4426cce6538', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'android', '2025-11-10 00:40:58.591+00', '2025-11-10 00:41:52.341+00', '2025-11-10 00:41:52.341+00', 1, NULL),
	('f3047bca-4dda-45b8-a4ba-e006e1857f03', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-10 01:28:57.967+00', '2025-11-10 01:29:03.071+00', '2025-11-10 01:29:03.071+00', 1, NULL),
	('683a4bb9-8184-4f8e-ae82-a56b92d4c7ed', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'android', '2025-11-10 23:03:12.537+00', '2025-11-10 23:03:22.876+00', '2025-11-10 23:03:22.876+00', 1, NULL),
	('17e9c7d4-6da3-433f-bbf7-d8779e960a18', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'android', '2025-11-10 23:03:18.241+00', '2025-11-10 23:03:22.889+00', '2025-11-10 23:03:22.889+00', 1, NULL),
	('9a762684-ccf1-4d0d-9c8c-0e39ddf385f0', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'android', '2025-11-10 23:03:20.18+00', '2025-11-10 23:03:22.901+00', '2025-11-10 23:03:22.901+00', 1, NULL),
	('420ed94b-d01e-4ae9-a34b-5e82646f13a1', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-10 23:04:54.384+00', '2025-11-10 23:04:58.468+00', '2025-11-10 23:04:58.468+00', 1, NULL),
	('6c944c79-971d-4883-8358-7cdc2a2bd6fa', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-10 23:04:56.104+00', '2025-11-10 23:04:58.491+00', '2025-11-10 23:04:58.491+00', 1, NULL),
	('a95a8adf-510a-4091-bbf9-70cf8e54cad8', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-10 23:04:57.384+00', '2025-11-10 23:04:58.505+00', '2025-11-10 23:04:58.505+00', 1, NULL),
	('e186ff23-b68a-4e61-834d-0ae76ac41582', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-15 03:56:21.46+00', '2025-11-15 03:56:26.499+00', '2025-11-15 03:56:26.499+00', 1, NULL),
	('bdb0d070-5aac-4daa-9c73-7af0a12f2f82', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-15 03:56:24.376+00', '2025-11-15 03:56:26.517+00', '2025-11-15 03:56:26.517+00', 1, NULL),
	('95253933-2375-448e-b8fb-69dafcca7d35', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-15 03:56:25.667+00', '2025-11-15 03:56:26.531+00', '2025-11-15 03:56:26.531+00', 1, NULL),
	('6703b1f4-bcad-4c49-a62a-d638a38e4106', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-15 05:11:59.147+00', '2025-11-15 05:12:54.566+00', '2025-11-15 05:12:54.566+00', 1, NULL),
	('6d5b5e4f-4c8b-4df6-85e8-3d82651be262', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-15 05:12:00.311+00', '2025-11-15 05:12:54.583+00', '2025-11-15 05:12:54.583+00', 1, NULL),
	('3c60bbf6-79d1-4631-812d-e0c13e4a3980', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-15 05:12:02.317+00', '2025-11-15 05:12:54.601+00', '2025-11-15 05:12:54.601+00', 1, NULL),
	('3460c53b-3161-47b5-9a26-b3b4687eeacb', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-15 05:14:16.276+00', '2025-11-15 05:14:54.395+00', '2025-11-15 05:14:54.395+00', 1, NULL),
	('4392c49d-4752-4910-bfb2-a81d1ce5e2ea', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-15 05:14:17.578+00', '2025-11-15 05:14:54.415+00', '2025-11-15 05:14:54.415+00', 1, NULL),
	('63212d63-581d-4fab-b523-34cc225d50bb', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-15 05:14:18.716+00', '2025-11-15 05:14:54.431+00', '2025-11-15 05:14:54.431+00', 1, NULL),
	('a6f93b03-85e1-4f1b-917e-967acad36da1', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-15 05:03:21.614+00', '2025-11-15 05:20:26.734+00', '2025-11-15 05:20:26.734+00', 1, NULL),
	('61ba807f-c5fb-408e-8877-33f47510fd79', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-15 05:03:22.736+00', '2025-11-15 05:20:26.757+00', '2025-11-15 05:20:26.757+00', 1, NULL),
	('15697d0f-413d-4480-84bf-6251d3733b57', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-15 05:03:23.67+00', '2025-11-15 05:20:26.779+00', '2025-11-15 05:20:26.779+00', 1, NULL),
	('09735959-43c8-4709-b332-c64114716123', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-15 05:24:18.334+00', '2025-11-15 05:24:20.879+00', '2025-11-15 05:24:20.879+00', 1, NULL),
	('698d6fe0-a313-4879-bf79-7c6bf9b0855a', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'android', '2025-11-15 05:52:27.365+00', '2025-11-15 05:52:40.299+00', '2025-11-15 05:52:40.299+00', 1, NULL),
	('1654a73b-be06-495a-a63e-edeb2abad194', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'android', '2025-11-15 05:52:29.628+00', '2025-11-15 05:52:40.315+00', '2025-11-15 05:52:40.315+00', 1, NULL),
	('f3238e22-39e9-4a9a-a066-19f060f660ef', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'android', '2025-11-15 06:04:07.492+00', '2025-11-15 06:04:36.672+00', '2025-11-15 06:04:36.672+00', 1, NULL),
	('24e7538a-008d-4e92-8205-b8a2803ad5fa', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'android', '2025-11-15 06:04:08.208+00', '2025-11-15 06:04:36.688+00', '2025-11-15 06:04:36.688+00', 1, NULL),
	('ce34459d-b7eb-4252-840b-11018bd8817a', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-15 06:54:04.744+00', '2025-11-15 06:54:13.143+00', '2025-11-15 06:54:13.143+00', 1, NULL),
	('ac714838-2fd8-4a9d-a621-c5c45b918beb', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-15 06:54:06.153+00', '2025-11-15 06:54:13.156+00', '2025-11-15 06:54:13.156+00', 1, NULL),
	('10c36f9e-c891-4517-8e42-94f55c172267', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2023-10-15 05:55:17.092+00', '2025-11-15 06:55:34.104+00', '2025-11-15 06:55:34.104+00', 1, NULL),
	('7f692155-f352-4e81-ad7c-420d868476be', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2023-10-15 05:55:18.436+00', '2025-11-15 06:55:34.119+00', '2025-11-15 06:55:34.119+00', 1, NULL),
	('597e93a0-2df8-41e9-923b-e541ec3f251b', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2023-10-15 05:55:19.616+00', '2025-11-15 06:55:34.132+00', '2025-11-15 06:55:34.132+00', 1, NULL),
	('885f5513-9249-46c7-a0ea-5e7d2cd1ef61', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:18:20.601+00', '2025-11-16 03:18:31.26+00', '2025-11-16 03:18:31.26+00', 1, NULL),
	('e64997f6-ef12-4f16-865b-0e1a2a2046f6', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:18:21.34+00', '2025-11-16 03:18:31.274+00', '2025-11-16 03:18:31.274+00', 1, NULL),
	('a8fcbac0-07d0-44a1-9682-6eaa7065da81', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:18:21.839+00', '2025-11-16 03:18:31.288+00', '2025-11-16 03:18:31.288+00', 1, NULL),
	('5dd3b3ee-cd41-4176-a8c8-66320104cee1', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:18:22.291+00', '2025-11-16 03:18:31.3+00', '2025-11-16 03:18:31.3+00', 1, NULL),
	('fac723b5-48d1-4086-a9b0-45582fa15c58', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:18:22.723+00', '2025-11-16 03:18:31.312+00', '2025-11-16 03:18:31.312+00', 1, NULL),
	('a7e071e1-15da-4d01-a547-03706746a610', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:18:23.047+00', '2025-11-16 03:18:31.324+00', '2025-11-16 03:18:31.324+00', 1, NULL),
	('0813c165-5a1e-4344-a730-83774ad4c35e', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:18:51.722+00', '2025-11-16 03:19:14.693+00', '2025-11-16 03:19:14.693+00', 1, NULL),
	('8c55a535-42f5-442d-81c6-1c60e9635718', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:18:52.439+00', '2025-11-16 03:19:14.708+00', '2025-11-16 03:19:14.708+00', 1, NULL),
	('d7bd771f-c656-4677-92d5-9e4bc8cb1347', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:18:53.171+00', '2025-11-16 03:19:14.724+00', '2025-11-16 03:19:14.724+00', 1, NULL),
	('6d64e4d0-2c1c-4486-a018-fa6d987d8533', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:18:53.875+00', '2025-11-16 03:19:14.738+00', '2025-11-16 03:19:14.738+00', 1, NULL),
	('e67034f6-4015-487a-b42b-25af7c781438', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:18:54.589+00', '2025-11-16 03:19:14.758+00', '2025-11-16 03:19:14.758+00', 1, NULL),
	('241a89ef-6a33-4f4d-9e26-ceaad6433bc2', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:18:55.257+00', '2025-11-16 03:19:14.773+00', '2025-11-16 03:19:14.773+00', 1, NULL),
	('60b8ce71-9498-4052-b3fd-7a852d190d26', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:00.174+00', '2025-11-16 03:19:14.785+00', '2025-11-16 03:19:14.785+00', 1, NULL),
	('d650cea2-b800-43ff-9700-4b3c26d9ef06', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:00.743+00', '2025-11-16 03:19:14.797+00', '2025-11-16 03:19:14.797+00', 1, NULL),
	('a454c63e-e26e-4529-a765-bfe456fc71de', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:01.315+00', '2025-11-16 03:19:14.808+00', '2025-11-16 03:19:14.808+00', 1, NULL),
	('12858472-6b33-4ee4-b155-c5ca53cac5dd', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:01.957+00', '2025-11-16 03:19:14.82+00', '2025-11-16 03:19:14.82+00', 1, NULL),
	('f6f46031-3e02-4329-8835-5e10294354aa', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:02.5+00', '2025-11-16 03:19:14.831+00', '2025-11-16 03:19:14.831+00', 1, NULL),
	('7f089652-be1d-4f4b-86ce-4905cf4fffd4', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:03.746+00', '2025-11-16 03:19:14.842+00', '2025-11-16 03:19:14.842+00', 1, NULL),
	('cfc2800f-3a1c-457a-bb54-2e8b8cc11b0c', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:08.589+00', '2025-11-16 03:19:36.282+00', '2025-11-16 03:19:36.282+00', 1, NULL),
	('9fe0006e-56b4-4a68-a1f3-88938a3387f7', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:09.229+00', '2025-11-16 03:19:36.301+00', '2025-11-16 03:19:36.301+00', 1, NULL),
	('6704e213-d192-49e1-96c4-38a1b4055038', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:09.722+00', '2025-11-16 03:19:36.312+00', '2025-11-16 03:19:36.312+00', 1, NULL),
	('a4fcca79-82e8-4238-a084-73489649ca35', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:10.191+00', '2025-11-16 03:19:36.324+00', '2025-11-16 03:19:36.324+00', 1, NULL),
	('09b8010d-de00-45ac-ba7f-833185ef49a2', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:10.65+00', '2025-11-16 03:19:36.335+00', '2025-11-16 03:19:36.335+00', 1, NULL),
	('5ad5de17-340a-4541-8964-3740f5a11df5', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:11.624+00', '2025-11-16 03:19:36.346+00', '2025-11-16 03:19:36.346+00', 1, NULL),
	('aad4e080-1013-4609-8ea2-47e7a707c617', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:17.969+00', '2025-11-16 03:19:36.356+00', '2025-11-16 03:19:36.356+00', 1, NULL),
	('ecd24e57-a16d-49bd-9abe-adcdc962d606', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:18.806+00', '2025-11-16 03:19:36.366+00', '2025-11-16 03:19:36.366+00', 1, NULL),
	('4d9663dd-8482-4cd4-bc32-3f1632d0fbef', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:19.522+00', '2025-11-16 03:19:36.378+00', '2025-11-16 03:19:36.378+00', 1, NULL),
	('71d850d9-33d0-4d2f-b10e-f22036cf0527', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:20.295+00', '2025-11-16 03:19:36.39+00', '2025-11-16 03:19:36.39+00', 1, NULL),
	('6270368a-e3eb-46d4-9107-dd3da08995c4', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:20.97+00', '2025-11-16 03:19:36.401+00', '2025-11-16 03:19:36.401+00', 1, NULL),
	('26fb9962-8b7c-47e5-93f4-f76df615e9ee', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:26.375+00', '2025-11-16 03:19:36.411+00', '2025-11-16 03:19:36.411+00', 1, NULL),
	('4400618a-9c99-4a86-b84a-a18b40011dba', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:27.107+00', '2025-11-16 03:19:36.42+00', '2025-11-16 03:19:36.42+00', 1, NULL),
	('1cc96a53-c145-40a6-b551-b11a623fab67', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:27.762+00', '2025-11-16 03:20:14.67+00', '2025-11-16 03:20:14.67+00', 1, NULL),
	('f8c70f72-7726-4acc-8c53-082cb77811a9', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:28.454+00', '2025-11-16 03:20:14.686+00', '2025-11-16 03:20:14.686+00', 1, NULL),
	('3dff6f00-97e0-4fc3-9aeb-4c74d6f6e756', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:29.108+00', '2025-11-16 03:20:14.699+00', '2025-11-16 03:20:14.699+00', 1, NULL),
	('3357530c-dd69-4c20-a8fb-dc7f9e55b34e', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-16 03:19:30.48+00', '2025-11-16 03:20:14.715+00', '2025-11-16 03:20:14.715+00', 1, NULL),
	('f7ec2b81-99b9-49dc-924b-c64a5e9e039b', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-17 00:32:05.303+00', '2025-11-17 00:32:06.61+00', '2025-11-17 00:32:06.61+00', 1, NULL),
	('66547a27-de57-4b54-b409-1b4e1a0b4bde', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-17 00:32:34.354+00', '2025-11-17 00:33:43.725+00', '2025-11-17 00:33:43.725+00', 1, NULL),
	('b1f5d970-2efa-4003-a8db-c6c1665c9fa5', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-17 00:33:53.311+00', '2025-11-17 00:33:54.053+00', '2025-11-17 00:33:54.053+00', 1, NULL),
	('f389dc34-5aed-47b0-ab8b-e99ad1fe24c5', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-17 00:37:40.843+00', '2025-11-17 00:38:55.59+00', '2025-11-17 00:38:55.59+00', 1, NULL),
	('99a99df6-7b37-479f-bf8a-5af3eafe6cec', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-17 00:39:12.368+00', '2025-11-17 00:39:32.141+00', '2025-11-17 00:39:32.141+00', 1, NULL),
	('d5b7edab-663d-4cec-a58c-4e618a9788d9', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-17 01:50:43.112+00', '2025-11-17 01:57:28.309+00', '2025-11-17 01:57:28.309+00', 1, NULL),
	('c4af6134-0c12-46f9-be71-514ba2d63b45', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'ios', '2025-11-17 01:57:39.373+00', '2025-11-17 01:57:56.889+00', '2025-11-17 01:57:56.889+00', 1, NULL),
	('f79e5bbf-77df-484a-93eb-e6caefe69ab7', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'android', '2025-11-17 01:51:56.332+00', '2025-11-17 01:59:32.207+00', '2025-11-17 01:59:32.207+00', 1, NULL);


--
-- Data for Name: habits; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."habits" ("id", "user_id", "name", "cadence", "color", "sort_order", "is_archived", "created_at", "updated_at", "version", "deleted_at") VALUES
	('348c207c-f3d5-4302-a22b-7f5ba709ebe5', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'Sample 1:50:04 PM', 'daily', '#60a5fa', 0, false, '2025-11-08 19:15:46.216+00', '2025-11-08 19:15:46.216+00', 1, NULL),
	('a1beec82-bd2f-477a-93c4-9ca4ebcfdb26', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'Sample 2:17:23 PM', 'daily', '#60a5fa', 0, false, '2025-11-08 19:18:23.477+00', '2025-11-08 19:18:23.477+00', 1, NULL),
	('af213a2e-3281-4e16-9d47-025e16bdc388', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'Sample 2:18:36 PM', 'daily', '#60a5fa', 0, false, '2025-11-08 19:19:33.92+00', '2025-11-08 19:19:33.92+00', 1, NULL),
	('4fd7ac53-00c1-4a80-9149-fd3b46cf72cb', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 3:43:30 PM', 'daily', '#60a5fa', 0, false, '2025-11-08 20:44:09.006+00', '2025-11-08 20:44:09.006+00', 1, NULL),
	('c2059cbd-f2af-4497-8087-efe873efa725', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 3:44:28 PM', 'daily', '#60a5fa', 0, false, '2025-11-08 20:48:54.006+00', '2025-11-08 20:48:54.006+00', 1, NULL),
	('444c5698-b847-4430-ace8-0c5d6e0c96ef', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 3:49:21 PM', 'daily', '#60a5fa', 0, false, '2025-11-08 20:49:58.376+00', '2025-11-08 20:49:58.376+00', 1, NULL),
	('2cd7bcd0-84ce-4adb-b2b6-7713b17ac91d', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'Sample 6:54:11 PM', 'daily', '#60a5fa', 0, false, '2025-11-09 23:54:15.679+00', '2025-11-09 23:54:15.679+00', 1, NULL),
	('67cbe27b-6201-4e24-8c71-733a9172f1e9', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'Sample 7:06:13 PM', 'daily', '#60a5fa', 0, false, '2025-11-10 00:06:13.932+00', '2025-11-10 00:06:13.932+00', 1, NULL),
	('e50cfc53-c999-49f3-81e6-7ac5f370c04b', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'Sample 7:22:57 PM', 'daily', '#60a5fa', 0, false, '2025-11-10 00:23:39.78+00', '2025-11-10 00:23:39.78+00', 1, NULL),
	('53ef1044-11a2-4f95-b62c-886f5f7a58c8', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'Sample 7:40:58 PM', 'daily', '#60a5fa', 0, false, '2025-11-10 00:41:52.312+00', '2025-11-10 00:41:52.312+00', 1, NULL),
	('b906381c-10ec-469b-9e96-ef381bca4982', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 8:28:57 PM', 'daily', '#60a5fa', 0, false, '2025-11-10 01:29:03.042+00', '2025-11-10 01:29:03.042+00', 1, NULL),
	('19256980-8cf7-41c9-a5fd-d2a59b9bf297', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'Sample 6:03:12 PM', 'daily', '#60A5FA', 0, false, '2025-11-10 23:03:22.86+00', '2025-11-10 23:03:22.86+00', 1, NULL),
	('060271d8-e006-4759-b9aa-eaf23f311570', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'Sample 6:03:18 PM', 'daily', '#60A5FA', 0, false, '2025-11-10 23:03:22.88+00', '2025-11-10 23:03:22.88+00', 1, NULL),
	('8bc62369-813a-4df7-ae1a-f3d0d2e9daeb', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'Sample 6:03:20 PM', 'daily', '#60A5FA', 0, false, '2025-11-10 23:03:22.892+00', '2025-11-10 23:03:22.892+00', 1, NULL),
	('debbfa08-4317-4680-b055-69e7424d319b', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 6:04:54 PM', 'daily', '#60A5FA', 0, false, '2025-11-10 23:04:58.441+00', '2025-11-10 23:04:58.441+00', 1, NULL),
	('d596a2a8-7a1e-42d8-b4a9-e10dd22a0552', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 6:04:56 PM', 'daily', '#60A5FA', 0, false, '2025-11-10 23:04:58.474+00', '2025-11-10 23:04:58.474+00', 1, NULL),
	('e814da4a-1f1d-4e67-832a-50c397b10827', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 6:04:57 PM', 'daily', '#60A5FA', 0, false, '2025-11-10 23:04:58.495+00', '2025-11-10 23:04:58.495+00', 1, NULL),
	('007e6f3b-eced-4349-9e83-c0a9ccc0bc33', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:56:21 PM', 'daily', '#2563EB', 0, false, '2025-11-15 03:56:26.466+00', '2025-11-15 03:56:26.466+00', 1, NULL),
	('8389ed97-1952-499f-89c8-5cff63f9414a', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:56:24 PM', 'daily', '#2563EB', 0, false, '2025-11-15 03:56:26.504+00', '2025-11-15 03:56:26.504+00', 1, NULL),
	('0519ff83-6f47-4f4a-a125-79f386d1704d', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:56:25 PM', 'daily', '#2563EB', 0, false, '2025-11-15 03:56:26.52+00', '2025-11-15 03:56:26.52+00', 1, NULL),
	('aa7b0177-2dfd-4e69-95fd-3596abe8734e', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 12:11:59 AM', 'daily', '#2563EB', 0, false, '2025-11-15 05:12:54.533+00', '2025-11-15 05:12:54.533+00', 1, NULL),
	('e84c2355-5ebd-4bf8-9ceb-09065fc55824', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 12:12:00 AM', 'daily', '#2563EB', 0, false, '2025-11-15 05:12:54.57+00', '2025-11-15 05:12:54.57+00', 1, NULL),
	('b2919270-19b1-45e4-9fac-34fd2164501f', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 12:12:02 AM', 'daily', '#2563EB', 0, false, '2025-11-15 05:12:54.588+00', '2025-11-15 05:12:54.588+00', 1, NULL),
	('15a59cbb-646e-49c4-8260-64286e27237b', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 12:14:16 AM', 'daily', '#2563EB', 0, false, '2025-11-15 05:14:54.364+00', '2025-11-15 05:14:54.364+00', 1, NULL),
	('a1221f87-1869-4fd5-8192-3e424ce2cad0', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 12:14:17 AM', 'daily', '#2563EB', 0, false, '2025-11-15 05:14:54.4+00', '2025-11-15 05:14:54.4+00', 1, NULL),
	('bb1696c5-2571-4b0c-a0e1-031ffc828dea', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 12:14:18 AM', 'daily', '#2563EB', 0, false, '2025-11-15 05:14:54.419+00', '2025-11-15 05:14:54.419+00', 1, NULL),
	('c7c5f1fa-f8fe-49d3-9002-f11804bbbbee', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 12:03:21 AM', 'daily', '#2563EB', 0, false, '2025-11-15 05:20:26.692+00', '2025-11-15 05:20:26.692+00', 1, NULL),
	('8b7c2239-4a5e-4193-a2b1-886f774c7c0c', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 12:03:22 AM', 'daily', '#2563EB', 0, false, '2025-11-15 05:20:26.739+00', '2025-11-15 05:20:26.739+00', 1, NULL),
	('74061081-8df1-48a4-b080-5792f5f8c642', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 12:03:23 AM', 'daily', '#2563EB', 0, false, '2025-11-15 05:20:26.762+00', '2025-11-15 05:20:26.762+00', 1, NULL),
	('34cf8f46-940a-47e6-935a-61972f9819e4', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 12:24:18 AM', 'daily', '#2563EB', 0, false, '2025-11-15 05:24:20.848+00', '2025-11-15 05:24:20.848+00', 1, NULL),
	('8f304b0a-f863-4165-9deb-712feff5b528', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'Sample 12:52:27 AM', 'daily', '#60A5FA', 0, false, '2025-11-15 05:52:40.277+00', '2025-11-15 05:52:40.277+00', 1, NULL),
	('dccff8f0-1ce4-4fe6-a759-1dc8ef4d15f3', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'Sample 12:52:29 AM', 'daily', '#60A5FA', 0, false, '2025-11-15 05:52:40.303+00', '2025-11-15 05:52:40.303+00', 1, NULL),
	('b948bc30-fb41-4268-bbb6-3a82a9dc4eba', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'Sample 1:04:07 AM', 'daily', '#60A5FA', 0, false, '2025-11-15 06:04:36.649+00', '2025-11-15 06:04:36.649+00', 1, NULL),
	('e8d85e8b-c4e7-4f1b-8259-e2d6dd92f7ef', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'Sample 1:04:08 AM', 'daily', '#60A5FA', 0, false, '2025-11-15 06:04:36.678+00', '2025-11-15 06:04:36.678+00', 1, NULL),
	('2647f920-2198-4531-ba0f-4a65c7b50691', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 1:54:04 AM', 'daily', '#2563EB', 0, false, '2025-11-15 06:54:13.123+00', '2025-11-15 06:54:13.123+00', 1, NULL),
	('00af19e2-ca66-495a-a883-a6cc24305cff', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 1:54:06 AM', 'daily', '#2563EB', 0, false, '2025-11-15 06:54:13.147+00', '2025-11-15 06:54:13.147+00', 1, NULL),
	('8020a1f5-ac7d-4d90-9653-af20eeb3248c', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 1:55:17 AM', 'daily', '#2563EB', 0, false, '2025-11-15 06:55:34.065+00', '2025-11-15 06:55:34.065+00', 1, NULL),
	('451af8e3-8b31-4183-bc0d-bf54384114d8', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 1:55:18 AM', 'daily', '#2563EB', 0, false, '2025-11-15 06:55:34.108+00', '2025-11-15 06:55:34.108+00', 1, NULL),
	('2b99b3a9-d426-45af-b0e6-d49b43e962e3', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 1:55:19 AM', 'daily', '#2563EB', 0, false, '2025-11-15 06:55:34.122+00', '2025-11-15 06:55:34.122+00', 1, NULL),
	('416b50cf-b249-47f6-8ccb-1837791876b9', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:18:20 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:18:31.24+00', '2025-11-16 03:18:31.24+00', 1, NULL),
	('899ee4e0-9126-4394-84ca-a01173b933eb', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:18:21 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:18:31.263+00', '2025-11-16 03:18:31.263+00', 1, NULL),
	('3a29f8f6-5e01-48dd-9411-2428cec18b02', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:18:21 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:18:31.278+00', '2025-11-16 03:18:31.278+00', 1, NULL),
	('b97e9940-1011-4ba1-9b91-caa52bdc59a0', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:18:22 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:18:31.29+00', '2025-11-16 03:18:31.29+00', 1, NULL),
	('d8f22634-d4ac-4d00-b2fa-8d1bd3fed49d', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:18:22 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:18:31.304+00', '2025-11-16 03:18:31.304+00', 1, NULL),
	('0f952a25-3d4d-4ebc-9f1a-9c72933fd8c1', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:18:23 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:18:31.315+00', '2025-11-16 03:18:31.315+00', 1, NULL),
	('1e12b217-9ea8-448a-9089-ddb992f0affe', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:18:51 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:14.671+00', '2025-11-16 03:19:14.671+00', 1, NULL),
	('5a389861-6a08-4184-be78-dbbd6af16958', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:18:52 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:14.696+00', '2025-11-16 03:19:14.696+00', 1, NULL),
	('7c644956-e9a3-49db-8f3d-c2f49263f5cf', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:18:53 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:14.711+00', '2025-11-16 03:19:14.711+00', 1, NULL),
	('9aee6fc6-8bd4-44e5-869c-ed9c8276761e', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:18:53 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:14.728+00', '2025-11-16 03:19:14.728+00', 1, NULL),
	('b071bbc6-e419-4f76-b730-1933f34e7aa8', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:18:54 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:14.741+00', '2025-11-16 03:19:14.741+00', 1, NULL),
	('819d279c-8447-4775-9a4e-3820041a42d2', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:18:55 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:14.762+00', '2025-11-16 03:19:14.762+00', 1, NULL),
	('04447dbb-dac1-402a-8295-17e56e9a098a', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:00 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:14.776+00', '2025-11-16 03:19:14.776+00', 1, NULL),
	('314a9857-a5a9-44e3-bc70-dd786e342914', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:00 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:14.788+00', '2025-11-16 03:19:14.788+00', 1, NULL),
	('f0e9239f-4621-4e16-baa6-28344b676281', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:01 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:14.799+00', '2025-11-16 03:19:14.799+00', 1, NULL),
	('f13295dc-adfa-48d8-b1d4-16adcb5ca548', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:01 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:14.811+00', '2025-11-16 03:19:14.811+00', 1, NULL),
	('a3298154-463c-46d9-9941-c708e0e8ee92', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:02 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:14.822+00', '2025-11-16 03:19:14.822+00', 1, NULL),
	('9d2dd93e-d978-4704-8440-0301e0c29365', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:03 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:14.834+00', '2025-11-16 03:19:14.834+00', 1, NULL),
	('75ca5f98-7282-453d-98aa-a79d6ba42451', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:08 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:14.844+00', '2025-11-16 03:19:14.844+00', 1, NULL),
	('5c3279d7-1aaf-4953-bbb9-7e272e1da578', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:09 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:36.287+00', '2025-11-16 03:19:36.287+00', 1, NULL),
	('b4839c0b-b088-4174-bf87-1ac21a3a66fe', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:09 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:36.304+00', '2025-11-16 03:19:36.304+00', 1, NULL),
	('9491c272-c414-4643-b307-051f14138882', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:10 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:36.315+00', '2025-11-16 03:19:36.315+00', 1, NULL),
	('3cc695dd-967b-4b7a-9832-c7e868c433d1', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:10 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:36.327+00', '2025-11-16 03:19:36.327+00', 1, NULL),
	('04c37ee8-620c-4828-990c-19da8a272794', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:11 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:36.337+00', '2025-11-16 03:19:36.337+00', 1, NULL),
	('3cb230f2-bb09-40ef-9030-4d520a15f63b', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:17 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:36.348+00', '2025-11-16 03:19:36.348+00', 1, NULL),
	('9dcad4a0-0b24-4808-8676-384cc1b63098', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:18 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:36.358+00', '2025-11-16 03:19:36.358+00', 1, NULL),
	('8e83b1fd-4a1d-48f6-b1d5-77004502b898', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:19 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:36.369+00', '2025-11-16 03:19:36.369+00', 1, NULL),
	('e754619b-b718-4db4-9795-d5cf27b3c454', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:20 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:36.381+00', '2025-11-16 03:19:36.381+00', 1, NULL),
	('e0c5b7c2-c670-47f4-bc21-a46f8e714093', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:20 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:36.393+00', '2025-11-16 03:19:36.393+00', 1, NULL),
	('61829369-ab38-4999-99e2-28377adc20c4', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:26 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:36.403+00', '2025-11-16 03:19:36.403+00', 1, NULL),
	('6151ee6b-cd52-4a53-aa7d-c171e2d5268d', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:27 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:19:36.413+00', '2025-11-16 03:19:36.413+00', 1, NULL),
	('edb59ca7-f129-4f8a-aa38-ee91caef7c0a', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:27 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:20:14.647+00', '2025-11-16 03:20:14.647+00', 1, NULL),
	('c47c7e6d-6a4b-4383-a104-c815e858907e', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:28 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:20:14.674+00', '2025-11-16 03:20:14.674+00', 1, NULL),
	('f642e5f5-7fa4-453b-a797-5b4e4707965a', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:29 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:20:14.689+00', '2025-11-16 03:20:14.689+00', 1, NULL),
	('1bac76b3-0105-489a-a09d-6fdb23d3fe7a', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 10:19:30 PM', 'daily', '#2563EB', 0, false, '2025-11-16 03:20:14.703+00', '2025-11-16 03:20:14.703+00', 1, NULL),
	('118b2dac-f91c-4397-919f-082177423389', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 7:32:05 PM', 'daily', '#60A5FA', 0, false, '2025-11-17 00:32:06.589+00', '2025-11-17 00:32:06.589+00', 1, NULL),
	('2d875574-8d78-42a3-b60c-6a96616c99ce', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 7:32:34 PM', 'daily', '#60A5FA', 0, false, '2025-11-17 00:33:43.681+00', '2025-11-17 00:33:43.681+00', 1, NULL),
	('14bd99ec-7612-4e59-8167-faac81eb6b4b', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 7:33:53 PM', 'daily', '#60A5FA', 0, false, '2025-11-17 00:33:54.024+00', '2025-11-17 00:33:54.024+00', 1, NULL),
	('bad07e12-0d70-4e51-b4bb-097d9ea0777b', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 7:37:40 PM', 'daily', '#60A5FA', 0, false, '2025-11-17 00:38:55.562+00', '2025-11-17 00:38:55.562+00', 1, NULL),
	('6457ae1a-0fd7-4de0-8082-e0c4489af663', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 7:39:12 PM', 'daily', '#60A5FA', 0, false, '2025-11-17 00:39:32.112+00', '2025-11-17 00:39:32.112+00', 1, NULL),
	('54008a26-49d9-4bae-8b8d-97fe63d731aa', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 8:50:43 PM', 'daily', '#60A5FA', 0, false, '2025-11-17 01:57:28.282+00', '2025-11-17 01:57:28.282+00', 1, NULL),
	('edac6c29-ddfd-44ca-b838-997d0ba7c476', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'Sample 8:57:39 PM', 'daily', '#60A5FA', 0, false, '2025-11-17 01:57:56.87+00', '2025-11-17 01:57:56.87+00', 1, NULL),
	('557d773a-f588-473a-96cf-0dff54d0ce62', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'Sample 8:51:56 PM', 'daily', '#60A5FA', 0, false, '2025-11-17 01:59:32.187+00', '2025-11-17 01:59:32.187+00', 1, NULL);


--
-- Data for Name: habit_entries; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."habit_entries" ("id", "user_id", "habit_id", "date", "amount", "source", "created_at", "updated_at", "version", "deleted_at") VALUES
	('8e7e2ee8-2fe2-419c-9a91-8e9f4f1b26e6', 'a6599f6a-d138-4d5d-94d3-60990c260961', '348c207c-f3d5-4302-a22b-7f5ba709ebe5', '2025-11-08', 1, 'local', '2025-11-08 19:15:46.231+00', '2025-11-08 19:15:46.231+00', 1, NULL),
	('a1645635-5f43-4184-905a-915850346d9f', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'a1beec82-bd2f-477a-93c4-9ca4ebcfdb26', '2025-11-08', 1, 'local', '2025-11-08 19:18:23.489+00', '2025-11-08 19:18:23.489+00', 1, NULL),
	('56a848c1-1c17-42b3-8e82-5af83f8b5d9f', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'af213a2e-3281-4e16-9d47-025e16bdc388', '2025-11-08', 1, 'local', '2025-11-08 19:19:33.934+00', '2025-11-08 19:19:33.934+00', 1, NULL),
	('37edf82b-14bd-4b00-8db4-2660556ac932', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '4fd7ac53-00c1-4a80-9149-fd3b46cf72cb', '2025-11-08', 1, 'local', '2025-11-08 20:44:09.021+00', '2025-11-08 20:44:09.021+00', 1, NULL),
	('19fcf0a5-bbd5-4568-9eca-5d864d0fab9f', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'c2059cbd-f2af-4497-8087-efe873efa725', '2025-11-08', 1, 'local', '2025-11-08 20:48:54.021+00', '2025-11-08 20:48:54.021+00', 1, NULL),
	('50a380e3-a7d0-4350-86c1-d6faf35ff0ee', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '444c5698-b847-4430-ace8-0c5d6e0c96ef', '2025-11-08', 1, 'local', '2025-11-08 20:49:58.388+00', '2025-11-08 20:49:58.388+00', 1, NULL),
	('215ccbdd-e0b0-49f5-9b4e-277d3fb29243', 'a6599f6a-d138-4d5d-94d3-60990c260961', '2cd7bcd0-84ce-4adb-b2b6-7713b17ac91d', '2025-11-09', 1, 'local', '2025-11-09 23:54:15.686+00', '2025-11-09 23:54:15.686+00', 1, NULL),
	('4caa2314-918d-4fdb-9fff-f9aab48860cc', 'a6599f6a-d138-4d5d-94d3-60990c260961', '67cbe27b-6201-4e24-8c71-733a9172f1e9', '2025-11-10', 1, 'local', '2025-11-10 00:06:13.946+00', '2025-11-10 00:06:13.946+00', 1, NULL),
	('4413ff4c-1d9f-4955-b761-ed53d8355d25', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'e50cfc53-c999-49f3-81e6-7ac5f370c04b', '2025-11-10', 1, 'local', '2025-11-10 00:23:39.787+00', '2025-11-10 00:23:39.787+00', 1, NULL),
	('4d0660fa-9de3-4c7c-8ffe-9e9d7bad6ba8', 'a6599f6a-d138-4d5d-94d3-60990c260961', '53ef1044-11a2-4f95-b62c-886f5f7a58c8', '2025-11-10', 1, 'local', '2025-11-10 00:41:52.328+00', '2025-11-10 00:41:52.328+00', 1, NULL),
	('d6928764-bdb7-4308-8dd4-b00790f2b8d3', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'b906381c-10ec-469b-9e96-ef381bca4982', '2025-11-10', 1, 'local', '2025-11-10 01:29:03.059+00', '2025-11-10 01:29:03.059+00', 1, NULL),
	('594543ee-1953-4a1b-b69e-909008af3765', 'a6599f6a-d138-4d5d-94d3-60990c260961', '19256980-8cf7-41c9-a5fd-d2a59b9bf297', '2025-11-10', 1, 'local', '2025-11-10 23:03:22.867+00', '2025-11-10 23:03:22.867+00', 1, NULL),
	('1c34e14b-f1f7-44fe-8500-ae0be213a15c', 'a6599f6a-d138-4d5d-94d3-60990c260961', '060271d8-e006-4759-b9aa-eaf23f311570', '2025-11-10', 1, 'local', '2025-11-10 23:03:22.882+00', '2025-11-10 23:03:22.882+00', 1, NULL),
	('12c6b652-cf91-42d9-81de-8bb300877369', 'a6599f6a-d138-4d5d-94d3-60990c260961', '8bc62369-813a-4df7-ae1a-f3d0d2e9daeb', '2025-11-10', 1, 'local', '2025-11-10 23:03:22.895+00', '2025-11-10 23:03:22.895+00', 1, NULL),
	('49964a17-e6e1-4db2-8a17-37e36bdf4085', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'debbfa08-4317-4680-b055-69e7424d319b', '2025-11-10', 1, 'local', '2025-11-10 23:04:58.451+00', '2025-11-10 23:04:58.451+00', 1, NULL),
	('4888c657-84bb-447e-95e9-346778da6b03', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'd596a2a8-7a1e-42d8-b4a9-e10dd22a0552', '2025-11-10', 1, 'local', '2025-11-10 23:04:58.479+00', '2025-11-10 23:04:58.479+00', 1, NULL),
	('07c4955f-52fa-4938-ba00-473b7d88b18d', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'e814da4a-1f1d-4e67-832a-50c397b10827', '2025-11-10', 1, 'local', '2025-11-10 23:04:58.498+00', '2025-11-10 23:04:58.498+00', 1, NULL),
	('95d56e30-d699-4985-be25-f7076ec994fd', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '007e6f3b-eced-4349-9e83-c0a9ccc0bc33', '2025-11-15', 1, 'local', '2025-11-15 03:56:26.483+00', '2025-11-15 03:56:26.483+00', 1, NULL),
	('14e5b120-aca4-4d56-91cc-ecb916d90fb5', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '8389ed97-1952-499f-89c8-5cff63f9414a', '2025-11-15', 1, 'local', '2025-11-15 03:56:26.507+00', '2025-11-15 03:56:26.507+00', 1, NULL),
	('02e15ad4-a76e-47b1-9198-9288e3f885d2', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '0519ff83-6f47-4f4a-a125-79f386d1704d', '2025-11-15', 1, 'local', '2025-11-15 03:56:26.524+00', '2025-11-15 03:56:26.524+00', 1, NULL),
	('02cb23d7-5ec7-49e9-8ad1-bd1c4297abd6', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'aa7b0177-2dfd-4e69-95fd-3596abe8734e', '2025-11-15', 1, 'local', '2025-11-15 05:12:54.551+00', '2025-11-15 05:12:54.551+00', 1, NULL),
	('ab206c20-3b03-42b7-816c-2fdec34b2dcf', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'e84c2355-5ebd-4bf8-9ceb-09065fc55824', '2025-11-15', 1, 'local', '2025-11-15 05:12:54.574+00', '2025-11-15 05:12:54.574+00', 1, NULL),
	('f1ff46be-a3b4-4f77-a8bd-a553e9267887', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'b2919270-19b1-45e4-9fac-34fd2164501f', '2025-11-15', 1, 'local', '2025-11-15 05:12:54.592+00', '2025-11-15 05:12:54.592+00', 1, NULL),
	('a4aab1ec-a4ba-4dbc-9474-07ddd007b6f0', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '15a59cbb-646e-49c4-8260-64286e27237b', '2025-11-15', 1, 'local', '2025-11-15 05:14:54.381+00', '2025-11-15 05:14:54.381+00', 1, NULL),
	('9290ce9e-3965-46c2-b9cc-373c78bd81bd', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'a1221f87-1869-4fd5-8192-3e424ce2cad0', '2025-11-15', 1, 'local', '2025-11-15 05:14:54.405+00', '2025-11-15 05:14:54.405+00', 1, NULL),
	('a2330714-b846-4b72-88b7-0e4dd09a4a7a', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'bb1696c5-2571-4b0c-a0e1-031ffc828dea', '2025-11-15', 1, 'local', '2025-11-15 05:14:54.423+00', '2025-11-15 05:14:54.423+00', 1, NULL),
	('81ff910c-756a-4be1-8361-19b1bf7471df', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'c7c5f1fa-f8fe-49d3-9002-f11804bbbbee', '2025-11-15', 1, 'local', '2025-11-15 05:20:26.714+00', '2025-11-15 05:20:26.714+00', 1, NULL),
	('1d90deb2-52c5-40a9-b0f6-54ee87254b99', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '8b7c2239-4a5e-4193-a2b1-886f774c7c0c', '2025-11-15', 1, 'local', '2025-11-15 05:20:26.745+00', '2025-11-15 05:20:26.745+00', 1, NULL),
	('67e6934f-cc28-428b-9f1e-321c56118c52', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '74061081-8df1-48a4-b080-5792f5f8c642', '2025-11-15', 1, 'local', '2025-11-15 05:20:26.767+00', '2025-11-15 05:20:26.767+00', 1, NULL),
	('ea7087d2-f5e5-43f4-ab20-5e03fd3c77b1', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '34cf8f46-940a-47e6-935a-61972f9819e4', '2025-11-15', 1, 'local', '2025-11-15 05:24:20.865+00', '2025-11-15 05:24:20.865+00', 1, NULL),
	('8ae88625-e956-4bf5-a3f2-e1b11bdd7aee', 'a6599f6a-d138-4d5d-94d3-60990c260961', '8f304b0a-f863-4165-9deb-712feff5b528', '2025-11-15', 1, 'local', '2025-11-15 05:52:40.287+00', '2025-11-15 05:52:40.287+00', 1, NULL),
	('f6d57608-f07f-4102-bb8a-2f356fdb9311', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'dccff8f0-1ce4-4fe6-a759-1dc8ef4d15f3', '2025-11-15', 1, 'local', '2025-11-15 05:52:40.307+00', '2025-11-15 05:52:40.307+00', 1, NULL),
	('934857f5-2631-47bb-9334-e5cb8c16f821', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'b948bc30-fb41-4268-bbb6-3a82a9dc4eba', '2025-11-15', 1, 'local', '2025-11-15 06:04:36.658+00', '2025-11-15 06:04:36.658+00', 1, NULL),
	('3d9706a0-daaa-437e-bc65-9d8d96ef0842', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'e8d85e8b-c4e7-4f1b-8259-e2d6dd92f7ef', '2025-11-15', 1, 'local', '2025-11-15 06:04:36.681+00', '2025-11-15 06:04:36.681+00', 1, NULL),
	('3bcfa280-bff6-4181-ba28-8c1aeab7d52f', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '2647f920-2198-4531-ba0f-4a65c7b50691', '2025-11-15', 1, 'local', '2025-11-15 06:54:13.131+00', '2025-11-15 06:54:13.131+00', 1, NULL),
	('958b6283-fe45-414c-836f-0dc06068c09a', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '00af19e2-ca66-495a-a883-a6cc24305cff', '2025-11-15', 1, 'local', '2025-11-15 06:54:13.15+00', '2025-11-15 06:54:13.15+00', 1, NULL),
	('7297e403-ced1-47c3-9ed3-ae6f454866fb', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '8020a1f5-ac7d-4d90-9653-af20eeb3248c', '2023-10-15', 1, 'local', '2025-11-15 06:55:34.092+00', '2025-11-15 06:55:34.092+00', 1, NULL),
	('503d5b71-bf28-4a33-bcab-a32e70056d8a', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '451af8e3-8b31-4183-bc0d-bf54384114d8', '2023-10-15', 1, 'local', '2025-11-15 06:55:34.112+00', '2025-11-15 06:55:34.112+00', 1, NULL),
	('e3c6d659-61a8-49ce-9c2d-d0746e00aca6', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '2b99b3a9-d426-45af-b0e6-d49b43e962e3', '2023-10-15', 1, 'local', '2025-11-15 06:55:34.125+00', '2025-11-15 06:55:34.125+00', 1, NULL),
	('60e3bee3-686b-4a6d-ae0d-a545f69e7188', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '416b50cf-b249-47f6-8ccb-1837791876b9', '2025-11-16', 1, 'local', '2025-11-16 03:18:31.249+00', '2025-11-16 03:18:31.249+00', 1, NULL),
	('371a36d7-6507-4618-85dd-ded65c0025b5', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '899ee4e0-9126-4394-84ca-a01173b933eb', '2025-11-16', 1, 'local', '2025-11-16 03:18:31.266+00', '2025-11-16 03:18:31.266+00', 1, NULL),
	('8225e886-0957-4748-b192-28126b42bd49', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '3a29f8f6-5e01-48dd-9411-2428cec18b02', '2025-11-16', 1, 'local', '2025-11-16 03:18:31.281+00', '2025-11-16 03:18:31.281+00', 1, NULL),
	('14699f30-bfee-4048-a8c3-a28b1d56569f', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'b97e9940-1011-4ba1-9b91-caa52bdc59a0', '2025-11-16', 1, 'local', '2025-11-16 03:18:31.293+00', '2025-11-16 03:18:31.293+00', 1, NULL),
	('10d38c18-1fd4-4189-9311-0faf3832fe87', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'd8f22634-d4ac-4d00-b2fa-8d1bd3fed49d', '2025-11-16', 1, 'local', '2025-11-16 03:18:31.306+00', '2025-11-16 03:18:31.306+00', 1, NULL),
	('f76cc295-a50f-4687-ae3a-618acd31d8ca', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '0f952a25-3d4d-4ebc-9f1a-9c72933fd8c1', '2025-11-16', 1, 'local', '2025-11-16 03:18:31.318+00', '2025-11-16 03:18:31.318+00', 1, NULL),
	('05280364-5c03-4dda-97bb-c6faa81e1990', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '1e12b217-9ea8-448a-9089-ddb992f0affe', '2025-11-16', 1, 'local', '2025-11-16 03:19:14.684+00', '2025-11-16 03:19:14.684+00', 1, NULL),
	('ba5a46b6-13b6-429c-a045-1c04329bb460', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '5a389861-6a08-4184-be78-dbbd6af16958', '2025-11-16', 1, 'local', '2025-11-16 03:19:14.699+00', '2025-11-16 03:19:14.699+00', 1, NULL),
	('865bc922-9dc3-49cf-847a-a42cb4ab2e56', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '7c644956-e9a3-49db-8f3d-c2f49263f5cf', '2025-11-16', 1, 'local', '2025-11-16 03:19:14.715+00', '2025-11-16 03:19:14.715+00', 1, NULL),
	('3204f1ef-81f1-427b-b99d-a769c2a6dd77', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '9aee6fc6-8bd4-44e5-869c-ed9c8276761e', '2025-11-16', 1, 'local', '2025-11-16 03:19:14.73+00', '2025-11-16 03:19:14.73+00', 1, NULL),
	('8b865cfb-9373-4d43-86f4-30ab3ce7572d', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'b071bbc6-e419-4f76-b730-1933f34e7aa8', '2025-11-16', 1, 'local', '2025-11-16 03:19:14.743+00', '2025-11-16 03:19:14.743+00', 1, NULL),
	('0cb96365-a7f3-4802-968f-a2f76cad7647', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '819d279c-8447-4775-9a4e-3820041a42d2', '2025-11-16', 1, 'local', '2025-11-16 03:19:14.765+00', '2025-11-16 03:19:14.765+00', 1, NULL),
	('c4c983ae-4c08-4cc8-a4fb-6006e20b43b5', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '04447dbb-dac1-402a-8295-17e56e9a098a', '2025-11-16', 1, 'local', '2025-11-16 03:19:14.779+00', '2025-11-16 03:19:14.779+00', 1, NULL),
	('2fc43499-743c-489c-99c4-37db27d86039', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '314a9857-a5a9-44e3-bc70-dd786e342914', '2025-11-16', 1, 'local', '2025-11-16 03:19:14.791+00', '2025-11-16 03:19:14.791+00', 1, NULL),
	('b1220e1e-4fc9-4dba-95f7-8bf0b89a7cb6', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'f0e9239f-4621-4e16-baa6-28344b676281', '2025-11-16', 1, 'local', '2025-11-16 03:19:14.802+00', '2025-11-16 03:19:14.802+00', 1, NULL),
	('7a8f1a03-2e1f-4cc4-a47c-9e4e80c3f13c', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'f13295dc-adfa-48d8-b1d4-16adcb5ca548', '2025-11-16', 1, 'local', '2025-11-16 03:19:14.814+00', '2025-11-16 03:19:14.814+00', 1, NULL),
	('03d05162-ed88-42cf-84e1-5f24065023aa', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'a3298154-463c-46d9-9941-c708e0e8ee92', '2025-11-16', 1, 'local', '2025-11-16 03:19:14.825+00', '2025-11-16 03:19:14.825+00', 1, NULL),
	('4978d4a6-a55c-44da-8558-ecc055c1ebb9', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '9d2dd93e-d978-4704-8440-0301e0c29365', '2025-11-16', 1, 'local', '2025-11-16 03:19:14.836+00', '2025-11-16 03:19:14.836+00', 1, NULL),
	('0eea69a0-8848-4b27-8d2c-b31bd9c11dc6', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '75ca5f98-7282-453d-98aa-a79d6ba42451', '2025-11-16', 1, 'local', '2025-11-16 03:19:14.847+00', '2025-11-16 03:19:14.847+00', 1, NULL),
	('77865d68-ec38-4bbd-8249-f01d893fbfe7', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '5c3279d7-1aaf-4953-bbb9-7e272e1da578', '2025-11-16', 1, 'local', '2025-11-16 03:19:36.292+00', '2025-11-16 03:19:36.292+00', 1, NULL),
	('88dde081-1356-4c0b-a59b-fbb46a69794b', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'b4839c0b-b088-4174-bf87-1ac21a3a66fe', '2025-11-16', 1, 'local', '2025-11-16 03:19:36.306+00', '2025-11-16 03:19:36.306+00', 1, NULL),
	('6513d580-7824-4d13-a96b-8714ba65f517', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '9491c272-c414-4643-b307-051f14138882', '2025-11-16', 1, 'local', '2025-11-16 03:19:36.318+00', '2025-11-16 03:19:36.318+00', 1, NULL),
	('4fd4a517-94b8-4663-93cc-3ac1c54f9c67', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '3cc695dd-967b-4b7a-9832-c7e868c433d1', '2025-11-16', 1, 'local', '2025-11-16 03:19:36.329+00', '2025-11-16 03:19:36.329+00', 1, NULL),
	('59dd347a-5ce9-4e76-8e42-96c5d2ee790f', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '04c37ee8-620c-4828-990c-19da8a272794', '2025-11-16', 1, 'local', '2025-11-16 03:19:36.339+00', '2025-11-16 03:19:36.339+00', 1, NULL),
	('e1988d20-166c-4a55-944c-8b74548cae78', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '3cb230f2-bb09-40ef-9030-4d520a15f63b', '2025-11-16', 1, 'local', '2025-11-16 03:19:36.35+00', '2025-11-16 03:19:36.35+00', 1, NULL),
	('a81925c7-a620-41e5-a03e-59b60ed7429b', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '9dcad4a0-0b24-4808-8676-384cc1b63098', '2025-11-16', 1, 'local', '2025-11-16 03:19:36.361+00', '2025-11-16 03:19:36.361+00', 1, NULL),
	('26279ea8-528e-44ca-ac98-f98169e07e83', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '8e83b1fd-4a1d-48f6-b1d5-77004502b898', '2025-11-16', 1, 'local', '2025-11-16 03:19:36.372+00', '2025-11-16 03:19:36.372+00', 1, NULL),
	('b40e073a-3f8b-4459-a371-63acef372241', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'e754619b-b718-4db4-9795-d5cf27b3c454', '2025-11-16', 1, 'local', '2025-11-16 03:19:36.383+00', '2025-11-16 03:19:36.383+00', 1, NULL),
	('8d0ef7d9-b429-4db4-8977-3af8caf920c9', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'e0c5b7c2-c670-47f4-bc21-a46f8e714093', '2025-11-16', 1, 'local', '2025-11-16 03:19:36.395+00', '2025-11-16 03:19:36.395+00', 1, NULL),
	('cfaf0e96-ebf4-4d10-9872-c2d69ec314a8', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '61829369-ab38-4999-99e2-28377adc20c4', '2025-11-16', 1, 'local', '2025-11-16 03:19:36.405+00', '2025-11-16 03:19:36.405+00', 1, NULL),
	('a6b2c34f-1aea-4a3f-a9bb-d8b1e65698c1', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '6151ee6b-cd52-4a53-aa7d-c171e2d5268d', '2025-11-16', 1, 'local', '2025-11-16 03:19:36.415+00', '2025-11-16 03:19:36.415+00', 1, NULL),
	('dd148f04-be83-4a15-88e5-1a00eac85c1f', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'edb59ca7-f129-4f8a-aa38-ee91caef7c0a', '2025-11-16', 1, 'local', '2025-11-16 03:20:14.66+00', '2025-11-16 03:20:14.66+00', 1, NULL),
	('686a6c96-2563-4fc5-9a97-4f4f66152c86', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'c47c7e6d-6a4b-4383-a104-c815e858907e', '2025-11-16', 1, 'local', '2025-11-16 03:20:14.678+00', '2025-11-16 03:20:14.678+00', 1, NULL),
	('2106a7b3-621c-477d-a642-1fcd73c2686a', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'f642e5f5-7fa4-453b-a797-5b4e4707965a', '2025-11-16', 1, 'local', '2025-11-16 03:20:14.692+00', '2025-11-16 03:20:14.692+00', 1, NULL),
	('fe909534-601f-48a2-af77-db70c89395d6', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '1bac76b3-0105-489a-a09d-6fdb23d3fe7a', '2025-11-16', 1, 'local', '2025-11-16 03:20:14.706+00', '2025-11-16 03:20:14.706+00', 1, NULL),
	('81072359-954d-4ee9-957d-7465aab86ba3', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '118b2dac-f91c-4397-919f-082177423389', '2025-11-17', 1, 'local', '2025-11-17 00:32:06.598+00', '2025-11-17 00:32:06.598+00', 1, NULL),
	('ad4a44d4-b3c5-4beb-b1de-f39cf5dd8da1', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '2d875574-8d78-42a3-b60c-6a96616c99ce', '2025-11-17', 1, 'local', '2025-11-17 00:33:43.709+00', '2025-11-17 00:33:43.709+00', 1, NULL),
	('a99f0847-ea84-4105-b2e4-05e8d8f8f6c1', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '14bd99ec-7612-4e59-8167-faac81eb6b4b', '2025-11-17', 1, 'local', '2025-11-17 00:33:54.036+00', '2025-11-17 00:33:54.036+00', 1, NULL),
	('323503e7-f12a-4e09-b659-db811508ff81', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'bad07e12-0d70-4e51-b4bb-097d9ea0777b', '2025-11-17', 1, 'local', '2025-11-17 00:38:55.578+00', '2025-11-17 00:38:55.578+00', 1, NULL),
	('80e81b5a-c223-464e-8af9-0f9454b84481', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '6457ae1a-0fd7-4de0-8082-e0c4489af663', '2025-11-17', 1, 'local', '2025-11-17 00:39:32.128+00', '2025-11-17 00:39:32.128+00', 1, NULL),
	('6f2366dc-188f-4882-bb1a-a4e14f389de0', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '54008a26-49d9-4bae-8b8d-97fe63d731aa', '2025-11-17', 1, 'local', '2025-11-17 01:57:28.297+00', '2025-11-17 01:57:28.297+00', 1, NULL),
	('ef314f4e-f0de-4a89-9254-579864b08ab1', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'edac6c29-ddfd-44ca-b838-997d0ba7c476', '2025-11-17', 1, 'local', '2025-11-17 01:57:56.877+00', '2025-11-17 01:57:56.877+00', 1, NULL),
	('e87e0202-7731-4fad-a98f-5cfa94de8f0e', 'a6599f6a-d138-4d5d-94d3-60990c260961', '557d773a-f588-473a-96cf-0dff54d0ce62', '2025-11-17', 1, 'local', '2025-11-17 01:59:32.193+00', '2025-11-17 01:59:32.193+00', 1, NULL);


--
-- Data for Name: reminders; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."reminders" ("id", "user_id", "habit_id", "time_local", "days_of_week", "timezone", "is_enabled", "created_at", "updated_at", "version", "deleted_at") VALUES
	('cad2b324-9fc8-4e06-94a4-edfe63e9b179', 'a6599f6a-d138-4d5d-94d3-60990c260961', '348c207c-f3d5-4302-a22b-7f5ba709ebe5', '09:00', '1,2,3', 'America/New_York', true, '2025-11-08 19:15:46.238+00', '2025-11-08 19:15:46.238+00', 1, NULL),
	('2ff58759-3197-4a30-85a8-90791ce9bc66', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'a1beec82-bd2f-477a-93c4-9ca4ebcfdb26', '09:00', '1,2,3', 'America/New_York', true, '2025-11-08 19:18:23.495+00', '2025-11-08 19:18:23.495+00', 1, NULL),
	('bbb33db4-1b00-4526-981a-c0207e83c822', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'af213a2e-3281-4e16-9d47-025e16bdc388', '09:00', '1,2,3', 'America/New_York', true, '2025-11-08 19:19:33.943+00', '2025-11-08 19:19:33.943+00', 1, NULL),
	('d2b6f652-8fde-4613-8cc1-495d6eeb0387', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '4fd7ac53-00c1-4a80-9149-fd3b46cf72cb', '09:00', '1,2,3', 'America/New_York', true, '2025-11-08 20:44:09.028+00', '2025-11-08 20:44:09.028+00', 1, NULL),
	('287a2685-ab35-4a83-8f58-2e898e0bd887', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'c2059cbd-f2af-4497-8087-efe873efa725', '09:00', '1,2,3', 'America/New_York', true, '2025-11-08 20:48:54.029+00', '2025-11-08 20:48:54.029+00', 1, NULL),
	('804ac60c-e92a-4fd0-b85f-d27f864f8773', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '444c5698-b847-4430-ace8-0c5d6e0c96ef', '09:00', '1,2,3', 'America/New_York', true, '2025-11-08 20:49:58.394+00', '2025-11-08 20:49:58.394+00', 1, NULL),
	('e84ba3f1-e3c4-470b-b05f-42fec79b684f', 'a6599f6a-d138-4d5d-94d3-60990c260961', '2cd7bcd0-84ce-4adb-b2b6-7713b17ac91d', '09:00', '1,2,3', 'America/New_York', true, '2025-11-09 23:54:15.692+00', '2025-11-09 23:54:15.692+00', 1, NULL),
	('62d3a649-c674-4aeb-ab62-314b4e934446', 'a6599f6a-d138-4d5d-94d3-60990c260961', '67cbe27b-6201-4e24-8c71-733a9172f1e9', '09:00', '1,2,3', 'America/New_York', true, '2025-11-10 00:06:13.952+00', '2025-11-10 00:06:13.952+00', 1, NULL),
	('a533ed56-0914-4514-9477-8ea313fceb1d', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'e50cfc53-c999-49f3-81e6-7ac5f370c04b', '09:00', '1,2,3', 'America/New_York', true, '2025-11-10 00:23:39.793+00', '2025-11-10 00:23:39.793+00', 1, NULL),
	('f8df2d5e-6b49-41e2-8c70-5a0e8e609186', 'a6599f6a-d138-4d5d-94d3-60990c260961', '53ef1044-11a2-4f95-b62c-886f5f7a58c8', '09:00', '1,2,3', 'America/New_York', true, '2025-11-10 00:41:52.336+00', '2025-11-10 00:41:52.336+00', 1, NULL),
	('8806ee2f-c4a4-499a-83c9-013e891b37a0', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'b906381c-10ec-469b-9e96-ef381bca4982', '09:00', '1,2,3', 'America/New_York', true, '2025-11-10 01:29:03.066+00', '2025-11-10 01:29:03.066+00', 1, NULL),
	('ee1ff769-a02b-4cf2-bb42-ef172e7aa7c1', 'a6599f6a-d138-4d5d-94d3-60990c260961', '19256980-8cf7-41c9-a5fd-d2a59b9bf297', '09:00', '1,2,3', 'America/New_York', true, '2025-11-10 23:03:22.873+00', '2025-11-10 23:03:22.873+00', 1, NULL),
	('ac404896-bf9e-402a-8f28-21cec21eb753', 'a6599f6a-d138-4d5d-94d3-60990c260961', '060271d8-e006-4759-b9aa-eaf23f311570', '09:00', '1,2,3', 'America/New_York', true, '2025-11-10 23:03:22.886+00', '2025-11-10 23:03:22.886+00', 1, NULL),
	('99cc6c17-5644-4210-9399-5e8f3e45075d', 'a6599f6a-d138-4d5d-94d3-60990c260961', '8bc62369-813a-4df7-ae1a-f3d0d2e9daeb', '09:00', '1,2,3', 'America/New_York', true, '2025-11-10 23:03:22.898+00', '2025-11-10 23:03:22.898+00', 1, NULL),
	('ebf55904-570f-4851-87ca-f7de15ad0337', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'debbfa08-4317-4680-b055-69e7424d319b', '09:00', '1,2,3', 'America/New_York', true, '2025-11-10 23:04:58.462+00', '2025-11-10 23:04:58.462+00', 1, NULL),
	('22c9fea0-0950-4471-a460-bad2790cdf0a', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'd596a2a8-7a1e-42d8-b4a9-e10dd22a0552', '09:00', '1,2,3', 'America/New_York', true, '2025-11-10 23:04:58.487+00', '2025-11-10 23:04:58.487+00', 1, NULL),
	('3bf1df56-b0d0-481a-829a-02b5025f06ad', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'e814da4a-1f1d-4e67-832a-50c397b10827', '09:00', '1,2,3', 'America/New_York', true, '2025-11-10 23:04:58.502+00', '2025-11-10 23:04:58.502+00', 1, NULL),
	('9b6722aa-2b54-4ade-862c-d2a76f9f5a3b', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '007e6f3b-eced-4349-9e83-c0a9ccc0bc33', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 03:56:26.493+00', '2025-11-15 03:56:26.493+00', 1, NULL),
	('5edd7048-05d2-4b77-8ada-8ffbf24cce5d', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '8389ed97-1952-499f-89c8-5cff63f9414a', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 03:56:26.512+00', '2025-11-15 03:56:26.512+00', 1, NULL),
	('38f3b9a3-b63f-4e1a-849b-92326733afdf', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '0519ff83-6f47-4f4a-a125-79f386d1704d', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 03:56:26.528+00', '2025-11-15 03:56:26.528+00', 1, NULL),
	('0d5b6b95-0858-4c60-b15c-0e6bed7b76c0', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'aa7b0177-2dfd-4e69-95fd-3596abe8734e', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 05:12:54.561+00', '2025-11-15 05:12:54.561+00', 1, NULL),
	('221437eb-a477-4a73-ad0c-fcca325d6a1f', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'e84c2355-5ebd-4bf8-9ceb-09065fc55824', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 05:12:54.579+00', '2025-11-15 05:12:54.579+00', 1, NULL),
	('0d7e783d-4e81-4d26-ac44-766fc0ff35fc', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'b2919270-19b1-45e4-9fac-34fd2164501f', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 05:12:54.597+00', '2025-11-15 05:12:54.597+00', 1, NULL),
	('2ff577a8-29cc-49cd-a635-672bbca41eb1', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '15a59cbb-646e-49c4-8260-64286e27237b', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 05:14:54.39+00', '2025-11-15 05:14:54.39+00', 1, NULL),
	('183dde38-060b-40c8-b533-cc18736ec909', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'a1221f87-1869-4fd5-8192-3e424ce2cad0', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 05:14:54.411+00', '2025-11-15 05:14:54.411+00', 1, NULL),
	('aaf7860d-1d72-4bb2-8931-340162a1ebbb', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'bb1696c5-2571-4b0c-a0e1-031ffc828dea', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 05:14:54.428+00', '2025-11-15 05:14:54.428+00', 1, NULL),
	('1828ac9a-a3e1-428e-8a93-e148e4433b59', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'c7c5f1fa-f8fe-49d3-9002-f11804bbbbee', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 05:20:26.726+00', '2025-11-15 05:20:26.726+00', 1, NULL),
	('e4fc88df-2c37-439a-90fd-dc6031f18785', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '8b7c2239-4a5e-4193-a2b1-886f774c7c0c', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 05:20:26.753+00', '2025-11-15 05:20:26.753+00', 1, NULL),
	('6c39240c-273e-488f-9601-163b62de0b54', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '74061081-8df1-48a4-b080-5792f5f8c642', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 05:20:26.774+00', '2025-11-15 05:20:26.774+00', 1, NULL),
	('bc45000a-cdb8-43dd-b348-e567d9e7606c', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '34cf8f46-940a-47e6-935a-61972f9819e4', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 05:24:20.874+00', '2025-11-15 05:24:20.874+00', 1, NULL),
	('b53985c9-49c6-43be-8f34-98e45a34e84c', 'a6599f6a-d138-4d5d-94d3-60990c260961', '8f304b0a-f863-4165-9deb-712feff5b528', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 05:52:40.294+00', '2025-11-15 05:52:40.294+00', 1, NULL),
	('b8881a7a-39c0-4817-b32f-3dfaa2f5fa1c', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'dccff8f0-1ce4-4fe6-a759-1dc8ef4d15f3', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 05:52:40.311+00', '2025-11-15 05:52:40.311+00', 1, NULL),
	('9511f5b0-28cf-45db-9157-732fdff65b57', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'b948bc30-fb41-4268-bbb6-3a82a9dc4eba', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 06:04:36.667+00', '2025-11-15 06:04:36.667+00', 1, NULL),
	('566e2b50-ca30-4d4a-86df-c05004cba2e5', 'a6599f6a-d138-4d5d-94d3-60990c260961', 'e8d85e8b-c4e7-4f1b-8259-e2d6dd92f7ef', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 06:04:36.685+00', '2025-11-15 06:04:36.685+00', 1, NULL),
	('d972b2c6-3814-4d25-8d0f-ab5d3910ede2', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '2647f920-2198-4531-ba0f-4a65c7b50691', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 06:54:13.139+00', '2025-11-15 06:54:13.139+00', 1, NULL),
	('fea46202-01d9-4684-ad86-7b4011c39e77', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '00af19e2-ca66-495a-a883-a6cc24305cff', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 06:54:13.154+00', '2025-11-15 06:54:13.154+00', 1, NULL),
	('ae5325c5-4ba5-40f0-8614-9b2d1edd247c', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '8020a1f5-ac7d-4d90-9653-af20eeb3248c', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 06:55:34.1+00', '2025-11-15 06:55:34.1+00', 1, NULL),
	('68cf13c5-2a01-4b09-9c5f-7394235d2a11', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '451af8e3-8b31-4183-bc0d-bf54384114d8', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 06:55:34.116+00', '2025-11-15 06:55:34.116+00', 1, NULL),
	('c1020d12-35ed-4fc1-af08-eb0973a3ba15', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '2b99b3a9-d426-45af-b0e6-d49b43e962e3', '09:00', '1,2,3', 'America/New_York', true, '2025-11-15 06:55:34.129+00', '2025-11-15 06:55:34.129+00', 1, NULL),
	('273a2e90-0918-4a3b-aeeb-83ca42ce2ea1', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '416b50cf-b249-47f6-8ccb-1837791876b9', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:18:31.255+00', '2025-11-16 03:18:31.255+00', 1, NULL),
	('980a7542-87a8-484b-bcd9-f50f70b4ad8c', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '899ee4e0-9126-4394-84ca-a01173b933eb', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:18:31.271+00', '2025-11-16 03:18:31.271+00', 1, NULL),
	('8b5fccb4-df33-4894-ae3d-500caf3da9bf', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '3a29f8f6-5e01-48dd-9411-2428cec18b02', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:18:31.285+00', '2025-11-16 03:18:31.285+00', 1, NULL),
	('7a522964-c493-4e2c-9b3e-3c225b0681e9', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'b97e9940-1011-4ba1-9b91-caa52bdc59a0', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:18:31.297+00', '2025-11-16 03:18:31.297+00', 1, NULL),
	('1520f551-574e-4f50-8122-e316ac0c840b', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'd8f22634-d4ac-4d00-b2fa-8d1bd3fed49d', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:18:31.31+00', '2025-11-16 03:18:31.31+00', 1, NULL),
	('3bfdb3f4-80f1-4c52-acc9-286dfb466c72', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '0f952a25-3d4d-4ebc-9f1a-9c72933fd8c1', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:18:31.322+00', '2025-11-16 03:18:31.322+00', 1, NULL),
	('64019969-a053-49d5-bf4b-ea8dbac95833', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '1e12b217-9ea8-448a-9089-ddb992f0affe', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:14.689+00', '2025-11-16 03:19:14.689+00', 1, NULL),
	('40d31acb-9d24-43b0-b2d0-e1c6956cbef6', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '5a389861-6a08-4184-be78-dbbd6af16958', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:14.705+00', '2025-11-16 03:19:14.705+00', 1, NULL),
	('5117d3fb-c985-4962-89e2-886ef9f09b5d', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '7c644956-e9a3-49db-8f3d-c2f49263f5cf', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:14.721+00', '2025-11-16 03:19:14.721+00', 1, NULL),
	('62f45ed2-01f7-4aeb-86fb-a3dafd12fc70', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '9aee6fc6-8bd4-44e5-869c-ed9c8276761e', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:14.735+00', '2025-11-16 03:19:14.735+00', 1, NULL),
	('7c94b26a-a09a-405d-9989-e12c088ed4c5', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'b071bbc6-e419-4f76-b730-1933f34e7aa8', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:14.755+00', '2025-11-16 03:19:14.755+00', 1, NULL),
	('e568c7e7-3401-41b3-a148-6e8d1b6cdaed', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '819d279c-8447-4775-9a4e-3820041a42d2', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:14.77+00', '2025-11-16 03:19:14.77+00', 1, NULL),
	('d4fe1816-9ae6-4a0f-a19a-25152159fe96', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '04447dbb-dac1-402a-8295-17e56e9a098a', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:14.782+00', '2025-11-16 03:19:14.782+00', 1, NULL),
	('2606ecfa-ab2d-41f3-ab1a-ca1b1030890f', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '314a9857-a5a9-44e3-bc70-dd786e342914', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:14.794+00', '2025-11-16 03:19:14.794+00', 1, NULL),
	('322e1316-d208-43b6-814a-e3b9ea85829f', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'f0e9239f-4621-4e16-baa6-28344b676281', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:14.806+00', '2025-11-16 03:19:14.806+00', 1, NULL),
	('e01dcf63-a5c4-4cf2-a1e3-7028e80e57ee', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'f13295dc-adfa-48d8-b1d4-16adcb5ca548', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:14.817+00', '2025-11-16 03:19:14.817+00', 1, NULL),
	('b0924602-f698-44e3-a128-055e20dfebb3', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'a3298154-463c-46d9-9941-c708e0e8ee92', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:14.829+00', '2025-11-16 03:19:14.829+00', 1, NULL),
	('23fb5c5e-adc1-4a0a-a81e-ac84b931f7e8', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '9d2dd93e-d978-4704-8440-0301e0c29365', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:14.84+00', '2025-11-16 03:19:14.84+00', 1, NULL),
	('ca1fe397-d8bd-47b1-992c-a92b5c6f153e', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '75ca5f98-7282-453d-98aa-a79d6ba42451', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:36.277+00', '2025-11-16 03:19:36.277+00', 1, NULL),
	('14de65a1-8c18-4208-96aa-719535ae2532', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '5c3279d7-1aaf-4953-bbb9-7e272e1da578', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:36.298+00', '2025-11-16 03:19:36.298+00', 1, NULL),
	('03e8e6f8-e77d-48b0-bd45-578cd1c30f91', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'b4839c0b-b088-4174-bf87-1ac21a3a66fe', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:36.31+00', '2025-11-16 03:19:36.31+00', 1, NULL),
	('ee7381a4-bb47-468f-abc2-d65698851c6a', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '9491c272-c414-4643-b307-051f14138882', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:36.321+00', '2025-11-16 03:19:36.321+00', 1, NULL),
	('28c90628-bead-43d9-9b22-c72d72b1ffdf', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '3cc695dd-967b-4b7a-9832-c7e868c433d1', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:36.333+00', '2025-11-16 03:19:36.333+00', 1, NULL),
	('3bca969e-3130-4242-b95b-0901085c256a', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '04c37ee8-620c-4828-990c-19da8a272794', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:36.343+00', '2025-11-16 03:19:36.343+00', 1, NULL),
	('973be10a-f4b3-410a-966c-0e1112e83d8e', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '3cb230f2-bb09-40ef-9030-4d520a15f63b', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:36.354+00', '2025-11-16 03:19:36.354+00', 1, NULL),
	('1c023b2b-42b7-4b19-b304-5e16029ec4c0', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '9dcad4a0-0b24-4808-8676-384cc1b63098', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:36.364+00', '2025-11-16 03:19:36.364+00', 1, NULL),
	('dec61bf2-d2bd-4fbf-9a0c-0bac85f2f783', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '8e83b1fd-4a1d-48f6-b1d5-77004502b898', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:36.375+00', '2025-11-16 03:19:36.375+00', 1, NULL),
	('8f37d4e8-dae0-480d-9b72-f4b2bf9f4822', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'e754619b-b718-4db4-9795-d5cf27b3c454', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:36.387+00', '2025-11-16 03:19:36.387+00', 1, NULL),
	('21128113-4c9e-4619-ac6b-a44e60e1599f', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'e0c5b7c2-c670-47f4-bc21-a46f8e714093', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:36.399+00', '2025-11-16 03:19:36.399+00', 1, NULL),
	('2c160020-65d1-4b57-a6c2-46ede32c4082', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '61829369-ab38-4999-99e2-28377adc20c4', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:36.409+00', '2025-11-16 03:19:36.409+00', 1, NULL),
	('98469fd5-37b4-44fd-b9ef-bcbfbeb345a0', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '6151ee6b-cd52-4a53-aa7d-c171e2d5268d', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:19:36.418+00', '2025-11-16 03:19:36.418+00', 1, NULL),
	('5e28904d-ff22-43ce-a682-41a419593459', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'edb59ca7-f129-4f8a-aa38-ee91caef7c0a', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:20:14.666+00', '2025-11-16 03:20:14.666+00', 1, NULL),
	('ef666aca-68ef-4dda-a4cb-0b45c45bb54b', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'c47c7e6d-6a4b-4383-a104-c815e858907e', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:20:14.682+00', '2025-11-16 03:20:14.682+00', 1, NULL),
	('a64c3cfe-e770-453d-8f4a-1d884ec93d13', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'f642e5f5-7fa4-453b-a797-5b4e4707965a', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:20:14.697+00', '2025-11-16 03:20:14.697+00', 1, NULL),
	('86b66870-19eb-4cf5-a5a4-80bfa8fda261', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '1bac76b3-0105-489a-a09d-6fdb23d3fe7a', '09:00', '1,2,3', 'America/New_York', true, '2025-11-16 03:20:14.711+00', '2025-11-16 03:20:14.711+00', 1, NULL),
	('50e515fc-20fa-4b3b-b169-f4a00624446d', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '118b2dac-f91c-4397-919f-082177423389', '09:00', '1,2,3', 'America/New_York', true, '2025-11-17 00:32:06.605+00', '2025-11-17 00:32:06.605+00', 1, NULL),
	('550078a8-666b-4465-bb82-2190f078b2b7', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '2d875574-8d78-42a3-b60c-6a96616c99ce', '09:00', '1,2,3', 'America/New_York', true, '2025-11-17 00:33:43.718+00', '2025-11-17 00:33:43.718+00', 1, NULL),
	('5bf1764c-501a-4697-b505-b35e0463d432', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '14bd99ec-7612-4e59-8167-faac81eb6b4b', '09:00', '1,2,3', 'America/New_York', true, '2025-11-17 00:33:54.046+00', '2025-11-17 00:33:54.046+00', 1, NULL),
	('2b12ed94-c204-40a4-9d1c-32e75aecd967', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'bad07e12-0d70-4e51-b4bb-097d9ea0777b', '09:00', '1,2,3', 'America/New_York', true, '2025-11-17 00:38:55.585+00', '2025-11-17 00:38:55.585+00', 1, NULL),
	('53d66256-2d6c-42df-a139-40174e56af94', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '6457ae1a-0fd7-4de0-8082-e0c4489af663', '09:00', '1,2,3', 'America/New_York', true, '2025-11-17 00:39:32.136+00', '2025-11-17 00:39:32.136+00', 1, NULL),
	('13d7eb30-945a-45c8-ac49-48d950c60d11', '1a8be309-c6ae-486c-aed2-830ba8975ba5', '54008a26-49d9-4bae-8b8d-97fe63d731aa', '09:00', '1,2,3', 'America/New_York', true, '2025-11-17 01:57:28.304+00', '2025-11-17 01:57:28.304+00', 1, NULL),
	('e0eedcba-c054-482c-9ed4-13d49e0f6e84', '1a8be309-c6ae-486c-aed2-830ba8975ba5', 'edac6c29-ddfd-44ca-b838-997d0ba7c476', '09:00', '1,2,3', 'America/New_York', true, '2025-11-17 01:57:56.884+00', '2025-11-17 01:57:56.884+00', 1, NULL),
	('a2d880b5-dd60-4118-9f46-09d29b725fcf', 'a6599f6a-d138-4d5d-94d3-60990c260961', '557d773a-f588-473a-96cf-0dff54d0ce62', '09:00', '1,2,3', 'America/New_York', true, '2025-11-17 01:59:32.201+00', '2025-11-17 01:59:32.201+00', 1, NULL);


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 65, true);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

-- \unrestrict ttCQ79duPKs4ID6e8C2lGrxUVCtNOYUvrtY1lGd6qiUXaE8m0be3OljeKrQOMag

RESET ALL;

-- Sample broadcast message for local dev
