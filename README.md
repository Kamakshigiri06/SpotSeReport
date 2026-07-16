<div align="center">

# SpotseReport 🗺️🤖

### Citizen-Powered Community Issue Reporting, AI-Smart Triage & Gamified Civic Action

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?logo=express&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)
![Google Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?logo=googlegemini&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwindcss&logoColor=white)

</div>

SpotseReport is a full-stack civic-engagement platform that bridges the gap between citizens and public administration by automating the reporting, verification, and resolution of neighborhood issues — potholes, garbage dumps, broken streetlights, water leaks, and power outages — using Google Gemini AI, Firebase, and live browser/native media capture.

---

## 📌 Problem Statement

Municipal administrations in fast-growing cities face systemic bottlenecks in maintaining street-level infrastructure:

| ❌ Pain Point | ✅ SpotseReport's Fix |
|---|---|
| High friction in photo/video evidence submission | Live WebRTC + native mobile camera capture — no old file uploads |
| Manual, slow routing to ward engineers | Gemini AI auto-triage with SLA assignment |
| No citizen transparency or feedback loop | Gamified XP, peer verification & a real-time civic ledger |
| Purely reactive maintenance — fixes only after full failure | Predictive ML that warns of failures before they occur |
| Spam & invalid media clogging reporting portals | Strict MIME-type + size validation (10MB photo / 25MB video) |

---

## 💡 Solution

1. **Pristine reporting** — pin an exact location on an interactive Leaflet/OSM map using automatic GPS geolocation and OSM Nominatim reverse-geocoding.
2. **Live-only evidence capture** — a dedicated capture flow that accepts only real-time evidence, via a browser WebRTC camera stream or a native mobile camera trigger (`capture="environment"`).
3. **Rigorous validation** — a `validateMedia` guard enforces strict MIME types and size limits immediately after capture.
4. **Automated AI triage** — server-side Google Gemini parses each description, rewrites it in formal municipal language, extracts severity, assigns tags, and starts an SLA countdown.
5. **Community verification** — once a report earns 2+ citizen validations, it's automatically stamped **"✓ Community Verified,"** filtering spam and helping the municipality prioritize.
6. **Gamified engagement** — an XP system, the Eco-Sorter game, a Civic Trivia Quiz, and an Eco-Buddy chatbot reward long-term participation.
7. **Bounties marketplace** — high-priority cleanup tasks can be claimed, completed, and submitted for municipal verification in exchange for XP.
8. **Predictive insights** — Gemini-driven modeling analyzes historical reports, seasonal data, and issue clusters to warn ward supervisors of likely failures (e.g., "92% Road Erosion Risk in Ward 4") before they happen.

---

## 🌟 Key Features

- 🗺️ **Map-Centric Dashboard** — all reports plotted live, color-coded by status (Pending / Assigned / Resolved), with dynamic category icons (Trash, Zap, Droplets, Hammer, Lightbulb).
- 📸 **Dual-Mode Live Evidence Capture** — WebRTC browser stream + native mobile camera hook.
- 🛡️ **Fail-Safe Media Validation** — client-side MIME/size checks before Base64 encoding.
- 📍 **Automatic GPS Locator** — one-tap "Detect My Location" with reverse-geocoded address lookup.
- ✅ **Community Upvoting & Live Civic Ledger** — real-time ticker of civic activity across districts.
- 🎮 **Cleanliness Arcade** — games and quizzes that reward participation with persistent XP.
- 🏛️ **Admin Panel** — lets ward officers change report status, assign engineers, and track ward health metrics.

---

## 🛠️ Tech Stack

**Frontend**
`React 18+ (Vite)` · `TypeScript` · `Tailwind CSS` · `Motion (motion/react)` · `Lucide React`

**Backend**
`Node.js` · `Express` · `tsx` + `esbuild` (bundled to `dist/server.cjs`)

**APIs & Services**
`OpenStreetMap` + `Leaflet` · `OSM Nominatim` (reverse geocoding) · `WebRTC MediaStream API`

**Google Technologies**
`Google Gemini API` (`@google/genai`) for AI triage, the Eco-Buddy chatbot & predictive insights · `Firebase Firestore` for real-time persistence · `Firebase Authentication` for Citizen/Admin role switching · `Google Cloud Run` for serverless hosting

---

## 📊 System Architecture & Workflows

<details>
<summary><strong>A. Issue Reporting, Live Capturing & Validation Pipeline</strong></summary>

How a citizen fills out a report, captures live media (WebRTC or native camera), triggers the validator, and kicks off server-side Gemini triage.

```mermaid
graph TD
    A[Citizen Opens App] --> B[Fill Report Details]
    B --> C{Live Capture Choice}
    
    C -->|Web RTC Stream| D[WebRTC Browser Camera Active]
    C -->|Mobile Native Camera| E[Trigger Native Camera capture=environment]
    
    D -->|Snapshot/Record| F[Capture Media Output]
    E -->|Snapshot/Record| F
    
    F --> G[Invoke validateMedia Helper]
    G --> H{Format valid & Size <= Max Limit?}
    
    H -->|No| I[Display Custom Error & Block Upload]
    H -->|Yes| J[Convert to Base64 String]
    
    J --> K[Detect GPS Coordinates & OSM Geocode]
    K --> L[Assemble JSON Payload]
    L --> M[POST /api/reports]
    
    M --> N[Express Backend /api/reports]
    N --> O[Invoke Google Gemini API Triage]
    O --> P[Auto-Assign Category, Severity & SLA duration]
    
    P --> Q[Store in Firebase Firestore]
    Q --> R[Broadcast Notification & Render Cards with Dynamic Lucide Icons]
```
</details>

