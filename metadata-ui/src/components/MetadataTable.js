import React, { useState } from 'react';

function MetadataTable({ data }) {
  const [selectedQuery, setSelectedQuery] = useState(null);

  const getBadgeClass = (value, type) => {
    if (type === 'mode') {
      return value === 'DirectQuery' ? 'badge badge-directquery' : 'badge badge-import';
    }
    if (type === 'source') {
      return value?.includes('Fabric') ? 'badge badge-fabric' : 'badge badge-databricks';
    }
    return 'badge';
  };

  const showQueryModal = (query, tableName) => {
    setSelectedQuery({ query, tableName });
  };

  const closeModal = () => {
    setSelectedQuery(null);
  };

  if (!data || data.length === 0) {
    return (
      <div className="table-container">
        <div className="no-data">
          📊 No metadata found. Make sure your CSV files are in the correct location.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="table-container">
        <table className="metadata-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Before</th>
              <th>After</th>
              <th>Before Source</th>
              <th>After Source</th>
              <th>Connection Type</th>
              <th>Server</th>
              <th>Database</th>
              <th>M Query</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                <td>{row.Type || '-'}</td>
                <td><strong>{row.Name || '-'}</strong></td>
                <td>
                  <span className={getBadgeClass(row.Before, 'mode')}>
                    {row.Before || '-'}
                  </span>
                </td>
                <td>
                  <span className={getBadgeClass(row.After, 'mode')}>
                    {row.After || '-'}
                  </span>
                </td>
                <td>
                  <span className={getBadgeClass(row.Before_Source, 'source')}>
                    {row.Before_Source || '-'}
                  </span>
                </td>
                <td>
                  <span className={getBadgeClass(row.After_Source, 'source')}>
                    {row.After_Source || '-'}
                  </span>
                </td>
                <td>{row.Connection_Type || '-'}</td>
                <td>{row.Server || '-'}</td>
                <td>{row.Database_Name || '-'}</td>
                <td>
                  {row.M_Query_Preview ? (
                    <div 
                      className="code-preview"
                      onClick={() => showQueryModal(row.M_Query_Preview, row.Name)}
                      title="Click to view full query"
                    >
                      {row.M_Query_Preview.substring(0, 50)}...
                    </div>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedQuery && (
        <div className="modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={closeModal}>✕ Close</button>
            <h2>M Query - {selectedQuery.tableName}</h2>
            <pre>{selectedQuery.query}</pre>
          </div>
        </div>
      )}
    </>
  );
}

export default MetadataTable;
