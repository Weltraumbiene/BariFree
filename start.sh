#!/bin/bash

# immer im Ordner des Skripts starten
cd "$(dirname "$0")"

# Frontend starten (im Hintergrund, in eigenem Terminalfenster)
gnome-terminal -- bash -c "cd frontend && npm run dev; exec bash" &

# Backend starten (im Hintergrund, in eigenem Terminalfenster)
gnome-terminal -- bash -c "cd backend && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --workers 1; exec bash" &
