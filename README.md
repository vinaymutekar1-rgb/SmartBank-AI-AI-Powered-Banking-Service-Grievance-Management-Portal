# SmartBank AI – AI-Powered Banking Service & Grievance Management Portal

[![PWA Installable](https://img.shields.io/badge/PWA-Installable-blue.svg)](#) [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE) [![Version](https://img.shields.io/badge/Version-v2.0.0-lightgray.svg)](#)

SmartBank AI is a premium, fully client-side fintech customer-service platform inspired by dashboards like Stripe, Revolut Business, and Razorpay. Built exclusively using a static tech stack — **HTML5, CSS3 (Glassmorphism + custom responsive grid), and modular Vanilla ES6 JavaScript** — with zero compilation steps, external bundlers, frameworks, or server-side setups. This project is released under the MIT License (v2.0.0).

---

## 📷 Application Showcase

Here is the operational architecture of the AI-powered banking dashboard portal.

### Executive Banking Dashboard Overview
```
+-----------------------------------------------------------------------------------------+
| [SmartBank AI] (AI Banking Assistant)     SUBMIT REQUEST   BRANCH NETWORK   [O] Theme    |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|   SMARTBANK AI                                                                          |
|   AI-Powered Banking Service & Smart Customer Support                                   |
|                                                                                         |
|   [ Submit Request ]      [ View Dashboard ]                                            |
|                                                                                         |
|   +---------------------------------------+   +---------------------------------------+ |
|   | Total Requests  | Critical Requests   |   | Pending         | Resolved            | |
|   |       4          |        1            |   |       3         |     1               | |
|   +---------------------------------------+   +---------------------------------------+ |
|                                                                                         |
|   REQUEST RESOLUTION RATE  [=======================>                      ] 25%          |
|                                                                                         |
+-----------------------------------------------------------------------------------------+
```

### Real-Time Analytics & Branch Network Simulation
```
+-------------------------------------------+   +---------------------------------------+
| Category Distribution (Chart.js)          |   | Branch Network Live Map               |
|                                           |   |                                       |
|               ( DOUGHNUT )                |   |   (o) Fraud Report                    |
|                                           |   |                      (o) Card Services|
|                                           |   |   (o) Digital Banking                 |
+-------------------------------------------+   +---------------------------------------+
```

---

## 🚀 Architectural & Technological Highlights

### 1. 🧠 Simulated AI Analysis Engine
* **Heuristic Urgency Evaluator**: Actively scans request descriptions for critical/high urgency signals (e.g., `fraud`, `unauthorized`, `blocked`, `failed`, `debited`) to weigh and trigger immediate Priority assignments (Critical, High, Medium, Normal).
* **Smart Department Auto-Routing**: Automatically routes requests to the correct department — Digital Banking, Card Services, Loans, Customer Support, Fraud Investigation, Operations, or KYC Team.
* **Resolution Time Estimation**: Predicts estimated turnaround (2 Hours, 6 Hours, 24 Hours, or 3 Days) based on category and urgency signals.

### 2. 🗺️ Branch Network Live Map
* Simulated grid vector map with animated branch marker coordinates.
* Directly integrates with the request ledger so clicking coordinates instantly highlights corresponding requests.

### 3. 🎙️ Voice Input Interface
* **Web Speech Dictation**: Hands-free voice input directly populates the multi-line issue description field.

### 4. 🔒 Enterprise Security & Admin Modules
* **Input Sanitization**: Escapes strings to prevent injection attempts (XSS).
* **Duplicate Guard**: Blocks duplicate pending requests for the same category/branch.
* **Admin Edit Modal**: Override request details; AI automatically re-routes priority/department on save.
* **Data Portability**: Full CSV ledger export (bulk + single-record) and print-ready CSS profiles for PDF archiving.
* **Undo Delete**: 5-second grace period to recover accidentally deleted requests.

### 5. 📊 Premium Analytics Dashboard
* 8 live KPI cards: Total Requests, Critical Requests, Pending, Resolved, Avg. Resolution Time, Fraud Alerts, Customer Satisfaction, Digital Banking Requests.
* 5 Chart.js visualizations: Category Distribution, Priority Distribution, Monthly Requests, Department Workload, Resolution Trend.
* AI Banking Summary panel: Most Reported Issue, Peak Request Time, Average Resolution, and a dynamic AI Recommendation.

---

## 📂 Project Structure
```
SmartComplaintPortal/
├── index.html       # Master markup & UI layout (Hero, Form, Dashboard, Charts, Modals)
├── style.css        # Premium fintech glassmorphism theme, animations & print formats
├── script.js        # AI simulation engine, data layer, chart bindings & UI logic
├── manifest.json    # PWA specifications
└── sw.js            # Offline caching service worker
```

---

## ⚡ Setup & Launch Instructions

This project requires **no installation, no node_modules, and no backend servers**.

1. Locate the `SmartComplaintPortal` folder.
2. Double-click or open `index.html` inside any modern web browser (Chrome, Safari, Edge, Firefox).
3. Toggle the light/dark switch to preview the premium banking theme.
4. Click **Submit Request**, fill in the banking service form (or dictate the description), and watch the AI engine predict urgency, route the correct department, and estimate resolution time — instantly!
5. Explore the **Executive Banking Dashboard**, live Chart.js analytics, AI Banking Summary, and the searchable/filterable Request Management Ledger.

---

## ✅ Preserved Features

* Dark / Light Mode (auto-detects system preference, persists in LocalStorage)
* Full PWA support (installable, offline-ready via Service Worker)
* LocalStorage persistence for all banking requests
* CSV Export (bulk ledger + single-record)
* PDF Export (via browser print-to-PDF)
* Toast notifications for all key actions
* Fully responsive layout (mobile, tablet, desktop)
* Voice input (Web Speech API dictation)

## 👨‍💻 Developer

Developed by Vinay Mutekar

