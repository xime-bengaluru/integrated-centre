# XIME Integrated Centre

**Xavier Institute of Management & Entrepreneurship · Bengaluru**  
`github.com/xime-bengaluru/integrated-centre`

---

## What This Is

The XIME Integrated Centre is the institutional operations hub for XIME Bengaluru — a unified digital platform that brings Faculty Development, HR & Recruitment, and future ERP functions into a single, accessible system.

This repository contains all source code, process documents, and module files for the hub. It is private, version-controlled, and maintained by the XIME technology team.

---

## Architecture — Three Modules

```
XIME Integrated Centre
│
├── 01-fdp/              Faculty Development Portal
├── 02-hrms/             HR & Recruitment Module  
└── 03-erp/              ERP — Phase 2 (planned)
```

### Module 1 — Faculty Development Portal (FDP)
Tracks all forms of faculty scholarship and development activity including training attended, papers published, conferences, MDPs delivered, and industry engagement. Accessible by faculty for self-update and by the President for institutional overview.

**Status:** Active · Pilot with 6 faculty members

**Pilot Faculty:**

| Name | Campus | Status |
|------|--------|--------|
| Dr. Christopher | Bengaluru | Pilot |
| Dr. Tijo | Bengaluru | Pilot |
| Dr. Christina | Bengaluru | Pilot |
| Dr. Ranjith Nair | Kochi | Pilot |
| Prof. Geethika Thomas | Kochi | Pilot |
| Prof. Lavanya Nagarajan | Kochi | Pilot |

---

### Module 2 — HRMS Recruitment Module
End-to-end recruitment workflow from Manpower Requisition through to Pre-Joining and Onboarding handoff. Built on the redesigned 13-step hiring process with 5 approval gates and HRMS triggers.

**Status:** Active · Live test with current recruitment pipeline

**Key roles in workflow:**

| Role | Person | Function |
|------|--------|----------|
| Recruitment Professional | Anjaly | Manages pipeline, shortlisting, offer |
| Approving Authority | President / Designate | Sanctions roles, signs off offers |
| Onboarding | Reetha (President's Office) | Receives handoff at Step 13 |

**Process documents in this module:**
- Hiring Process — Redesigned Flow (v2)
- Hiring Request Form (upgraded from original)
- Manpower Requisition Form
- Hiring Process Flowchart

---

### Module 3 — ERP (Phase 2)
Planned. Scope to be defined following successful pilot of Modules 1 and 2.

---

## Pilot Plan

### Objective
Demonstrate to institutional leadership that the hub works — real faculty using FDP, real recruitment running through HRMS, outcomes visible in a unified president's view.

### Pilot Success Scorecard

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Faculty profiles active and updated | 6 of 6 | Within 30 days of launch |
| End-to-end recruitment completed via portal | 1 | First recruitment in pipeline |
| President accessed portal independently | Yes | Within pilot window |
| Zero process steps done outside the system | Confirmed | Throughout pilot |

### Anil's View (President Dashboard)
On login, the President sees:
- **FDP tile** — clickable — summary of 6 faculty activity
- **HRMS tile** — clickable — live recruitment pipeline status and pending approvals
- **ERP tile** — visible but not yet active — signals roadmap
- **Mobile responsive** — full functionality on phone

---

## Repository Structure

```
integrated-centre/
│
├── README.md                          ← This file
│
├── 01-fdp/
│   ├── faculty-self-assessment.html   ← Interactive 4-quadrant tool
│   ├── president-fdp-view.html        ← Anil's faculty overview
│   └── docs/
│       └── fdp-framework.md           ← Lavanya's FDP framework notes
│
├── 02-hrms/
│   ├── portal/
│   │   ├── president-dashboard.html   ← Anil's unified hub entry view
│   │   ├── recruitment-pipeline.html  ← Live recruitment tracker
│   │   └── approval-flow.html         ← Approval gateway interface
│   ├── forms/
│   │   ├── hiring-request-form-v2.html       ← Upgraded HRF
│   │   └── manpower-requisition-form.html    ← New MRF / Step 0
│   └── docs/
│       ├── hiring-process-flow-v2.html       ← Full process with colour codes
│       └── hiring-process-flowchart.html     ← High level flow diagram
│
├── 03-erp/
│   └── placeholder.md                 ← Phase 2 — scope TBD
│
└── assets/
    ├── xime-brand/                    ← Logo, colours, typography
    └── shared/                        ← CSS, fonts, common components
```

---

## Technology Approach

All modules are built as **standalone HTML files** — no frameworks, no external dependencies, no server required to view. This means:
- Any file can be opened directly in a browser
- Sharing is as simple as sending a file or a link
- No IT infrastructure required for the pilot phase
- Deployment to a web host is straightforward when ready

When the pilot succeeds and the hub goes live, files are deployed via **GitHub Pages** (free, built into this repo) — which means `xime-bengaluru.github.io/integrated-centre` becomes the live URL.

---

## People

| Role | Person | Contact |
|------|--------|---------|
| Architect & Dean External Programs | Prof. Girish Vasudevan | girishv@xime.org |
| Technical Maintainer | Lavanya | [to be added] |
| Officiating Director | Dr. Roshni James | roshni@xime.org |
| President | Anil J. Philip | [XIME email] |
| Recruitment Professional | Anjaly | [XIME email] |
| Onboarding | Reetha Joseph | [XIME email] |

---

## Status & Roadmap

| Phase | Module | Status |
|-------|--------|--------|
| Pilot | FDP — 6 faculty | In progress |
| Pilot | HRMS Recruitment | In progress |
| Phase 2 | ERP | Planned |
| Phase 2 | Onboarding Module | Pending Monday mapping with Reetha |
| Future | Operations Centre expansion | Post-pilot |

---

## Governance

- **Org owner:** `xime-bengaluru` GitHub organisation
- **Contact email:** girishv@xime.org
- **Repository visibility:** Private
- **Branch protection:** main branch — changes via pull request only (to be enabled)
- **Version control:** All changes committed with descriptive messages

---

*XIME Bengaluru · Integrated Centre · Pilot Phase · March 2026*  
*Private & Confidential — Not for external distribution*
