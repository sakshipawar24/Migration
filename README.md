# PBIP Metadata Viewer - Web UI

A modern web application to display and analyze Power BI Project (PBIP) metadata. This application provides a beautiful interface to view connection information, table metadata, and M queries from your PBIP files.

## Features

✨ **Modern UI Design**
- Clean, professional interface with gradient backgrounds
- Responsive design that works on all devices
- Interactive data table with search and filters

📊 **Data Visualization**
- Real-time statistics dashboard
- Connection type filtering
- Search across all metadata fields
- View M query previews with modal popup

🔄 **Dual View Modes**
- **Master View**: Shows complete metadata with Databricks to Fabric Lakehouse conversion
- **Simple View**: Shows basic metadata without conversion

🎨 **Rich Features**
- Color-coded badges for different connection types
- Hover effects and smooth animations
- Click to view full M queries
- Real-time filtering and searching

## Project Structure

```
Final/
├── app.py                          # Flask backend API
├── requirements.txt                # Python dependencies
├── metadata-ui/                    # React frontend
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── index.js
│       ├── index.css
│       ├── App.js
│       ├── App.css
│       └── components/
│           ├── MetadataTable.js    # Main data table
│           ├── StatsCards.js       # Statistics cards
│           └── Controls.js         # Search & filters
├── pbip_master_metadata.csv        # Main metadata file
└── pbip_metadata.csv               # Simple metadata file
```

## Installation & Setup

### Prerequisites
- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn

### Step 1: Install Python Dependencies

```bash
# Navigate to the project folder
cd "c:\Users\hp\Documents\Internship\Final"

# Install Python packages
pip install -r requirements.txt
```

### Step 2: Install React Dependencies

```bash
# Navigate to the React app folder
cd metadata-ui

# Install npm packages
npm install
```

## Running the Application

### Option 1: Development Mode (Recommended for Testing)

**Terminal 1 - Start Backend:**
```bash
# From the Final folder
python app.py
```
The Flask API will start on `http://localhost:5000`

**Terminal 2 - Start Frontend:**
```bash
# From the metadata-ui folder
cd metadata-ui
npm start
```
The React app will open automatically at `http://localhost:3000`

### Option 2: Production Mode

**Build the React app:**
```bash
cd metadata-ui
npm run build
```

**Start the server:**
```bash
cd ..
python app.py
```

Visit `http://localhost:5000` in your browser.

## Usage Guide

### 1. View Metadata
- The main table displays all metadata from your PBIP files
- Each row shows connection information, source types, and queries

### 2. Search Data
- Use the search box to filter across all columns
- Search is case-insensitive and searches all fields

### 3. Filter by Connection Type
- Use the dropdown to filter by specific connection types
- Shows only Fabric Lakehouse, Databricks, SQL Server, etc.

### 4. Switch Views
- **Master View**: Shows data after Databricks → Fabric conversion
- **Simple View**: Shows original metadata without conversion

### 5. View M Queries
- Click on any M Query preview (truncated text with "...")
- A modal will open showing the complete M query
- Click "Close" or outside the modal to dismiss

## API Endpoints

### GET /api/metadata
Returns all metadata from `pbip_master_metadata.csv`

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [...]
}
```

### GET /api/metadata/simple
Returns metadata from `pbip_metadata.csv`

### GET /api/stats
Returns statistics about the metadata

**Response:**
```json
{
  "success": true,
  "stats": {
    "total_tables": 5,
    "connection_types": {...},
    "before_sources": {...},
    "after_sources": {...}
  }
}
```

## Troubleshooting

### Backend won't start
- Make sure Flask is installed: `pip install flask flask-cors`
- Check if port 5000 is already in use
- Verify CSV files exist in the correct location

### Frontend won't start
- Delete `node_modules` and run `npm install` again
- Clear npm cache: `npm cache clean --force`
- Make sure you're in the `metadata-ui` folder

### Can't see data
- Ensure backend is running on port 5000
- Check browser console for errors (F12)
- Verify CSV files have data and correct format

### CORS errors
- Make sure `flask-cors` is installed
- Backend should allow CORS from localhost:3000

## Technology Stack

**Backend:**
- Flask (Python web framework)
- Flask-CORS (Cross-origin resource sharing)
- Python CSV module

**Frontend:**
- React 18
- Axios (HTTP client)
- Modern CSS with gradients and animations

## Screenshots & Features

### Statistics Dashboard
- Shows total tables, connection types, and source distributions
- Auto-updates based on filters

### Data Table
- Sortable columns
- Color-coded badges
- Responsive design
- Hover effects

### Search & Filter
- Real-time search
- Connection type filtering
- View mode toggle

## Future Enhancements

Potential features to add:
- Export filtered data to CSV/Excel
- More advanced filtering options
- Data visualization charts
- Edit metadata inline
- Batch operations
- User authentication
- Dark mode toggle

## Support

For issues or questions:
1. Check the troubleshooting section
2. Verify all dependencies are installed
3. Ensure CSV files are properly formatted
4. Check browser console for JavaScript errors
5. Check terminal for Python errors

## License

Internal project for Internship use.

---

**Created for:** Internship Final Project
**Task:** Task 4 - Show metadata in React/Angular web UI
**Date:** January 2026
