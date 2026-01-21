# PBIP Metadata Viewer

Web application to display and analyze Power BI Project (PBIP) metadata with React UI.

## Features

- Interactive data table with search and filtering
- Statistics dashboard showing connection types and table counts
- View M query previews
- Responsive design

## Installation

### Prerequisites
- Python 3.8+
- Node.js 16+

### Setup

**Install Python dependencies:**
```bash
pip install -r requirements.txt
```

**Install React dependencies:**
```bash
cd metadata-ui
npm install
```

## Running

**Start Backend (Terminal 1):**
```bash
python app.py
```
Backend runs on `http://localhost:5000`

**Start Frontend (Terminal 2):**
```bash
cd metadata-ui
npm start
```
Frontend opens at `http://localhost:3000`

## Usage

- Search across all metadata fields
- Filter by connection type
- Click on M Query previews to view full queries

## Technology Stack

**Backend:** Flask, Flask-CORS
**Frontend:** React 18, Axios
