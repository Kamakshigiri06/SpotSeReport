# Spot & Report: Smart Municipal Infrastructure Dispatch

A modern, full-stack civic reporting and municipal dispatch platform that bridges the gap between active citizens and public works departments. Engineered with **React**, **Vite**, **Express**, and **Gemini 3.5 Flash** to streamline community-sourced incident triage, dispatch automation, and predictive operational insights.

---

## 🌟 Core Features

### 1. Citizen Incident Reporting Portal
- **Interactive Multi-Step Reporting**: High-fidelity visual form supporting precise category selection, geo-location coordinates, and detailed descriptions.
- **Microphone & Voice-to-Text Reporting**: Seamlessly transcribe spoken reports into structured incident data using the Web Speech API.
- **AI Triage Integration (Gemini-Powered)**: Analyze report details automatically to classify the issue severity (low, medium, high, critical) and estimate repair times (SLA metrics).

### 2. Admin Command & Dispatch Control Panel
- **Real-Time Operational Indicators**: High-level visual statistics detailing total reports, open incidents, average SLA adherence, and active crew distribution.
- **Interactive Filter & Search Engine**: Instantly sort by severity level, categories, specific municipalities, or search report query keywords.
- **Live Dispatch Workflows**: Easily assign registered public utility crews to open incidents and update case progress states.

### 3. Gemini Operational Intelligence Engine
- **Daily Operational Insight Card**: A smart dynamic digest at the top of the Admin Panel analyzing incidents logged in the past 24 hours. Details critical vulnerabilities, primary municipal stress points, and provides tactical field directives.
- **Weekly Operational Trends & Diagnostics Report**: Runs automated multi-incident data audits to forecast recurring vulnerabilities and issues strategic long-term directives.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend**: Node.js, Express
- **AI Engine**: `@google/genai` (Gemini 3.5 Flash)
- **State & Data Management**: Local storage session cache engine with server-side transaction handling

---

