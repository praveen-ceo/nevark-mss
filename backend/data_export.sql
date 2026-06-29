--
-- PostgreSQL database dump
--

\restrict gRuet9Kp96i0Py2CQ2UUlDSR0hzcl20pPBKiHDFOvKkc9dlVQwsHlK67MIdTG9N

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
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
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, hashed_password, full_name, is_verified, last_login_at, avatar_url, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
d44e9b8e-2391-4caf-bfd5-bab59132181f	cfonevark@nevark.in	$2b$12$kOefy48HI1X1bmDtEApr1eypb3CYlNVatlaiMvWazs1EWBzbOf9wy	Nevark CFO	t	\N	\N	f	\N	2026-06-21 19:34:04.051596+00	2026-06-23 18:26:38.143108+00	\N	\N
97e09372-f416-47de-8bc4-1a80fe5b89c4	ctonikhil@nevark.in	$2b$12$AgfZcZ49oX95t7G9rm614ucKbnd5MHp8LSWWBjKu2vzAWbC40jd/y	Nikhil CTO	t	\N	\N	f	\N	2026-06-21 19:34:04.051596+00	2026-06-23 18:26:40.224693+00	\N	\N
083b111e-f305-4608-8ab4-6a0316572f9a	ceopraveen@nevark.in	$2b$12$klMueKi3sElr8zGdpqPXTurbn2ONOUqjifK7a9y45pmPgnHxqOzOm	Praveen CEO	t	\N	\N	f	\N	2026-06-21 19:34:04.051596+00	2026-06-23 18:26:42.737318+00	\N	\N
2a147bae-7324-4ef8-818f-c944b8e551a6	superadmin@nevark.com	$2b$12$VK6CjckuJ.eXd.IlDwt/UO/ggHpV3KCSW7hcvUQCiJO1O3ryJTkz6	Nevark Super Admin	t	\N	\N	f	\N	2026-06-21 19:34:04.051596+00	2026-06-23 18:26:47.336454+00	\N	\N
\.


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.activity_logs (id, user_id, action, description, module, metadata, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: ai_chat_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_chat_sessions (id, user_id, title, context, total_tokens, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: ai_chat_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_chat_messages (id, session_id, role, content, tokens_used, metadata, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.alembic_version (version_num) FROM stdin;
0005
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.departments (id, name, description, parent_id, manager_id, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
27d8c3aa-4b41-4d30-9b55-c1a7abc84255	Engineering	\N	\N	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
31c1ad5c-3d2c-448a-ad1d-4070d301640d	Human Resources	\N	\N	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
d305396b-e27c-4f80-91f4-e89e77657237	Finance	\N	\N	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
deb95e7f-ecbf-40f4-a42f-3920497d156c	Sales	\N	\N	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
f085d375-7cff-473c-a7bc-07db3f1a7316	Operations	\N	\N	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
9bb09fe6-8343-4f8b-977a-4cd26f8a2a17	Marketing	\N	\N	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employees (id, user_id, department_id, employee_code, first_name, last_name, job_title, employment_type, hire_date, termination_date, phone, address, emergency_contact_name, emergency_contact_phone, salary, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
37a4e1f8-1433-4a43-8fe2-ea6d08fb8c0d	d44e9b8e-2391-4caf-bfd5-bab59132181f	\N	CFO2026001	Nevark	CFO	Chief Financial Officer	full_time	2026-06-22	\N	\N	\N	\N	\N	\N	f	\N	2026-06-21 19:34:04.051596+00	2026-06-23 18:26:38.143108+00	\N	\N
a8153fbf-30a4-4b25-a936-0303526300dc	97e09372-f416-47de-8bc4-1a80fe5b89c4	\N	CTO2026001	Nikhil	CTO	Chief Technology Officer	full_time	2026-06-22	\N	\N	\N	\N	\N	\N	f	\N	2026-06-21 19:34:04.051596+00	2026-06-23 18:26:40.224693+00	\N	\N
d6d4f342-0004-417d-b3ae-2f20168b4e8f	083b111e-f305-4608-8ab4-6a0316572f9a	\N	CEO2026001	Praveen	CEO	Chief Executive Officer	full_time	2026-06-22	\N	\N	\N	\N	\N	\N	f	\N	2026-06-21 19:34:04.051596+00	2026-06-23 18:26:42.737318+00	\N	\N
b750bce0-7339-4f67-86b3-52233610bca9	2a147bae-7324-4ef8-818f-c944b8e551a6	\N	EMP20269089	Nevark	Super Admin	Administrator	full_time	2026-06-22	\N	\N	\N	\N	\N	\N	f	\N	2026-06-22 09:18:26.857608+00	2026-06-23 18:26:47.336454+00	\N	\N
\.


--
-- Data for Name: attendance; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attendance (id, employee_id, date, check_in, check_out, status, work_hours, notes, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
fed3e339-25f6-4cda-acd0-748ae0ebae95	b750bce0-7339-4f67-86b3-52233610bca9	2026-06-22	2026-06-22 09:18:26.939732+00	2026-06-22 09:43:31.31961+00	late	0.42	\N	t	\N	2026-06-22 09:18:26.857608+00	2026-06-22 09:43:31.267774+00	\N	\N
172530f9-287b-4ece-ac97-a2664e35905e	a8153fbf-30a4-4b25-a936-0303526300dc	2026-06-22	2026-06-22 09:45:25.513347+00	2026-06-22 09:45:47.023895+00	late	0.01	\N	t	\N	2026-06-22 09:45:25.445944+00	2026-06-22 09:45:46.955091+00	\N	\N
a7e2ed3d-5a70-4411-ab34-dc49f75c00e4	b750bce0-7339-4f67-86b3-52233610bca9	2026-06-23	2026-06-23 05:01:49.386208+00	2026-06-23 07:04:08.967573+00	late	2.04	\N	t	\N	2026-06-23 05:01:49.340781+00	2026-06-23 07:04:08.943935+00	\N	\N
6ad1cfb4-756a-4b22-b687-09636da35c6e	d6d4f342-0004-417d-b3ae-2f20168b4e8f	2026-06-23	2026-06-23 16:16:37.461577+00	2026-06-23 16:16:43.50606+00	late	0.00	\N	t	\N	2026-06-23 16:16:37.434043+00	2026-06-23 16:16:43.466199+00	\N	\N
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, user_id, action, table_name, record_id, old_values, new_values, ip_address, user_agent, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clients (id, name, industry, website, email, phone, address, city, country, tax_id, notes, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
ad52b546-dbb0-4999-8023-716bc6a98b1a	ashok leyland	automobile	www.ashokleyalnd.com	leyland@gmail.com	+916383878022	kumudepalli 	hosur	India	AA2389HU492	1 st client	t	\N	2026-06-22 04:11:15.80496+00	2026-06-22 04:27:20.910694+00	\N	\N
\.


--
-- Data for Name: client_contacts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.client_contacts (id, client_id, first_name, last_name, email, phone, designation, is_primary, notes, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.projects (id, client_id, name, code, description, status, priority, start_date, end_date, actual_end_date, budget, currency, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
0a3f7831-5b4c-4f65-ba5a-31909f822c39	ad52b546-dbb0-4999-8023-716bc6a98b1a	Flame	PRJ20263548	ML software	completed	medium	2026-04-22	2026-06-22	\N	200000.00	INR	f	\N	2026-06-22 04:12:18.385572+00	2026-06-23 18:26:27.743603+00	\N	\N
\.


--
-- Data for Name: contracts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contracts (id, client_id, project_id, title, contract_number, status, start_date, end_date, value, currency, description, terms, document_url, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: contract_risks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contract_risks (id, contract_id, title, description, severity, probability, mitigation, status, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: document_categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.document_categories (id, name, description, parent_id, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
7e0547fd-e16c-45c4-aef7-4541987cdfe8	Reports	\N	\N	t	\N	2026-06-21 19:35:04.741803+00	2026-06-21 19:35:04.741803+00	\N	\N
c0164e5e-efa9-4bac-836e-fd95b8cf41d4	HR	\N	\N	t	\N	2026-06-21 19:35:04.741803+00	2026-06-21 19:35:04.741803+00	\N	\N
afe0dfc5-a33a-4b37-9853-a6beda359d48	Contracts	\N	\N	t	\N	2026-06-21 19:35:04.741803+00	2026-06-21 19:35:04.741803+00	\N	\N
457265c5-0c08-42d7-bac5-f9af09055b91	Finance	\N	\N	t	\N	2026-06-21 19:35:04.741803+00	2026-06-21 19:35:04.741803+00	\N	\N
d7651b9a-28b0-47f4-a92e-99e464f5cda6	Legal	\N	\N	t	\N	2026-06-21 19:35:04.741803+00	2026-06-21 19:35:04.741803+00	\N	\N
47fe10d1-b544-42cd-914d-8493659bc812	Other	\N	\N	t	\N	2026-06-21 19:35:04.741803+00	2026-06-21 19:35:04.741803+00	\N	\N
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.documents (id, category_id, uploaded_by, title, description, file_path, file_name, file_size, mime_type, related_type, related_id, version, tags, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
65de576b-6c23-4e18-92e7-73d5c8c8a129	47fe10d1-b544-42cd-914d-8493659bc812	97e09372-f416-47de-8bc4-1a80fe5b89c4	COMPANY PAN	pan	general/d7d91571-e2a4-4c60-92aa-2ac3ffcc9521_COMPANY_PAN.pdf	COMPANY PAN.pdf	763628	application/pdf	\N	\N	1	Q1 pan	t	\N	2026-06-22 04:53:32.272158+00	2026-06-22 04:53:32.272158+00	\N	\N
082de1aa-e09f-487b-a343-4b060743604e	d7651b9a-28b0-47f4-a92e-99e464f5cda6	97e09372-f416-47de-8bc4-1a80fe5b89c4	FiLLiP_Approved	reg crt	general/ed34cda9-866f-4ff2-9d1e-6016a7050a66_FiLLiP_Approved.pdf	FiLLiP_Approved.pdf	72672	application/pdf	\N	\N	1	Q2 reg crt	t	\N	2026-06-22 04:54:30.790653+00	2026-06-22 04:54:30.790653+00	\N	\N
bd981886-8c0b-40bb-8b75-df56e0617867	47fe10d1-b544-42cd-914d-8493659bc812	97e09372-f416-47de-8bc4-1a80fe5b89c4	SIP - NOTICE	alert	general/ff14d873-5fac-4479-8294-85e2849b3700_SIP_-_NOTICE.pdf	SIP - NOTICE.pdf	64448	application/pdf	employee	\N	1	notice	t	\N	2026-06-22 04:55:06.635968+00	2026-06-22 04:55:06.635968+00	\N	\N
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expenses (id, project_id, employee_id, approved_by, category, amount, currency, date, description, receipt_url, status, rejection_reason, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: finance_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.finance_settings (id, is_active, deleted_at, created_at, updated_at, created_by, updated_by, company_name, company_address, company_email, company_phone, pan, company_gstin, state_code, cgst_rate, sgst_rate, igst_rate, bank_name, bank_account, bank_ifsc, bank_branch, invoice_prefix, default_sac, payment_terms, default_currency) FROM stdin;
9823eabd-a9ad-4286-93b7-cf82a0576300	t	\N	2026-06-22 04:24:34.698497+00	2026-06-22 04:24:34.698497+00	\N	\N	Nevark Technologies LLP	Hosur, Tamil Nadu, India	\N	\N	\N		\N	9.00	9.00	18.00		\N			NRK	998314	30	INR
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoices (id, client_id, project_id, invoice_number, status, issue_date, due_date, subtotal, tax_rate, tax_amount, discount_amount, total_amount, paid_amount, currency, notes, is_active, deleted_at, created_at, updated_at, created_by, updated_by, cgst_rate, sgst_rate, igst_rate, cgst_amount, sgst_amount, igst_amount, place_of_supply, gstin) FROM stdin;
4523da06-a468-4679-945b-42045eaaa707	ad52b546-dbb0-4999-8023-716bc6a98b1a	0a3f7831-5b4c-4f65-ba5a-31909f822c39	NRK-2026-6935	paid	2026-06-22	2026-07-22	200000.00	18.00	36000.00	0.00	236000.00	236000.00	INR	Auto-generated invoice for project: Flame (PRJ20263548)	t	\N	2026-06-22 04:25:01.671937+00	2026-06-22 04:25:47.538536+00	\N	\N	\N	\N	18.00	\N	\N	36000.00	\N	AA2389HU492
\.


--
-- Data for Name: invoice_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoice_items (id, invoice_id, description, quantity, unit_price, amount, sort_order, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
dd2765e0-c5ce-490e-8f30-a2923bb64bd8	4523da06-a468-4679-945b-42045eaaa707	Flame — Professional Services (SAC: 998314)	1.00	200000.00	200000.00	0	t	\N	2026-06-22 04:25:01.671937+00	2026-06-22 04:25:01.671937+00	\N	\N
\.


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leave_requests (id, employee_id, approved_by, leave_type, start_date, end_date, days, reason, status, rejection_reason, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: milestones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.milestones (id, project_id, title, description, due_date, completed_at, status, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, recipient_id, title, entity_type, entity_id, is_read, is_active, deleted_at, created_at, updated_at, created_by, updated_by, body) FROM stdin;
29e0fa89-1c21-46dc-a5b4-8f78d3ff7339	\N	New project: Flame	project	0a3f7831-5b4c-4f65-ba5a-31909f822c39	t	t	\N	2026-06-22 04:12:18.499216+00	2026-06-22 04:13:49.159692+00	\N	\N	\N
9755092a-6e7a-42ad-9614-947d45db6385	\N	New task: documentation	task	e4b68358-aacf-49a4-b008-927132234656	t	t	\N	2026-06-22 04:13:43.329304+00	2026-06-22 04:13:49.159692+00	\N	\N	\N
ee16f7fc-c634-4911-a4d5-240758bb210f	\N	Project Flame moved to completed	project	0a3f7831-5b4c-4f65-ba5a-31909f822c39	t	t	\N	2026-06-22 04:14:27.976518+00	2026-06-22 04:16:49.810139+00	\N	\N	\N
cd237f8a-dbb7-444a-89b5-a4bb1df11ac3	\N	Invoice NRK-2026-6935 sent to ashok leyland	finance	4523da06-a468-4679-945b-42045eaaa707	t	t	\N	2026-06-22 04:25:22.332714+00	2026-06-22 04:29:02.732336+00	\N	\N	\N
37a130e6-09a0-4d89-a42b-711449d29794	\N	Payment received on NRK-2026-6935: Rs.236000	finance	4523da06-a468-4679-945b-42045eaaa707	t	t	\N	2026-06-22 04:25:48.040262+00	2026-06-22 04:29:02.732336+00	\N	\N	\N
89151753-7055-4904-9f38-f14f986c5674	\N	Document uploaded: COMPANY PAN	document	65de576b-6c23-4e18-92e7-73d5c8c8a129	t	t	\N	2026-06-22 04:53:32.626548+00	2026-06-22 04:57:50.137301+00	\N	\N	\N
b55dc56b-1911-4e4f-9f20-f4990276480d	\N	Document uploaded: FiLLiP_Approved	document	082de1aa-e09f-487b-a343-4b060743604e	t	t	\N	2026-06-22 04:54:31.025695+00	2026-06-22 04:57:50.137301+00	\N	\N	\N
3f1059e5-6ee4-479d-99ae-e5e9662456de	\N	Document uploaded: SIP - NOTICE	document	bd981886-8c0b-40bb-8b75-df56e0617867	t	t	\N	2026-06-22 04:55:06.814164+00	2026-06-22 04:57:50.137301+00	\N	\N	\N
fa02e8f7-d2ee-4dd6-9d85-58155fdda240	\N	Task completed: documentation	task	e4b68358-aacf-49a4-b008-927132234656	t	t	\N	2026-06-22 04:55:50.377083+00	2026-06-22 04:57:50.137301+00	\N	\N	\N
\.


--
-- Data for Name: payment_risk_predictions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payment_risk_predictions (id, invoice_id, risk_score, risk_level, predicted_delay_days, factors, model_version, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, invoice_id, amount, payment_date, payment_method, reference, status, notes, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
e3a0d800-4952-4945-8d14-4f6f12fbd5a0	4523da06-a468-4679-945b-42045eaaa707	236000.00	2026-06-22	bank_transfer		completed	\N	t	\N	2026-06-22 04:25:47.538536+00	2026-06-22 04:25:47.538536+00	\N	\N
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permissions (id, name, codename, module, description, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
2458241c-d8e0-4680-be2d-b15caf3d618d	View Users	auth.view_users	auth	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
d45f3394-8187-4e88-85d8-d150a943d081	Create Users	auth.create_users	auth	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
332c8733-69eb-43cf-8b24-024be5ff9e43	Edit Users	auth.edit_users	auth	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
362f7d2c-b51f-45fc-83c7-de8f662bbfe4	Delete Users	auth.delete_users	auth	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
0dee8333-9622-4668-9439-605b3c5443b6	Manage Roles	auth.manage_roles	auth	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
5bcb83a7-d819-489d-9427-4f50920f9348	View Employees	employees.view	employees	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
90d28b4d-404b-46d0-8643-140c45240a3e	Create Employees	employees.create	employees	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
19856619-79d7-4f18-b45a-af4bf5c10135	Edit Employees	employees.edit	employees	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
14d1defe-8266-4a3d-b7ac-fd9735931270	Delete Employees	employees.delete	employees	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
4498031e-d19f-452c-ad72-3551680b02c8	View Attendance	attendance.view	attendance	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
9aef2a1d-be1c-403e-a2dd-48e73d9674c0	Manage Attendance	attendance.manage	attendance	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
d36c3fb4-00d0-45cc-a16e-f43503c17935	View Leave	leave.view	leave	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
d990b695-ed5a-4eb5-9ab2-94a94af280df	Approve Leave	leave.approve	leave	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
a3bf9e1d-ee38-4d82-8c66-a840752e8c18	Manage Leave	leave.manage	leave	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
8dfe1614-313c-4ef9-be15-c629cdc16743	View Clients	clients.view	clients	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
25b71118-f5f7-481d-9b67-dfd298d838a6	Create Clients	clients.create	clients	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
b00dfa61-539b-4681-b65c-94cc98610ef4	Edit Clients	clients.edit	clients	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
16277de5-9862-4dfb-a8ed-2f9a929db6d9	Delete Clients	clients.delete	clients	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
7c2d8c24-1006-4f4a-b142-97991e6fa495	View Projects	projects.view	projects	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
94ad93e8-405f-45f5-a1a7-fee4faa48321	Create Projects	projects.create	projects	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
001c02f2-c3d4-4992-8677-b6a472f02176	Edit Projects	projects.edit	projects	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
7c6f8815-2d89-404f-915b-c9beb2b4b280	Delete Projects	projects.delete	projects	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
7da3a556-e1ef-4600-a867-4ced095825a3	Manage Tasks	projects.tasks	projects	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
d7bb8155-ca2f-496e-b1fb-4f828f62c622	View Invoices	finance.view_invoices	finance	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
4ef00394-d685-4a19-9048-9aa126f41986	Create Invoices	finance.create_invoices	finance	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
ed59e52e-8635-4c72-b29e-f9fc8116a69f	Edit Invoices	finance.edit_invoices	finance	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
45f113bb-d4b1-4a9b-8327-e26fd2e01897	Delete Invoices	finance.delete_invoices	finance	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
288925ca-bad8-4f16-ba8c-6e4d6ea7110b	View Payments	finance.view_payments	finance	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
d6d6b3b1-2d8f-434d-8122-4c54d6d6ff72	Manage Payments	finance.manage_payments	finance	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
2f5ddf68-85ab-4e8a-ae4a-110be2d807a8	View Expenses	finance.view_expenses	finance	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
4abf9f59-5810-4004-a571-47c512417b97	Approve Expenses	finance.approve_expenses	finance	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
1e8d07cb-be39-47f7-870d-0c93d1fcc328	View POs	po.view	purchase_orders	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
fd562eb6-fe57-4f09-a7a9-9e80a6426515	Create POs	po.create	purchase_orders	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
d21c565d-b9b9-4172-9d04-974a31022854	Edit POs	po.edit	purchase_orders	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
24659987-0f1f-4556-9f56-3dcbd60768d0	Approve POs	po.approve	purchase_orders	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
d58c632b-d95b-4348-bffe-752fb9e31dd6	View Contracts	contracts.view	contracts	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
c413efeb-2259-4273-a15e-ec94fe195439	Create Contracts	contracts.create	contracts	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
974a82b0-89a9-426e-8414-de6390d5219d	Edit Contracts	contracts.edit	contracts	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
3020a4f1-1518-4b08-8b0d-e38b443f23c0	View Documents	documents.view	documents	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
8803a43e-a7f1-4e0b-8395-188bfbd00e0e	Upload Documents	documents.upload	documents	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
7dba57c3-9dd3-4961-a27c-a2ea56fd90cb	Delete Documents	documents.delete	documents	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
ff229b80-3744-4e14-9c9a-2cbe7a2beac5	Use AI Chat	ai.chat	ai	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
66c33db4-c529-466a-9107-cd0a0441427c	View Predictions	ai.predictions	ai	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
ca5d2951-019a-4552-b2f4-4baf5423fce0	View Audit Logs	system.audit_logs	system	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
4ac8b569-2676-463b-9172-45e0b63b848d	Manage Notifications	system.notifications	system	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
c971e98c-5a40-40ce-a290-714dfb7cbcb4	View Products	products.view	products	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
a51794a4-fd98-480b-96f2-7c50e507f748	Create Products	products.create	products	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
4576ac8c-8130-4cb0-9dcd-9b2e25850425	Edit Products	products.edit	products	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
b35480ea-5de0-40cb-85b8-4d5898c6c598	Delete Products	products.delete	products	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
7f76be97-e9b4-4fb7-ae01-b5107273be0a	View Product Revenue	products.view_revenue	products	\N	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.purchase_orders (id, po_number, vendor_name, vendor_email, vendor_phone, status, order_date, expected_delivery, actual_delivery, subtotal, tax_amount, total_amount, currency, notes, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: po_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.po_items (id, po_id, description, quantity, unit_price, amount, unit, sort_order, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, is_active, deleted_at, created_at, updated_at, created_by, updated_by, name, product_code, category, stream, status, description, launch_date, revenue_generated, units_sold, active_units, total_customers, product_owner_id) FROM stdin;
a37da779-5404-4383-8bb2-1a38ce433cdd	t	\N	2026-06-22 04:08:28.729403+00	2026-06-22 04:08:28.729403+00	2a147bae-7324-4ef8-818f-c944b8e551a6	\N	flame 	nrk flame01	technologies	b2b	active	ML based predictive maintance	2026-07-16	200000.00	1	1	1	\N
\.


--
-- Data for Name: project_assignments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_assignments (id, project_id, employee_id, role, assigned_at, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: project_delay_predictions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_delay_predictions (id, project_id, risk_score, risk_level, predicted_delay_days, factors, model_version, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: project_tasks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.project_tasks (id, project_id, parent_id, assignee_id, title, description, status, priority, due_date, estimated_hours, actual_hours, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
e4b68358-aacf-49a4-b008-927132234656	0a3f7831-5b4c-4f65-ba5a-31909f822c39	\N	d6d4f342-0004-417d-b3ae-2f20168b4e8f	documentation	complete the project\n	done	high	2026-06-24	3.00	\N	f	\N	2026-06-22 04:13:43.238847+00	2026-06-23 18:26:20.521595+00	\N	\N
\.


--
-- Data for Name: revenue_predictions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.revenue_predictions (id, period_start, period_end, predicted_amount, actual_amount, confidence_score, model_version, features, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, name, description, is_active, deleted_at, created_at, updated_at, created_by, updated_by) FROM stdin;
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	super_admin	Full system access	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	admin	Administrative access	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
e4ae9724-ad20-4d43-bc33-01d233828a3e	ceo	Chief Executive Officer — full access	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	cto	Chief Technology Officer	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
3c7a727a-9872-455c-b610-6471fec73364	cfo	Chief Financial Officer	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	manager	General management	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
072e4f08-8f9b-4880-8b7c-707910488242	hr_manager	HR module management	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
5a31c7e1-a8da-4a46-b913-8de4acc2fb98	project_manager	Project module management	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
9307b204-5d27-4cf7-b30f-94ca96dd1f70	finance_manager	Finance module management	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
7eb29351-28d8-485c-9699-55d75b07a332	employee	Standard employee access	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
2c398adb-3e0c-4604-a96c-972ad72b9772	viewer	Read-only access	t	\N	2026-06-21 19:34:04.051596+00	2026-06-21 19:34:04.051596+00	\N	\N
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_permissions (role_id, permission_id) FROM stdin;
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	7f76be97-e9b4-4fb7-ae01-b5107273be0a
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	d58c632b-d95b-4348-bffe-752fb9e31dd6
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	45f113bb-d4b1-4a9b-8327-e26fd2e01897
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	1e8d07cb-be39-47f7-870d-0c93d1fcc328
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	7dba57c3-9dd3-4961-a27c-a2ea56fd90cb
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	d21c565d-b9b9-4172-9d04-974a31022854
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	5bcb83a7-d819-489d-9427-4f50920f9348
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	94ad93e8-405f-45f5-a1a7-fee4faa48321
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	ed59e52e-8635-4c72-b29e-f9fc8116a69f
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	a51794a4-fd98-480b-96f2-7c50e507f748
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	4576ac8c-8130-4cb0-9dcd-9b2e25850425
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	4ac8b569-2676-463b-9172-45e0b63b848d
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	a3bf9e1d-ee38-4d82-8c66-a840752e8c18
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	d990b695-ed5a-4eb5-9ab2-94a94af280df
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	2458241c-d8e0-4680-be2d-b15caf3d618d
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	362f7d2c-b51f-45fc-83c7-de8f662bbfe4
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	288925ca-bad8-4f16-ba8c-6e4d6ea7110b
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	c413efeb-2259-4273-a15e-ec94fe195439
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	332c8733-69eb-43cf-8b24-024be5ff9e43
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	2f5ddf68-85ab-4e8a-ae4a-110be2d807a8
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	ff229b80-3744-4e14-9c9a-2cbe7a2beac5
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	9aef2a1d-be1c-403e-a2dd-48e73d9674c0
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	ca5d2951-019a-4552-b2f4-4baf5423fce0
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	b00dfa61-539b-4681-b65c-94cc98610ef4
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	4abf9f59-5810-4004-a571-47c512417b97
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	d6d6b3b1-2d8f-434d-8122-4c54d6d6ff72
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	24659987-0f1f-4556-9f56-3dcbd60768d0
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	3020a4f1-1518-4b08-8b0d-e38b443f23c0
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	001c02f2-c3d4-4992-8677-b6a472f02176
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	4ef00394-d685-4a19-9048-9aa126f41986
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	7c2d8c24-1006-4f4a-b142-97991e6fa495
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	b35480ea-5de0-40cb-85b8-4d5898c6c598
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	c971e98c-5a40-40ce-a290-714dfb7cbcb4
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	16277de5-9862-4dfb-a8ed-2f9a929db6d9
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	8dfe1614-313c-4ef9-be15-c629cdc16743
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	66c33db4-c529-466a-9107-cd0a0441427c
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	d7bb8155-ca2f-496e-b1fb-4f828f62c622
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	19856619-79d7-4f18-b45a-af4bf5c10135
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	14d1defe-8266-4a3d-b7ac-fd9735931270
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	d45f3394-8187-4e88-85d8-d150a943d081
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	0dee8333-9622-4668-9439-605b3c5443b6
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	7c6f8815-2d89-404f-915b-c9beb2b4b280
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	974a82b0-89a9-426e-8414-de6390d5219d
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	90d28b4d-404b-46d0-8643-140c45240a3e
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	d36c3fb4-00d0-45cc-a16e-f43503c17935
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	fd562eb6-fe57-4f09-a7a9-9e80a6426515
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	25b71118-f5f7-481d-9b67-dfd298d838a6
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	7da3a556-e1ef-4600-a867-4ced095825a3
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	8803a43e-a7f1-4e0b-8395-188bfbd00e0e
b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17	4498031e-d19f-452c-ad72-3551680b02c8
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	7f76be97-e9b4-4fb7-ae01-b5107273be0a
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	d58c632b-d95b-4348-bffe-752fb9e31dd6
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	45f113bb-d4b1-4a9b-8327-e26fd2e01897
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	1e8d07cb-be39-47f7-870d-0c93d1fcc328
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	7dba57c3-9dd3-4961-a27c-a2ea56fd90cb
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	d21c565d-b9b9-4172-9d04-974a31022854
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	5bcb83a7-d819-489d-9427-4f50920f9348
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	94ad93e8-405f-45f5-a1a7-fee4faa48321
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	ed59e52e-8635-4c72-b29e-f9fc8116a69f
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	a51794a4-fd98-480b-96f2-7c50e507f748
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	4576ac8c-8130-4cb0-9dcd-9b2e25850425
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	4ac8b569-2676-463b-9172-45e0b63b848d
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	a3bf9e1d-ee38-4d82-8c66-a840752e8c18
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	d990b695-ed5a-4eb5-9ab2-94a94af280df
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	2458241c-d8e0-4680-be2d-b15caf3d618d
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	288925ca-bad8-4f16-ba8c-6e4d6ea7110b
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	c413efeb-2259-4273-a15e-ec94fe195439
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	332c8733-69eb-43cf-8b24-024be5ff9e43
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	2f5ddf68-85ab-4e8a-ae4a-110be2d807a8
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	ff229b80-3744-4e14-9c9a-2cbe7a2beac5
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	9aef2a1d-be1c-403e-a2dd-48e73d9674c0
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	b00dfa61-539b-4681-b65c-94cc98610ef4
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	4abf9f59-5810-4004-a571-47c512417b97
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	d6d6b3b1-2d8f-434d-8122-4c54d6d6ff72
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	24659987-0f1f-4556-9f56-3dcbd60768d0
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	3020a4f1-1518-4b08-8b0d-e38b443f23c0
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	001c02f2-c3d4-4992-8677-b6a472f02176
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	4ef00394-d685-4a19-9048-9aa126f41986
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	7c2d8c24-1006-4f4a-b142-97991e6fa495
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	b35480ea-5de0-40cb-85b8-4d5898c6c598
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	c971e98c-5a40-40ce-a290-714dfb7cbcb4
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	16277de5-9862-4dfb-a8ed-2f9a929db6d9
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	8dfe1614-313c-4ef9-be15-c629cdc16743
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	66c33db4-c529-466a-9107-cd0a0441427c
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	d7bb8155-ca2f-496e-b1fb-4f828f62c622
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	19856619-79d7-4f18-b45a-af4bf5c10135
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	14d1defe-8266-4a3d-b7ac-fd9735931270
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	d45f3394-8187-4e88-85d8-d150a943d081
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	0dee8333-9622-4668-9439-605b3c5443b6
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	7c6f8815-2d89-404f-915b-c9beb2b4b280
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	974a82b0-89a9-426e-8414-de6390d5219d
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	90d28b4d-404b-46d0-8643-140c45240a3e
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	d36c3fb4-00d0-45cc-a16e-f43503c17935
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	fd562eb6-fe57-4f09-a7a9-9e80a6426515
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	25b71118-f5f7-481d-9b67-dfd298d838a6
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	7da3a556-e1ef-4600-a867-4ced095825a3
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	8803a43e-a7f1-4e0b-8395-188bfbd00e0e
5743c70a-9f27-4cc0-a8df-fa10bbe18d20	4498031e-d19f-452c-ad72-3551680b02c8
e4ae9724-ad20-4d43-bc33-01d233828a3e	7f76be97-e9b4-4fb7-ae01-b5107273be0a
e4ae9724-ad20-4d43-bc33-01d233828a3e	d58c632b-d95b-4348-bffe-752fb9e31dd6
e4ae9724-ad20-4d43-bc33-01d233828a3e	45f113bb-d4b1-4a9b-8327-e26fd2e01897
e4ae9724-ad20-4d43-bc33-01d233828a3e	1e8d07cb-be39-47f7-870d-0c93d1fcc328
e4ae9724-ad20-4d43-bc33-01d233828a3e	7dba57c3-9dd3-4961-a27c-a2ea56fd90cb
e4ae9724-ad20-4d43-bc33-01d233828a3e	d21c565d-b9b9-4172-9d04-974a31022854
e4ae9724-ad20-4d43-bc33-01d233828a3e	5bcb83a7-d819-489d-9427-4f50920f9348
e4ae9724-ad20-4d43-bc33-01d233828a3e	94ad93e8-405f-45f5-a1a7-fee4faa48321
e4ae9724-ad20-4d43-bc33-01d233828a3e	ed59e52e-8635-4c72-b29e-f9fc8116a69f
e4ae9724-ad20-4d43-bc33-01d233828a3e	a51794a4-fd98-480b-96f2-7c50e507f748
e4ae9724-ad20-4d43-bc33-01d233828a3e	4576ac8c-8130-4cb0-9dcd-9b2e25850425
e4ae9724-ad20-4d43-bc33-01d233828a3e	4ac8b569-2676-463b-9172-45e0b63b848d
e4ae9724-ad20-4d43-bc33-01d233828a3e	a3bf9e1d-ee38-4d82-8c66-a840752e8c18
e4ae9724-ad20-4d43-bc33-01d233828a3e	d990b695-ed5a-4eb5-9ab2-94a94af280df
e4ae9724-ad20-4d43-bc33-01d233828a3e	2458241c-d8e0-4680-be2d-b15caf3d618d
e4ae9724-ad20-4d43-bc33-01d233828a3e	362f7d2c-b51f-45fc-83c7-de8f662bbfe4
e4ae9724-ad20-4d43-bc33-01d233828a3e	288925ca-bad8-4f16-ba8c-6e4d6ea7110b
e4ae9724-ad20-4d43-bc33-01d233828a3e	c413efeb-2259-4273-a15e-ec94fe195439
e4ae9724-ad20-4d43-bc33-01d233828a3e	332c8733-69eb-43cf-8b24-024be5ff9e43
e4ae9724-ad20-4d43-bc33-01d233828a3e	2f5ddf68-85ab-4e8a-ae4a-110be2d807a8
e4ae9724-ad20-4d43-bc33-01d233828a3e	ff229b80-3744-4e14-9c9a-2cbe7a2beac5
e4ae9724-ad20-4d43-bc33-01d233828a3e	9aef2a1d-be1c-403e-a2dd-48e73d9674c0
e4ae9724-ad20-4d43-bc33-01d233828a3e	ca5d2951-019a-4552-b2f4-4baf5423fce0
e4ae9724-ad20-4d43-bc33-01d233828a3e	b00dfa61-539b-4681-b65c-94cc98610ef4
e4ae9724-ad20-4d43-bc33-01d233828a3e	4abf9f59-5810-4004-a571-47c512417b97
e4ae9724-ad20-4d43-bc33-01d233828a3e	d6d6b3b1-2d8f-434d-8122-4c54d6d6ff72
e4ae9724-ad20-4d43-bc33-01d233828a3e	24659987-0f1f-4556-9f56-3dcbd60768d0
e4ae9724-ad20-4d43-bc33-01d233828a3e	3020a4f1-1518-4b08-8b0d-e38b443f23c0
e4ae9724-ad20-4d43-bc33-01d233828a3e	001c02f2-c3d4-4992-8677-b6a472f02176
e4ae9724-ad20-4d43-bc33-01d233828a3e	4ef00394-d685-4a19-9048-9aa126f41986
e4ae9724-ad20-4d43-bc33-01d233828a3e	7c2d8c24-1006-4f4a-b142-97991e6fa495
e4ae9724-ad20-4d43-bc33-01d233828a3e	b35480ea-5de0-40cb-85b8-4d5898c6c598
e4ae9724-ad20-4d43-bc33-01d233828a3e	c971e98c-5a40-40ce-a290-714dfb7cbcb4
e4ae9724-ad20-4d43-bc33-01d233828a3e	16277de5-9862-4dfb-a8ed-2f9a929db6d9
e4ae9724-ad20-4d43-bc33-01d233828a3e	8dfe1614-313c-4ef9-be15-c629cdc16743
e4ae9724-ad20-4d43-bc33-01d233828a3e	66c33db4-c529-466a-9107-cd0a0441427c
e4ae9724-ad20-4d43-bc33-01d233828a3e	d7bb8155-ca2f-496e-b1fb-4f828f62c622
e4ae9724-ad20-4d43-bc33-01d233828a3e	19856619-79d7-4f18-b45a-af4bf5c10135
e4ae9724-ad20-4d43-bc33-01d233828a3e	14d1defe-8266-4a3d-b7ac-fd9735931270
e4ae9724-ad20-4d43-bc33-01d233828a3e	d45f3394-8187-4e88-85d8-d150a943d081
e4ae9724-ad20-4d43-bc33-01d233828a3e	0dee8333-9622-4668-9439-605b3c5443b6
e4ae9724-ad20-4d43-bc33-01d233828a3e	7c6f8815-2d89-404f-915b-c9beb2b4b280
e4ae9724-ad20-4d43-bc33-01d233828a3e	974a82b0-89a9-426e-8414-de6390d5219d
e4ae9724-ad20-4d43-bc33-01d233828a3e	90d28b4d-404b-46d0-8643-140c45240a3e
e4ae9724-ad20-4d43-bc33-01d233828a3e	d36c3fb4-00d0-45cc-a16e-f43503c17935
e4ae9724-ad20-4d43-bc33-01d233828a3e	fd562eb6-fe57-4f09-a7a9-9e80a6426515
e4ae9724-ad20-4d43-bc33-01d233828a3e	25b71118-f5f7-481d-9b67-dfd298d838a6
e4ae9724-ad20-4d43-bc33-01d233828a3e	7da3a556-e1ef-4600-a867-4ced095825a3
e4ae9724-ad20-4d43-bc33-01d233828a3e	8803a43e-a7f1-4e0b-8395-188bfbd00e0e
e4ae9724-ad20-4d43-bc33-01d233828a3e	4498031e-d19f-452c-ad72-3551680b02c8
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	7f76be97-e9b4-4fb7-ae01-b5107273be0a
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	5bcb83a7-d819-489d-9427-4f50920f9348
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	94ad93e8-405f-45f5-a1a7-fee4faa48321
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	a51794a4-fd98-480b-96f2-7c50e507f748
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	4576ac8c-8130-4cb0-9dcd-9b2e25850425
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	4ac8b569-2676-463b-9172-45e0b63b848d
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	a3bf9e1d-ee38-4d82-8c66-a840752e8c18
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	d990b695-ed5a-4eb5-9ab2-94a94af280df
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	ff229b80-3744-4e14-9c9a-2cbe7a2beac5
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	9aef2a1d-be1c-403e-a2dd-48e73d9674c0
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	b00dfa61-539b-4681-b65c-94cc98610ef4
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	3020a4f1-1518-4b08-8b0d-e38b443f23c0
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	001c02f2-c3d4-4992-8677-b6a472f02176
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	7c2d8c24-1006-4f4a-b142-97991e6fa495
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	c971e98c-5a40-40ce-a290-714dfb7cbcb4
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	8dfe1614-313c-4ef9-be15-c629cdc16743
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	66c33db4-c529-466a-9107-cd0a0441427c
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	19856619-79d7-4f18-b45a-af4bf5c10135
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	7c6f8815-2d89-404f-915b-c9beb2b4b280
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	90d28b4d-404b-46d0-8643-140c45240a3e
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	d36c3fb4-00d0-45cc-a16e-f43503c17935
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	25b71118-f5f7-481d-9b67-dfd298d838a6
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	7da3a556-e1ef-4600-a867-4ced095825a3
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	8803a43e-a7f1-4e0b-8395-188bfbd00e0e
3e5aea6b-430b-4c4b-b22e-c5fefdec9007	4498031e-d19f-452c-ad72-3551680b02c8
3c7a727a-9872-455c-b610-6471fec73364	7f76be97-e9b4-4fb7-ae01-b5107273be0a
3c7a727a-9872-455c-b610-6471fec73364	d58c632b-d95b-4348-bffe-752fb9e31dd6
3c7a727a-9872-455c-b610-6471fec73364	45f113bb-d4b1-4a9b-8327-e26fd2e01897
3c7a727a-9872-455c-b610-6471fec73364	1e8d07cb-be39-47f7-870d-0c93d1fcc328
3c7a727a-9872-455c-b610-6471fec73364	d21c565d-b9b9-4172-9d04-974a31022854
3c7a727a-9872-455c-b610-6471fec73364	ed59e52e-8635-4c72-b29e-f9fc8116a69f
3c7a727a-9872-455c-b610-6471fec73364	4ac8b569-2676-463b-9172-45e0b63b848d
3c7a727a-9872-455c-b610-6471fec73364	288925ca-bad8-4f16-ba8c-6e4d6ea7110b
3c7a727a-9872-455c-b610-6471fec73364	c413efeb-2259-4273-a15e-ec94fe195439
3c7a727a-9872-455c-b610-6471fec73364	2f5ddf68-85ab-4e8a-ae4a-110be2d807a8
3c7a727a-9872-455c-b610-6471fec73364	ff229b80-3744-4e14-9c9a-2cbe7a2beac5
3c7a727a-9872-455c-b610-6471fec73364	4abf9f59-5810-4004-a571-47c512417b97
3c7a727a-9872-455c-b610-6471fec73364	d6d6b3b1-2d8f-434d-8122-4c54d6d6ff72
3c7a727a-9872-455c-b610-6471fec73364	24659987-0f1f-4556-9f56-3dcbd60768d0
3c7a727a-9872-455c-b610-6471fec73364	3020a4f1-1518-4b08-8b0d-e38b443f23c0
3c7a727a-9872-455c-b610-6471fec73364	4ef00394-d685-4a19-9048-9aa126f41986
3c7a727a-9872-455c-b610-6471fec73364	c971e98c-5a40-40ce-a290-714dfb7cbcb4
3c7a727a-9872-455c-b610-6471fec73364	8dfe1614-313c-4ef9-be15-c629cdc16743
3c7a727a-9872-455c-b610-6471fec73364	66c33db4-c529-466a-9107-cd0a0441427c
3c7a727a-9872-455c-b610-6471fec73364	d7bb8155-ca2f-496e-b1fb-4f828f62c622
3c7a727a-9872-455c-b610-6471fec73364	974a82b0-89a9-426e-8414-de6390d5219d
3c7a727a-9872-455c-b610-6471fec73364	fd562eb6-fe57-4f09-a7a9-9e80a6426515
3c7a727a-9872-455c-b610-6471fec73364	8803a43e-a7f1-4e0b-8395-188bfbd00e0e
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	7f76be97-e9b4-4fb7-ae01-b5107273be0a
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	d58c632b-d95b-4348-bffe-752fb9e31dd6
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	5bcb83a7-d819-489d-9427-4f50920f9348
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	94ad93e8-405f-45f5-a1a7-fee4faa48321
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	a51794a4-fd98-480b-96f2-7c50e507f748
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	4576ac8c-8130-4cb0-9dcd-9b2e25850425
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	d990b695-ed5a-4eb5-9ab2-94a94af280df
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	288925ca-bad8-4f16-ba8c-6e4d6ea7110b
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	2f5ddf68-85ab-4e8a-ae4a-110be2d807a8
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	ff229b80-3744-4e14-9c9a-2cbe7a2beac5
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	b00dfa61-539b-4681-b65c-94cc98610ef4
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	4abf9f59-5810-4004-a571-47c512417b97
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	3020a4f1-1518-4b08-8b0d-e38b443f23c0
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	001c02f2-c3d4-4992-8677-b6a472f02176
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	7c2d8c24-1006-4f4a-b142-97991e6fa495
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	c971e98c-5a40-40ce-a290-714dfb7cbcb4
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	8dfe1614-313c-4ef9-be15-c629cdc16743
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	66c33db4-c529-466a-9107-cd0a0441427c
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	d7bb8155-ca2f-496e-b1fb-4f828f62c622
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	d36c3fb4-00d0-45cc-a16e-f43503c17935
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	25b71118-f5f7-481d-9b67-dfd298d838a6
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	7da3a556-e1ef-4600-a867-4ced095825a3
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	8803a43e-a7f1-4e0b-8395-188bfbd00e0e
c5e04041-2c4a-468b-9a6f-6c95a00d9c3d	4498031e-d19f-452c-ad72-3551680b02c8
072e4f08-8f9b-4880-8b7c-707910488242	a3bf9e1d-ee38-4d82-8c66-a840752e8c18
072e4f08-8f9b-4880-8b7c-707910488242	19856619-79d7-4f18-b45a-af4bf5c10135
072e4f08-8f9b-4880-8b7c-707910488242	d990b695-ed5a-4eb5-9ab2-94a94af280df
072e4f08-8f9b-4880-8b7c-707910488242	3020a4f1-1518-4b08-8b0d-e38b443f23c0
072e4f08-8f9b-4880-8b7c-707910488242	90d28b4d-404b-46d0-8643-140c45240a3e
072e4f08-8f9b-4880-8b7c-707910488242	d36c3fb4-00d0-45cc-a16e-f43503c17935
072e4f08-8f9b-4880-8b7c-707910488242	5bcb83a7-d819-489d-9427-4f50920f9348
072e4f08-8f9b-4880-8b7c-707910488242	c971e98c-5a40-40ce-a290-714dfb7cbcb4
072e4f08-8f9b-4880-8b7c-707910488242	9aef2a1d-be1c-403e-a2dd-48e73d9674c0
072e4f08-8f9b-4880-8b7c-707910488242	8803a43e-a7f1-4e0b-8395-188bfbd00e0e
072e4f08-8f9b-4880-8b7c-707910488242	4498031e-d19f-452c-ad72-3551680b02c8
5a31c7e1-a8da-4a46-b913-8de4acc2fb98	3020a4f1-1518-4b08-8b0d-e38b443f23c0
5a31c7e1-a8da-4a46-b913-8de4acc2fb98	001c02f2-c3d4-4992-8677-b6a472f02176
5a31c7e1-a8da-4a46-b913-8de4acc2fb98	7c2d8c24-1006-4f4a-b142-97991e6fa495
5a31c7e1-a8da-4a46-b913-8de4acc2fb98	5bcb83a7-d819-489d-9427-4f50920f9348
5a31c7e1-a8da-4a46-b913-8de4acc2fb98	94ad93e8-405f-45f5-a1a7-fee4faa48321
5a31c7e1-a8da-4a46-b913-8de4acc2fb98	2f5ddf68-85ab-4e8a-ae4a-110be2d807a8
5a31c7e1-a8da-4a46-b913-8de4acc2fb98	c971e98c-5a40-40ce-a290-714dfb7cbcb4
5a31c7e1-a8da-4a46-b913-8de4acc2fb98	8dfe1614-313c-4ef9-be15-c629cdc16743
5a31c7e1-a8da-4a46-b913-8de4acc2fb98	7da3a556-e1ef-4600-a867-4ced095825a3
5a31c7e1-a8da-4a46-b913-8de4acc2fb98	ff229b80-3744-4e14-9c9a-2cbe7a2beac5
5a31c7e1-a8da-4a46-b913-8de4acc2fb98	66c33db4-c529-466a-9107-cd0a0441427c
5a31c7e1-a8da-4a46-b913-8de4acc2fb98	8803a43e-a7f1-4e0b-8395-188bfbd00e0e
5a31c7e1-a8da-4a46-b913-8de4acc2fb98	d7bb8155-ca2f-496e-b1fb-4f828f62c622
9307b204-5d27-4cf7-b30f-94ca96dd1f70	7f76be97-e9b4-4fb7-ae01-b5107273be0a
9307b204-5d27-4cf7-b30f-94ca96dd1f70	d58c632b-d95b-4348-bffe-752fb9e31dd6
9307b204-5d27-4cf7-b30f-94ca96dd1f70	45f113bb-d4b1-4a9b-8327-e26fd2e01897
9307b204-5d27-4cf7-b30f-94ca96dd1f70	1e8d07cb-be39-47f7-870d-0c93d1fcc328
9307b204-5d27-4cf7-b30f-94ca96dd1f70	d21c565d-b9b9-4172-9d04-974a31022854
9307b204-5d27-4cf7-b30f-94ca96dd1f70	ed59e52e-8635-4c72-b29e-f9fc8116a69f
9307b204-5d27-4cf7-b30f-94ca96dd1f70	288925ca-bad8-4f16-ba8c-6e4d6ea7110b
9307b204-5d27-4cf7-b30f-94ca96dd1f70	2f5ddf68-85ab-4e8a-ae4a-110be2d807a8
9307b204-5d27-4cf7-b30f-94ca96dd1f70	4abf9f59-5810-4004-a571-47c512417b97
9307b204-5d27-4cf7-b30f-94ca96dd1f70	d6d6b3b1-2d8f-434d-8122-4c54d6d6ff72
9307b204-5d27-4cf7-b30f-94ca96dd1f70	24659987-0f1f-4556-9f56-3dcbd60768d0
9307b204-5d27-4cf7-b30f-94ca96dd1f70	3020a4f1-1518-4b08-8b0d-e38b443f23c0
9307b204-5d27-4cf7-b30f-94ca96dd1f70	4ef00394-d685-4a19-9048-9aa126f41986
9307b204-5d27-4cf7-b30f-94ca96dd1f70	c971e98c-5a40-40ce-a290-714dfb7cbcb4
9307b204-5d27-4cf7-b30f-94ca96dd1f70	8dfe1614-313c-4ef9-be15-c629cdc16743
9307b204-5d27-4cf7-b30f-94ca96dd1f70	66c33db4-c529-466a-9107-cd0a0441427c
9307b204-5d27-4cf7-b30f-94ca96dd1f70	d7bb8155-ca2f-496e-b1fb-4f828f62c622
9307b204-5d27-4cf7-b30f-94ca96dd1f70	fd562eb6-fe57-4f09-a7a9-9e80a6426515
9307b204-5d27-4cf7-b30f-94ca96dd1f70	8803a43e-a7f1-4e0b-8395-188bfbd00e0e
7eb29351-28d8-485c-9699-55d75b07a332	3020a4f1-1518-4b08-8b0d-e38b443f23c0
7eb29351-28d8-485c-9699-55d75b07a332	7c2d8c24-1006-4f4a-b142-97991e6fa495
7eb29351-28d8-485c-9699-55d75b07a332	d36c3fb4-00d0-45cc-a16e-f43503c17935
7eb29351-28d8-485c-9699-55d75b07a332	2f5ddf68-85ab-4e8a-ae4a-110be2d807a8
7eb29351-28d8-485c-9699-55d75b07a332	c971e98c-5a40-40ce-a290-714dfb7cbcb4
7eb29351-28d8-485c-9699-55d75b07a332	ff229b80-3744-4e14-9c9a-2cbe7a2beac5
7eb29351-28d8-485c-9699-55d75b07a332	4498031e-d19f-452c-ad72-3551680b02c8
2c398adb-3e0c-4604-a96c-972ad72b9772	3020a4f1-1518-4b08-8b0d-e38b443f23c0
2c398adb-3e0c-4604-a96c-972ad72b9772	7c2d8c24-1006-4f4a-b142-97991e6fa495
2c398adb-3e0c-4604-a96c-972ad72b9772	5bcb83a7-d819-489d-9427-4f50920f9348
2c398adb-3e0c-4604-a96c-972ad72b9772	c971e98c-5a40-40ce-a290-714dfb7cbcb4
2c398adb-3e0c-4604-a96c-972ad72b9772	8dfe1614-313c-4ef9-be15-c629cdc16743
2c398adb-3e0c-4604-a96c-972ad72b9772	d7bb8155-ca2f-496e-b1fb-4f828f62c622
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_roles (user_id, role_id) FROM stdin;
2a147bae-7324-4ef8-818f-c944b8e551a6	b7aa49b7-a7ff-44cc-82f9-13db3ffc3d17
083b111e-f305-4608-8ab4-6a0316572f9a	e4ae9724-ad20-4d43-bc33-01d233828a3e
97e09372-f416-47de-8bc4-1a80fe5b89c4	3e5aea6b-430b-4c4b-b22e-c5fefdec9007
d44e9b8e-2391-4caf-bfd5-bab59132181f	3c7a727a-9872-455c-b610-6471fec73364
\.


--
-- PostgreSQL database dump complete
--

\unrestrict gRuet9Kp96i0Py2CQ2UUlDSR0hzcl20pPBKiHDFOvKkc9dlVQwsHlK67MIdTG9N

