# Fly Right Co-Pilot

A responsive, offline-first Electronic Flight Bag (EFB) and cockpit assistant built for student pilots and general aviation operations.

Live Web Deployment: https://fly-right-copilot.vercel.app

---

## Overview

Fly Right Co-Pilot provides practical flight deck tools designed specifically for student pilot training workflows. The platform handles pre-flight planning, runway orientation, weather analysis, and in-flight phase checklists without requiring an active cellular connection at altitude.

All aircraft performance data, checklist catalogs, and aerodrome calculations run locally on the client to ensure reliability during simulated or actual loss of communication.

---

## Features

- Pre-Flight Briefing: Dynamic runway alignment and traffic pattern circuit plotting based on wind data and field elevations.
- Airspace Management: Distinct operational profiles for towered airspace (Class B/C/D) and non-towered CTAF environments.
- Offline Aircraft Checklists: Full phase-of-flight coverage for primary training airframes:
  - Cessna 152
  - Cessna 172S Skyhawk
  - Piper PA-28-161 Warrior II / Piper PA-28-181 Archer III
- Flight Deck HUD: Challenge-and-response checklist progression with integrated text-to-speech engine for audio readouts.
- ATC Radio Assistant: Quick-reference readback templates for ground, tower, approach, and CTAF radio calls.
- Ground School Review: Daily flashcard quiz engine covering FAA Private Pilot knowledge requirements with regulatory explanations.
- Mobile Layout: Sized and formatted for single-hand use across iOS Safari and Android viewports.

---

## Architecture and Tech Stack

### Frontend (flyright-web)
- Framework: Angular (Standalone Components, Signals)
- Language: TypeScript, HTML5, CSS3
- Mapping: Leaflet, OpenStreetMap
- Audio/Voice: Web Speech API (SpeechSynthesis)
- Deployment: Vercel

### Backend (flyright-api)
- Framework: Java / Spring Boot
- Database: PostgreSQL
- Architecture: REST API with local-first client caching fallback

---

## Project Structure

FlyRight-Copilot/
├── flyright-web/ Angular frontend application
│ ├── src/
│ │ ├── app/ Components, services, models
│ │ └── assets/ Offline databases and assets
│ └── angular.json
├── flyright-api/ Spring Boot backend service
│ ├── src/main/java/ API controllers, services, repositories
│ └── pom.xml
└── README.md
