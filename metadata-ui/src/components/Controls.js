import React from 'react';

function Controls({ 
  searchTerm, 
  setSearchTerm, 
  filterType, 
  setFilterType,
  connectionTypes 
}) {
  return (
    <div className="controls">
      <div className="search-box">
        <input
          type="text"
          placeholder="🔍 Search metadata..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <select
        className="filter-select"
        value={filterType}
        onChange={(e) => setFilterType(e.target.value)}
      >
        <option value="all">All Connection Types</option>
        {connectionTypes.map(type => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
    </div>
  );
}

export default Controls;
