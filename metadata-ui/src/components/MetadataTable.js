import React, { useState } from 'react';

function MetadataTable({ data, type = 'before' }) {
  const [selectedQuery, setSelectedQuery] = useState(null);

  const getBadgeClass = (value, badgeType) => {
    if (badgeType === 'mode') {
      return value === 'DirectQuery' ? 'badge badge-directquery' : 'badge badge-import';
    }
    if (badgeType === 'source') {
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
          No metadata found. Make sure your CSV files are in the correct location.
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
              {type === 'before' ? (
                <>
                  <th>Before</th>
                  <th>After</th>
                  <th>Before Source</th>
                  <th>After Source</th>
                  <th>Connection Type (Before)</th>
                  <th>Connection Type (After)</th>
                  <th>Server (Before)</th>
                  <th>Server (After)</th>
                  <th>Database (Before)</th>
                  <th>Database (After)</th>
                  <th>M Query</th>
                </>
              ) : (
                <>
                  <th>Mode</th>
                  <th>Source</th>
                  <th>Connection Type</th>
                  <th>Server</th>
                  <th>Database</th>
                  <th>M Query</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index}>
                <td>{row.Type || '-'}</td>
                <td><strong>{row.Name || '-'}</strong></td>
                {type === 'before' ? (
                  <>
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
                    <td>{row.After_Connection_Type || row.Connection_Type || '-'}</td>
                    <td>{row.Server || '-'}</td>
                    <td>{row.After_Server || row.Server || '-'}</td>
                    <td>{row.Database_Name || '-'}</td>
                    <td>{row.After_Database || row.Database_Name || '-'}</td>
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
                  </>
                ) : (
                  <>
                    <td>
                      <span className={getBadgeClass(row.After, 'mode')}>
                        {row.After || '-'}
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
                  </>
                )}
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
