import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import MetadataTable from './components/MetadataTable';
import StatsCards from './components/StatsCards';
import Controls from './components/Controls';

function App() {
  const [metadata, setMetadata] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
  }, [metadata, searchTerm, filterType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [metadataResponse, statsResponse] = await Promise.all([
        axios.get('/api/metadata'),
        axios.get('/api/stats')
      ]);

      if (metadataResponse.data.success) {
        setMetadata(metadataResponse.data.data);
      } else {
        setError('Failed to load metadata');
      }

      if (statsResponse.data.success) {
        setStats(statsResponse.data.stats);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Error connecting to server. Make sure the backend is running on port 5000.');
      setLoading(false);
    }
  };

  const filterData = () => {
    let filtered = [...metadata];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        Object.values(item).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(item => 
        item.Connection_Type === filterType
      );
    }

    setFilteredData(filtered);
  };

  const getUniqueConnectionTypes = () => {
    const types = new Set(metadata.map(item => item.Connection_Type));
    return Array.from(types).filter(Boolean);
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading">
          <div>⏳ Loading metadata...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="App">
        <div className="header">
          <h1>🔍 PBIP Metadata Viewer</h1>
          <p>Power BI Project Metadata Analysis Tool</p>
        </div>
        <div className="error">
          <h3>❌ Error</h3>
          <p>{error}</p>
          <button onClick={fetchData} className="view-btn">
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="header">
        <h1>🔍 PBIP Metadata Viewer</h1>
        <p>Power BI Project Metadata Analysis Tool</p>
      </div>

      <StatsCards stats={stats} totalRecords={filteredData.length} />

      <Controls
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterType={filterType}
        setFilterType={setFilterType}
        connectionTypes={getUniqueConnectionTypes()}
      />

      <MetadataTable data={filteredData} />
    </div>
  );
}

export default App;