<details>
<summary><strong>B. Dynamic Icon & Category Selection Loop</strong></summary>

How the app resolves category values into dynamic Lucide icons for instant visual recognition.

```mermaid
graph TD
    A[Fetch Report Card / Detail Component] --> B[Read report.category value]
    B --> C{Category Matching}
    
    C -->|garbage| D[Render Lucide Trash Icon]
    C -->|electricity| E[Render Lucide Zap Icon]
    C -->|water| F[Render Lucide Droplets Icon]
    C -->|streetlight| G[Render Lucide Lightbulb Icon]
    C -->|pothole| H[Render Lucide Hammer Icon]
    C -->|Other| I[Render Default Alert Icon]
    
    D & E & F & G & H & I --> J[Affix Custom CSS Theme Background & Text Accent]
    J --> K[Paint ReportCard UI Elements]
```
</details>

<details>
<summary><strong>C. Community Verification & Upvoting Loop</strong></summary>

The peer-review mechanism that upgrades a report to "Verified" status and blocks municipal spam.

```mermaid
graph TD
    A[Citizen Opens Issue Map or Board] --> B[Select Pending Issue Card]
    B --> C{Has Already Upvoted?}
    C -->|Yes| D[Disable Click / Toggle Off]
    C -->|No| E[Click 'Verify Issue' ThumbsUp]
    
    E --> F[POST /api/reports/:id/upvote]
    F --> G[Update Firestore upvotes_count]
    G --> H{upvotes_count >= 2?}
    H -->|Yes| I[Affix '✓ Community Verified' Stamp]
    H -->|No| J[Keep Status Badge Normal]
    
    I & J --> K[Re-Render UI for All Connected Users]
    I --> L[Award XP bonus to the Original Reporter]
```
</details>

<details>
<summary><strong>D. Civic Bounties & Gamified Rewards Engine</strong></summary>

How citizens find bounties, complete tasks, and earn persistent XP synced with Firestore.

```mermaid
graph TD
    A[Citizen navigates to Bounties Tab] --> B[Browse High-Priority Neighborhood Tasks]
    B --> C[Click 'Claim Bounty']
    C --> D[Mark Bounty state as 'Claimed' in Firestore]
    
    D --> E[Complete physical action in Ward]
    E --> F[Upload completion photo evidence]
    F --> G[Click 'Submit for Completion']
    
    G --> H[Admin reviews proof in panel]
    H -->|Approve| I[Post status as Resolved]
    I --> J[Increment citizen's xp_points in Firestore]
    J --> K[Re-render level indicator & XP progress bars]
    
    H -->|Reject| L[Re-open Bounty to marketplace]
```
</details>

<details>
<summary><strong>E. AI Predictive Insights & Telemetry Forecast</strong></summary>

How the backend and Gemini evaluate city telemetry to predict infrastructure failures.

```mermaid
graph TD
    A[User requests AI Predictive Insights] --> B[Fetch historical reports count & categories]
    B --> C[Fetch environmental metrics from Firestore]
    C --> D[Send payload to Gemini AI Model]
    
    D --> E[Evaluate Road Degradation Probability]
    D --> F[Evaluate Power Grid Outage Probability]
    D --> G[Evaluate Localized Sewage Bottlenecks]
    
    E & F & G --> H[Generate Gemini AI Forecast Summary Text]
    H --> I[Render Risk Cards & Ward Recommendations]
```
</details>

---

## 🌍 Impact & Innovation

- **Environmental Impact** — tracks CO₂ displaced, landfill diversion, and water saved per resolved issue, converting civic action into measurable sustainability metrics.
- **Civic Engagement** — gamified XP, the bounty marketplace, and community verification turn passive citizens into active civic stakeholders.
- **Predictive Prevention** — shifts municipal maintenance from reactive to proactive by flagging road erosion, grid overloads, and drainage bottlenecks before they escalate.

---


## 📸 Screenshots

<img width="1572" height="935" alt="image" src="https://github.com/user-attachments/assets/c56f3776-ecca-4db7-87ba-91e71ff255f3" />
<img width="1662" height="898" alt="image" src="https://github.com/user-attachments/assets/c67ca9f2-7547-4f48-a0d2-9de8ed346125" />
<img width="1638" height="922" alt="image" src="https://github.com/user-attachments/assets/5a08e988-39b5-4928-af28-00ec82290ce1" />
<img width="1638" height="922" alt="image" src="https://github.com/user-attachments/assets/87b6cb3e-03a0-461b-ae48-f2d8f4926e67" />
<img width="1590" height="908" alt="image" src="https://github.com/user-attachments/assets/39ad4b2d-42d7-4bfa-818f-b70c1831e90d" />




---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Feel free to check the issues page or open a pull request.

---


## 🙌 Team

Built with ❤️ for communities everywhere.

- Your Name — Role
- Add your teammates here

---

<div align="center">

**Powered by:** Google Gemini · Firebase · Cloud Run · React · Node.js · Leaflet/OSM

</div>
