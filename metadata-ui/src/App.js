import React, { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import ProgressHeader from './components/ProgressHeader';
import AuthPage from './pages/AuthPage';
import OperationsPage from './pages/OperationsPage';
import ConnectionPage from './pages/ConnectionPage';
import MetadataPage from './pages/MetadataPage';
import * as XLSX from 'xlsx';

const USER_INPUTS_STORAGE_KEY = 'migration-ui-user-inputs-v1';
const WORKSPACE_ID_HISTORY_KEY = 'migration-ui-workspace-id-history-v1';
const METADATA_CACHE_STORAGE_KEY = 'migration-ui-metadata-cache-v1';
const MAX_WORKSPACE_HISTORY = 10;

const DEFAULT_COMPLEXITY_MATRIX = {
  connection: { low: '2', medium: '2+', high: '5+' },
  table: { low: '20', medium: '20+', high: '40+' },
  sqlQueries: { low: '10', medium: '10+', high: '25+' }
};

const COMPLEXITY_OBJECT_ROWS = [
  { key: 'connection', label: 'Connection' },
  { key: 'table', label: 'Table' },
  { key: 'sqlQueries', label: 'SQL Queries' }
];

const sanitizeComplexityMatrix = (candidate) => {
  if (!candidate || typeof candidate !== 'object') {
    return DEFAULT_COMPLEXITY_MATRIX;
  }

  const next = {};
  COMPLEXITY_OBJECT_ROWS.forEach(({ key }) => {
    const fallback = DEFAULT_COMPLEXITY_MATRIX[key];
    const value = candidate[key] || {};
    next[key] = {
      low: String(value.low ?? fallback.low),
      medium: String(value.medium ?? fallback.medium),
      high: String(value.high ?? fallback.high)
    };
  });

  return next;
};

function App() {
  // Azure AD credentials
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  // Power BI automation state
  const [sourceWorkspaceId, setSourceWorkspaceId] = useState('');
  const [targetWorkspaceId, setTargetWorkspaceId] = useState('');
  const [pbixFolder, setPbixFolder] = useState('D:\\PBIX');
  const [busyAction, setBusyAction] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState('info');
  const [runAllOutput, setRunAllOutput] = useState('');
  const [authStatus, setAuthStatus] = useState('idle');
  const [downloadStatus, setDownloadStatus] = useState('idle');
  const [convertStatus, setConvertStatus] = useState('idle');
  const [connectionStatus, setConnectionStatus] = useState('idle');
  const [sessionDownloadedCount, setSessionDownloadedCount] = useState(0);
  const [sessionConvertedCount, setSessionConvertedCount] = useState(0);

  const [autoServer, setAutoServer] = useState('');
  const [autoDatabase, setAutoDatabase] = useState('');
  const [autoTargetTechnology, setAutoTargetTechnology] = useState('Keep Same');
  const [autoWorkspaceId, setAutoWorkspaceId] = useState('');
  const [autoLakehouseId, setAutoLakehouseId] = useState('');

  const [publishStatus, setPublishStatus] = useState('idle');
  const [refreshStatus, setRefreshStatus] = useState('idle');
  const [publishNote, setPublishNote] = useState('');
  const [refreshNote, setRefreshNote] = useState('');

  const [selectedReport, setSelectedReport] = useState('');
  const [pbipReports, setPbipReports] = useState([]);
  const [pbixReports, setPbixReports] = useState([]);
  const [metadataBefore, setMetadataBefore] = useState(undefined);
  const [metadataAfter, setMetadataAfter] = useState(undefined);
  const [metadataCache, setMetadataCache] = useState({});
  const [changeConnectionReport, setChangeConnectionReport] = useState('');
  const [, setDownloadLog] = useState([]);
  const [, setConvertLog] = useState([]);
  const [activePage, setActivePage] = useState('setup');
  const [sourceWorkspaceHistory, setSourceWorkspaceHistory] = useState([]);
  const [targetWorkspaceHistory, setTargetWorkspaceHistory] = useState([]);
  const [fabricWorkspaceHistory, setFabricWorkspaceHistory] = useState([]);
  const [complexityMatrix, setComplexityMatrix] = useState(DEFAULT_COMPLEXITY_MATRIX);
  const [isStorageHydrated, setIsStorageHydrated] = useState(false);
  const downloadPollRef = useRef(null);
  const convertPollRef = useRef(null);

  const mergeWorkspaceHistoryWithCurrent = (historyList, currentValue) => {
    const current = (currentValue || '').trim();
    const baseHistory = Array.isArray(historyList) ? historyList : [];
    if (!current) {
      return baseHistory.slice(0, MAX_WORKSPACE_HISTORY);
    }
    const withoutDuplicate = baseHistory.filter((item) => item !== current);
    return [current, ...withoutDuplicate].slice(0, MAX_WORKSPACE_HISTORY);
  };

  useEffect(() => {
    try {
      let parsedValues = null;
      const savedValues = localStorage.getItem(USER_INPUTS_STORAGE_KEY);
      if (savedValues) {
        parsedValues = JSON.parse(savedValues);
        setSourceWorkspaceId(parsedValues.sourceWorkspaceId || '');
        setTargetWorkspaceId(parsedValues.targetWorkspaceId || '');
        setPbixFolder(parsedValues.pbixFolder || 'D:\\PBIX');
        setAutoServer(parsedValues.autoServer || '');
        setAutoDatabase(parsedValues.autoDatabase || '');
        setAutoTargetTechnology(parsedValues.autoTargetTechnology || 'Keep Same');
        setAutoWorkspaceId(parsedValues.autoWorkspaceId || '');
        setAutoLakehouseId(parsedValues.autoLakehouseId || '');
        setChangeConnectionReport(parsedValues.changeConnectionReport || '');
        setSelectedReport(parsedValues.selectedReport || '');
        setComplexityMatrix(sanitizeComplexityMatrix(parsedValues.complexityMatrix));
      }

      const savedWorkspaceHistory = localStorage.getItem(WORKSPACE_ID_HISTORY_KEY);
      if (savedWorkspaceHistory) {
        const parsedWorkspaceHistory = JSON.parse(savedWorkspaceHistory);
        setSourceWorkspaceHistory(
          mergeWorkspaceHistoryWithCurrent(
            parsedWorkspaceHistory.sourceWorkspaceHistory,
            parsedValues?.sourceWorkspaceId || ''
          )
        );
        setTargetWorkspaceHistory(
          mergeWorkspaceHistoryWithCurrent(
            parsedWorkspaceHistory.targetWorkspaceHistory,
            parsedValues?.targetWorkspaceId || ''
          )
        );
        setFabricWorkspaceHistory(
          mergeWorkspaceHistoryWithCurrent(
            parsedWorkspaceHistory.fabricWorkspaceHistory,
            parsedValues?.autoWorkspaceId || ''
          )
        );
      } else if (parsedValues) {
        if (parsedValues.sourceWorkspaceId) {
          setSourceWorkspaceHistory([parsedValues.sourceWorkspaceId]);
        }
        if (parsedValues.targetWorkspaceId) {
          setTargetWorkspaceHistory([parsedValues.targetWorkspaceId]);
        }
        if (parsedValues.autoWorkspaceId) {
          setFabricWorkspaceHistory([parsedValues.autoWorkspaceId]);
        }
      }

      const savedMetadataCache = localStorage.getItem(METADATA_CACHE_STORAGE_KEY);
      if (savedMetadataCache) {
        const parsedMetadataCache = JSON.parse(savedMetadataCache);
        if (parsedMetadataCache && typeof parsedMetadataCache === 'object') {
          setMetadataCache(parsedMetadataCache);
        }
      }
    } catch (err) {
      console.error('Failed to restore saved inputs:', err);
    } finally {
      setIsStorageHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isStorageHydrated) {
      return;
    }

    const valuesToStore = {
      sourceWorkspaceId,
      targetWorkspaceId,
      pbixFolder,
      autoServer,
      autoDatabase,
      autoTargetTechnology,
      autoWorkspaceId,
      autoLakehouseId,
      changeConnectionReport,
      selectedReport,
      complexityMatrix
    };

    localStorage.setItem(USER_INPUTS_STORAGE_KEY, JSON.stringify(valuesToStore));
  }, [
    isStorageHydrated,
    sourceWorkspaceId,
    targetWorkspaceId,
    pbixFolder,
    autoServer,
    autoDatabase,
    autoTargetTechnology,
    autoWorkspaceId,
    autoLakehouseId,
    changeConnectionReport,
    selectedReport,
    complexityMatrix
  ]);

  useEffect(() => {
    if (!isStorageHydrated) {
      return;
    }

    localStorage.setItem(
      WORKSPACE_ID_HISTORY_KEY,
      JSON.stringify({
        sourceWorkspaceHistory,
        targetWorkspaceHistory,
        fabricWorkspaceHistory
      })
    );
  }, [isStorageHydrated, sourceWorkspaceHistory, targetWorkspaceHistory, fabricWorkspaceHistory]);

  useEffect(() => {
    if (!isStorageHydrated) {
      return;
    }

    localStorage.setItem(METADATA_CACHE_STORAGE_KEY, JSON.stringify(metadataCache));
  }, [isStorageHydrated, metadataCache]);

  useEffect(() => {
    if (!selectedReport) {
      return;
    }

    const cachedMetadata = metadataCache[selectedReport];
    if (!cachedMetadata) {
      return;
    }

    setMetadataBefore(cachedMetadata.before || []);
    setMetadataAfter(cachedMetadata.after || []);
  }, [selectedReport, metadataCache]);

  const addWorkspaceIdToHistory = (workspaceId, setHistory) => {
    const trimmed = (workspaceId || '').trim();
    if (!trimmed) {
      return;
    }

    setHistory((previous) => {
      const withoutDuplicate = previous.filter((item) => item !== trimmed);
      return [trimmed, ...withoutDuplicate].slice(0, MAX_WORKSPACE_HISTORY);
    });
  };

  const handleSourceWorkspaceBlur = () => {
    addWorkspaceIdToHistory(sourceWorkspaceId, setSourceWorkspaceHistory);
  };

  const handleTargetWorkspaceBlur = () => {
    addWorkspaceIdToHistory(targetWorkspaceId, setTargetWorkspaceHistory);
  };

  const handleFabricWorkspaceBlur = () => {
    addWorkspaceIdToHistory(autoWorkspaceId, setFabricWorkspaceHistory);
  };

  const getPbipFolderPath = useCallback((folderPath) => {
    if (folderPath && folderPath.includes('PBIX')) {
      return folderPath.replace('PBIX', 'PBIP');
    }
    return 'D:\\PBIP';
  }, []);

  const fetchPbipReports = useCallback(async () => {
    try {
      const pbipFolder = getPbipFolderPath(pbixFolder);
      const response = await fetch(
        `http://localhost:5000/api/pbi/list-reports?pbipFolder=${encodeURIComponent(pbipFolder)}`
      );
      const data = await response.json();
      if (data.success && data.reports) {
        setPbipReports(data.reports);
        return data.reports;
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
    return [];
  }, [getPbipFolderPath, pbixFolder]);

  const fetchPbixReports = useCallback(async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/pbi/list-pbix?pbixFolder=${encodeURIComponent(pbixFolder || 'D:\\PBIX')}`
      );
      const data = await response.json();
      if (data.success && data.reports) {
        setPbixReports(data.reports);
        return data.reports;
      }
    } catch (err) {
      console.error('Failed to fetch PBIX reports:', err);
    }
    return [];
  }, [pbixFolder]);

  const appendLogEntries = (setter, entries) => {
    if (!entries || entries.length === 0) {
      return;
    }
    setter((prev) => {
      const next = [...prev];
      entries.forEach((entry) => {
        if (!next.includes(entry)) {
          next.push(entry);
        }
      });
      return next;
    });
  };

  const pollForNewFiles = (pollRef, fetchFn, seenNames, logLabel, setLog) => {
    const poll = async () => {
      const reports = await fetchFn();
      const names = getReportNames(reports);
      const newEntries = names
        .filter((name) => !seenNames.has(name))
        .map((name) => `${name} file ${logLabel}`);

      newEntries.forEach((entry) => {
        const fileName = entry.replace(` file ${logLabel}`, '');
        seenNames.add(fileName);
      });

      appendLogEntries(setLog, newEntries);
    };

    poll();
    pollRef.current = setInterval(poll, 3000);
  };

  const stopPolling = (pollRef) => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const getReportNames = (reports) => {
    return (reports || [])
      .map((report) => report.displayName || report.name)
      .filter(Boolean);
  };

  useEffect(() => {
    fetchPbipReports();
    fetchPbixReports();
  }, [fetchPbipReports, fetchPbixReports, pbixFolder]);

  const fetchReportMetadata = async (reportName, preserveBefore = true) => {
    if (!reportName) {
      return;
    }

    setBusyAction('fetch-metadata');
    try {
      const pbipPath = getPbipFolderPath(pbixFolder);
      const response = await fetch('http://localhost:5000/api/pbi/extract-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportName: reportName,
          pbipFolder: pbipPath
        })
      });
      const data = await response.json();
      if (data.success) {
        const beforeData = data.before || [];
        const afterData = data.after || [];
        setMetadataCache((prev) => {
          const existing = prev[reportName] || {};
          const nextBefore = preserveBefore && existing.before && existing.before.length > 0
            ? existing.before
            : beforeData;
          return {
            ...prev,
            [reportName]: { before: nextBefore, after: afterData }
          };
        });
        setMetadataBefore((prev) => {
          if (preserveBefore && prev && prev.length > 0) {
            return prev;
          }
          return beforeData;
        });
        setMetadataAfter(afterData);
        if ((data.before || []).length === 0 && (data.after || []).length === 0) {
          showStatus(`No metadata found for "${reportName}". Try running Full Flow first.`, 'info');
        }
      } else {
        showStatus(data.error || 'Failed to load metadata', 'error');
      }
    } catch (err) {
      console.error('Failed to fetch report metadata:', err);
      showStatus(`Failed to load metadata: ${err.message}`, 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const handleReportSelection = (reportName) => {
    setSelectedReport(reportName);
    if (!reportName) {
      setMetadataBefore(undefined);
      setMetadataAfter(undefined);
      return;
    }
    const cached = metadataCache[reportName];
    if (cached) {
      setMetadataBefore(cached.before || []);
      setMetadataAfter(cached.after || []);
      return;
    }
    fetchReportMetadata(reportName);
  };

  const extractBeforeMetadata = async () => {
    const reportName = selectedReport || changeConnectionReport;
    if (!reportName) {
      showStatus('Select a report to extract metadata.', 'error');
      return;
    }

    if (!selectedReport && changeConnectionReport) {
      setSelectedReport(reportName);
    }

    setBusyAction('fetch-metadata');
    try {
      const pbipPath = getPbipFolderPath(pbixFolder);
      const response = await fetch('http://localhost:5000/api/pbi/extract-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportName: reportName,
          pbipFolder: pbipPath
        })
      });
      const data = await response.json();
      if (data.success) {
        const beforeData = data.before || [];
        setMetadataCache((prev) => ({
          ...prev,
          [reportName]: { before: beforeData, after: [] }
        }));
        setMetadataBefore(beforeData);
        setMetadataAfter([]);
        if (beforeData.length === 0) {
          showStatus(`No metadata found for "${reportName}".`, 'info');
        }
      } else {
        showStatus(data.error || 'Failed to load metadata', 'error');
      }
    } catch (err) {
      showStatus(`Failed to load metadata: ${err.message}`, 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const showStatus = (message, type = 'info') => {
    setStatusMessage(message);
    setStatusType(type);
  };

  const saveAuthConfig = async () => {
    if (!tenantId || !clientId || !clientSecret) {
      showStatus('Enter tenant ID, client ID, and client secret.', 'error');
      return;
    }

    setAuthStatus('running');
    setBusyAction('auth-save');
    try {
      const response = await fetch('http://localhost:5000/api/pbi/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          clientId,
          clientSecret,
          sourceWorkspaceId: sourceWorkspaceId || undefined,
          targetWorkspaceId: targetWorkspaceId || undefined,
          pbixFolder: pbixFolder || undefined
        })
      });
      const data = await response.json();
      if (data.success) {
        showStatus('Settings saved for this session.', 'success');
        setAuthStatus('success');
      } else {
        showStatus(data.error || 'Failed to save credentials.', 'error');
        setAuthStatus('error');
      }
    } catch (err) {
      showStatus(`Failed to save credentials: ${err.message}`, 'error');
      setAuthStatus('error');
    } finally {
      setBusyAction(null);
    }
  };

  const downloadPbix = async () => {
    if (!sourceWorkspaceId) {
      showStatus('Enter a source workspace ID.', 'error');
      return;
    }

    const previousNames = new Set(getReportNames(pbixReports));
    pollForNewFiles(downloadPollRef, fetchPbixReports, previousNames, 'downloaded', setDownloadLog);
    setDownloadStatus('running');
    setBusyAction('download');
    try {
      const response = await fetch('http://localhost:5000/api/pbi/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceWorkspaceId,
          targetWorkspaceId: targetWorkspaceId || undefined,
          pbixFolder,
          tenantId,
          clientId,
          clientSecret
        })
      });
      const data = await response.json();
      if (data.success) {
        const summary = data.downloadSummary;
        if (summary && summary.downloaded === 0 && summary.total > 0) {
          showStatus('All files are already downloaded.', 'info');
        } else if (summary && summary.downloaded > 0 && summary.skipped > 0) {
          showStatus(`Downloaded ${summary.downloaded} remaining files. ${summary.skipped} already existed.`, 'success');
        } else {
          showStatus(data.message || 'PBIX download completed.', 'success');
        }
        const reports = await fetchPbixReports();
        const nextNames = getReportNames(reports);
        const newEntries = nextNames
          .filter((name) => !previousNames.has(name))
          .map((name) => `${name} file downloaded`);
        appendLogEntries(setDownloadLog, newEntries);
        const parsedDownloaded = Number.parseInt(summary?.downloaded, 10);
        const downloadedThisRun = Number.isNaN(parsedDownloaded) ? newEntries.length : parsedDownloaded;
        setSessionDownloadedCount((prev) => prev + Math.max(downloadedThisRun, 0));
        setDownloadStatus('success');
      } else {
        showStatus(data.error || 'PBIX download failed.', 'error');
        setDownloadStatus('error');
      }
    } catch (err) {
      showStatus(`PBIX download failed: ${err.message}`, 'error');
      setDownloadStatus('error');
    } finally {
      stopPolling(downloadPollRef);
      setBusyAction(null);
    }
  };

  const convertPbix = async () => {
    const previousNames = new Set(getReportNames(pbipReports));
    pollForNewFiles(convertPollRef, fetchPbipReports, previousNames, 'converted', setConvertLog);
    setConvertStatus('running');
    setBusyAction('convert');
    try {
      const response = await fetch('http://localhost:5000/api/pbi/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceWorkspaceId: sourceWorkspaceId || undefined,
          targetWorkspaceId: targetWorkspaceId || undefined,
          pbixFolder,
          tenantId,
          clientId,
          clientSecret
        })
      });
      const data = await response.json();
      if (data.success) {
        showStatus('Convert step completed.', 'success');
        const reports = await fetchPbipReports();
        const nextNames = getReportNames(reports);
        const newEntries = nextNames
          .filter((name) => !previousNames.has(name))
          .map((name) => `${name} file converted`);
        appendLogEntries(setConvertLog, newEntries);
        setSessionConvertedCount((prev) => prev + newEntries.length);
        setConvertStatus('success');
        fetchPbixReports();
      } else {
        showStatus(data.error || 'Convert step failed.', 'error');
        setConvertStatus('error');
      }
    } catch (err) {
      showStatus(`Convert step failed: ${err.message}`, 'error');
      setConvertStatus('error');
    } finally {
      stopPolling(convertPollRef);
      setBusyAction(null);
    }
  };

  const publishPbix = async () => {
    setPublishStatus('running');
    setPublishNote('Publishing in progress.');
    setBusyAction('publish');
    try {
      const response = await fetch('http://localhost:5000/api/pbi/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceWorkspaceId: sourceWorkspaceId || undefined,
          targetWorkspaceId: targetWorkspaceId || undefined,
          pbixFolder,
          tenantId,
          clientId,
          clientSecret
        })
      });
      const data = await response.json();
      if (data.success) {
        showStatus('Publish completed.', 'success');
        setPublishStatus('success');
        setPublishNote(data.message || 'Publish completed.');
      } else {
        showStatus(data.error || 'Publish failed.', 'error');
        setPublishStatus('error');
        setPublishNote(data.error || 'Publish failed.');
      }
    } catch (err) {
      showStatus(`Publish failed: ${err.message}`, 'error');
      setPublishStatus('error');
      setPublishNote(err.message);
    } finally {
      setBusyAction(null);
    }
  };

  const refreshDataset = async () => {
    if (!targetWorkspaceId) {
      showStatus('Enter target workspace ID.', 'error');
      return;
    }

    setRefreshStatus('running');
    setRefreshNote('Refreshing in progress.');
    setBusyAction('refresh');
    try {
      const response = await fetch('http://localhost:5000/api/pbi/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceWorkspaceId: sourceWorkspaceId || undefined,
          targetWorkspaceId,
          pbixFolder,
          tenantId,
          clientId,
          clientSecret
        })
      });
      const data = await response.json();
      if (data.success) {
        showStatus('Refresh triggered.', 'success');
        setRefreshStatus('success');
        setRefreshNote(data.message || 'Refresh triggered.');
      } else {
        showStatus(data.error || 'Refresh failed.', 'error');
        setRefreshStatus('error');
        setRefreshNote(data.error || 'Refresh failed.');
      }
    } catch (err) {
      showStatus(`Refresh failed: ${err.message}`, 'error');
      setRefreshStatus('error');
      setRefreshNote(err.message);
    } finally {
      setBusyAction(null);
    }
  };

const changeConnection = async (reportName = null) => {
     const report = reportName || changeConnectionReport;
     if (!report) {
       showStatus('Select a report for Change Connection.', 'error');
       return;
     }
     if (!autoServer || !autoDatabase) {
       showStatus('Enter a new server and database.', 'error');
       return;
     }

     const pbipFolderPath = getPbipFolderPath(pbixFolder);
     const pbipPath = `${pbipFolderPath}\\${report}`;
     setBusyAction(reportName ? 'change-connection-all' : 'change-connection');
     if (!reportName) {
       setConnectionStatus('running');
     }
     if (!reportName) setRunAllOutput('');
     try {
       const response = await fetch('http://localhost:5000/api/change-connection', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           pbipPath,
           server: autoServer,
           database: autoDatabase,
           targetTechnology: autoTargetTechnology || undefined,
           workspaceId: autoWorkspaceId || undefined,
           lakehouseId: autoLakehouseId || undefined
         })
       });
       const data = await response.json();
       if (data.success) {
         const beforeData = data.before || [];
         const afterData = data.after || [];
         const existingBefore = (metadataCache[report] && metadataCache[report].before) || [];
         const nextBefore = existingBefore.length > 0 ? existingBefore : beforeData;
         setMetadataCache((prev) => ({
           ...prev,
           [report]: { before: nextBefore, after: afterData }
         }));
         if (selectedReport && selectedReport === report) {
           setMetadataBefore(nextBefore);
           setMetadataAfter(afterData);
         }
         if (!selectedReport && report === changeConnectionReport) {
           setSelectedReport(report);
           setMetadataBefore(nextBefore);
           setMetadataAfter(afterData);
         }
         if (!reportName) {
           showStatus('Connection updated.', 'success');
           setConnectionStatus('success');
           if (data.output) {
             setRunAllOutput(data.output);
           }
         }
         fetchPbipReports();
       } else if (!data.success) {
         if (!reportName) {
           showStatus(data.error || 'Change connection failed.', 'error');
           setConnectionStatus('error');
           if (data.output) {
             setRunAllOutput(data.output);
           }
         }
         return false;
       }
       return true;
     } catch (err) {
       if (!reportName) {
         showStatus(`Change connection failed: ${err.message}`, 'error');
         setConnectionStatus('error');
       }
       return false;
     } finally {
       if (!reportName) {
         setBusyAction(null);
       }
     }
   };

  const changeConnectionForAll = async () => {
    if (!autoServer || !autoDatabase) {
      showStatus('Enter a new server and database.', 'error');
      return;
    }

    const reportsToUpdate = changeConnectionOptions;
    if (reportsToUpdate.length === 0) {
      showStatus('No reports found to update.', 'error');
      return;
    }

    setBusyAction('change-connection-all');
    setConnectionStatus('running');
    setRunAllOutput('');
    try {
      let successCount = 0;
      let errorMessages = [];

      for (const report of reportsToUpdate) {
        const success = await changeConnection(report);
        if (success) {
          successCount++;
        } else {
          errorMessages.push(report);
        }
      }

      fetchPbipReports();
      if (errorMessages.length === 0) {
        showStatus(`Connection updated for all ${successCount} reports.`, 'success');
        setConnectionStatus('success');
      } else {
        showStatus(`Updated ${successCount}/${reportsToUpdate.length} reports. Failed: ${errorMessages.join(', ')}`, 'error');
        setConnectionStatus('error');
      }
    } catch (err) {
      showStatus(`Batch change connection failed: ${err.message}`, 'error');
      setConnectionStatus('error');
    } finally {
      setBusyAction(null);
    }
  };

  const runFullFlow = async () => {
    if (!sourceWorkspaceId || !targetWorkspaceId) {
      showStatus('Enter source and target workspace IDs.', 'error');
      return;
    }

    setBusyAction('runall');
    setRunAllOutput('');
    try {
      const response = await fetch('http://localhost:5000/api/pbi/run-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceWorkspaceId,
          targetWorkspaceId,
          pbixFolder,
          server: autoServer || undefined,
          database: autoDatabase || undefined,
          targetTechnology: autoTargetTechnology || undefined,
          workspaceId: autoWorkspaceId || undefined,
          lakehouseId: autoLakehouseId || undefined,
          tenantId,
          clientId,
          clientSecret
        })
      });
      const data = await response.json();
      if (data.success) {
        showStatus('All steps completed.', 'success');
        setRunAllOutput(data.output || '');
        fetchPbipReports();
        fetchPbixReports();
      } else {
        showStatus(data.error || 'Full migration flow failed.', 'error');
        setRunAllOutput(data.output || '');
      }
    } catch (err) {
      showStatus(`Full migration flow failed: ${err.message}`, 'error');
    } finally {
      setBusyAction(null);
    }
  };

  const changeConnectionOptions = React.useMemo(() => {
    return pbipReports.map((report) => report.name).filter(Boolean);
  }, [pbipReports]);

  const downloadedFileNames = React.useMemo(() => {
    const names = pbixReports.map((report) => report.displayName || report.name).filter(Boolean);
    return Array.from(new Set(names));
  }, [pbixReports]);

  const convertedFileNames = React.useMemo(() => {
    const names = pbipReports.map((report) => report.displayName || report.name).filter(Boolean);
    return Array.from(new Set(names));
  }, [pbipReports]);

  const parseComplexityThreshold = (value) => {
    const match = String(value || '').match(/\d+/);
    if (!match) {
      return null;
    }
    const parsed = Number.parseInt(match[0], 10);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const extractMetricValue = (row, keys) => {
    for (const key of keys) {
      const value = row?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        return value;
      }
    }
    return '';
  };

  const toMetricTableName = (rawValue = '') => {
    const text = String(rawValue || '').trim();
    if (!text) {
      return '';
    }
    if (!text.includes('::')) {
      return text;
    }
    const segments = text.split('::').filter(Boolean);
    return segments.length > 0 ? segments[segments.length - 1] : text;
  };

  const computeReportMetrics = useCallback((reportName) => {
    if (!reportName) {
      return {
        tableCount: 0,
        connectionCount: 0,
        sqlQueryCount: 0
      };
    }

    const exactMatch = metadataCache[reportName];
    const fallbackEntry = exactMatch
      ? null
      : Object.entries(metadataCache).find(([key]) => key.toLowerCase() === String(reportName).toLowerCase());
    const cacheEntry = exactMatch || fallbackEntry?.[1] || {};

    const beforeRows = Array.isArray(cacheEntry.before) ? cacheEntry.before : [];
    const afterRows = Array.isArray(cacheEntry.after) ? cacheEntry.after : [];
    const activeRows = afterRows.length > 0 ? afterRows : beforeRows;

    const tableNames = new Set();
    const uniqueConnections = new Set(); // Count unique server:database combinations
    const connectionSignatures = new Set(); // Full signatures for detailed tracking
    const querySignatures = new Set();

    activeRows.forEach((row) => {
      const tableName = toMetricTableName(
        extractMetricValue(row, ['name', 'Name', 'tableName', 'table', 'Table'])
      );
      if (tableName) {
        tableNames.add(tableName);
      }

      const connectionType = String(
        extractMetricValue(row, ['connectionType', 'Connection_Type', 'After_Connection_Type'])
      ).trim();
      const source = String(
        extractMetricValue(row, ['source', 'After_Source', 'Before_Source'])
      ).trim();
      const server = String(
        extractMetricValue(row, ['server', 'Server', 'After_Server'])
      ).trim();
      const database = String(
        extractMetricValue(row, ['database', 'Database', 'databaseName', 'Database_Name', 'After_Database'])
      ).trim();

      if (connectionType || source || server || database) {
        // Full signature for detailed tracking
        connectionSignatures.add(
          [connectionType || 'unknown', source || 'unknown', server || '-', database || '-'].join('|')
        );
        // Primary connection count: unique server:database combinations
        if (server && database) {
          uniqueConnections.add(`${server}:${database}`);
        } else if (source) {
          uniqueConnections.add(source);
        } else if (connectionType) {
          uniqueConnections.add(connectionType);
        }
      }

      const queryText = String(extractMetricValue(row, ['mQuery', 'M_Query_Preview', 'query'])).trim();
      if (queryText) {
        querySignatures.add(queryText);
      }
    });

    // Use unique connections count, fallback to signatures if no unique connections found
    const finalConnectionCount = uniqueConnections.size > 0 ? uniqueConnections.size : connectionSignatures.size;

    return {
      tableCount: tableNames.size,
      connectionCount: finalConnectionCount,
      sqlQueryCount: querySignatures.size
    };
  }, [metadataCache]);

  const getComplexityLabel = useCallback((metrics) => {
    const evaluateObject = (matrixKey, count) => {
      const matrixRow = complexityMatrix[matrixKey] || DEFAULT_COMPLEXITY_MATRIX[matrixKey];
      const lowMax = parseComplexityThreshold(matrixRow.low);
      const highMin = parseComplexityThreshold(matrixRow.high);

      if (lowMax === null || highMin === null || highMin <= lowMax) {
        return 'invalid';
      }

      if (count <= lowMax) {
        return 'low';
      }
      if (count >= highMin) {
        return 'high';
      }
      return 'medium';
    };

    const levels = [
      evaluateObject('connection', metrics.connectionCount),
      evaluateObject('table', metrics.tableCount),
      evaluateObject('sqlQueries', metrics.sqlQueryCount)
    ];

    if (levels.includes('invalid')) {
      return 'Check matrix';
    }
    if (levels.includes('high')) {
      return 'High';
    }
    if (levels.includes('medium')) {
      return 'Medium';
    }
    return 'Low';
  }, [complexityMatrix]);

  const reportStatusRows = React.useMemo(() => {
    const toStatusLabel = (status) => {
      if (status === 'running') {
        return 'Running';
      }
      if (status === 'success') {
        return 'Success';
      }
      if (status === 'error') {
        return 'Error';
      }
      return 'Not started';
    };

    const reportMap = new Map();

    pbixReports.forEach((report) => {
      const reportKey = report.name || report.displayName;
      if (!reportKey) {
        return;
      }
      const existing = reportMap.get(reportKey) || {
        reportName: report.name || report.displayName,
        displayName: report.displayName || report.name || reportKey,
        downloaded: false,
        converted: false,
        metadataBeforeCount: 0,
        metadataAfterCount: 0,
        workflowStatus: 'Not started'
      };
      existing.downloaded = true;
      reportMap.set(reportKey, existing);
    });

    pbipReports.forEach((report) => {
      const reportKey = report.name || report.displayName;
      if (!reportKey) {
        return;
      }
      const existing = reportMap.get(reportKey) || {
        reportName: report.name || report.displayName,
        displayName: report.displayName || report.name || reportKey,
        downloaded: false,
        converted: false,
        metadataBeforeCount: 0,
        metadataAfterCount: 0,
        workflowStatus: 'Not started'
      };
      existing.converted = true;
      reportMap.set(reportKey, existing);
    });

    Object.entries(metadataCache).forEach(([reportName, metadataValue]) => {
      const reportKey = reportName;
      const existing = reportMap.get(reportKey) || {
        reportName,
        displayName: reportName,
        downloaded: false,
        converted: false,
        metadataBeforeCount: 0,
        metadataAfterCount: 0,
        workflowStatus: 'Not started'
      };
      const beforeCount = Array.isArray(metadataValue?.before) ? metadataValue.before.length : 0;
      const afterCount = Array.isArray(metadataValue?.after) ? metadataValue.after.length : 0;
      existing.metadataBeforeCount = beforeCount;
      existing.metadataAfterCount = afterCount;
      reportMap.set(reportKey, existing);
    });

    const rows = Array.from(reportMap.values()).map((reportRow) => {
      let workflowStatus = 'Detected';
      if (reportRow.metadataAfterCount > 0) {
        workflowStatus = 'Connection updated';
      } else if (reportRow.metadataBeforeCount > 0) {
        workflowStatus = 'Metadata extracted';
      } else if (reportRow.converted) {
        workflowStatus = 'Converted';
      } else if (reportRow.downloaded) {
        workflowStatus = 'Downloaded';
      }

      const metrics = computeReportMetrics(reportRow.reportName || reportRow.displayName);
      const complexity = getComplexityLabel(metrics);

      const validationIssues = [];
      const shouldValidate = reportRow.converted || reportRow.metadataBeforeCount > 0 || reportRow.metadataAfterCount > 0;
      if (shouldValidate && metrics.tableCount === 0) {
        validationIssues.push('No table metadata');
      }
      if (reportRow.metadataBeforeCount > 0 && metrics.connectionCount === 0) {
        validationIssues.push('No connection details parsed');
      }

      const validationStatus = validationIssues.length === 0 ? 'Validated' : 'Needs validation';
      const comments = validationIssues.length === 0
        ? `${workflowStatus} | ${complexity} complexity`
        : `${workflowStatus} | ${complexity} complexity | Validate: ${validationIssues.join('; ')}`;

      return {
        ...reportRow,
        tableCount: metrics.tableCount,
        connectionCount: metrics.connectionCount,
        sqlQueryCount: metrics.sqlQueryCount,
        complexity,
        validationStatus,
        comments,
        workflowStatus,
        publishStatus: toStatusLabel(publishStatus),
        refreshStatus: toStatusLabel(refreshStatus)
      };
    });

    return rows.sort((left, right) => left.displayName.localeCompare(right.displayName));
  }, [computeReportMetrics, getComplexityLabel, metadataCache, pbipReports, pbixReports, publishStatus, refreshStatus]);

  const formatStatusLabel = (status) => {
    if (status === 'running') {
      return 'Running';
    }
    if (status === 'success') {
      return 'Success';
    }
    if (status === 'error') {
      return 'Error';
    }
    return 'Not started';
  };

  const getTableNameFromMetadata = (value = '') => {
    if (!value || !value.includes('::')) {
      return value || '';
    }
    const parts = value.split('::').filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : value;
  };

  const getSheetSafeName = (name, index) => {
    const fallback = `Report_${index + 1}`;
    const raw = (name || fallback).replace(/[\\/?*[\]:]/g, ' ').trim();
    const normalized = raw || fallback;
    return normalized.length > 31 ? normalized.slice(0, 31) : normalized;
  };

  const findMetadataForReport = (reportName, section) => {
    const candidates = [
      metadataCache[reportName]?.[section],
      metadataCache[reportName?.toLowerCase()]?.[section],
      metadataCache[reportName?.toUpperCase()]?.[section]
    ].filter(Array.isArray);

    if (candidates.length > 0) {
      return candidates[0];
    }

    const cacheEntries = Object.entries(metadataCache);
    const matched = cacheEntries.find(([key, value]) => {
      if (!value || !Array.isArray(value[section])) {
        return false;
      }
      if (key === reportName) {
        return true;
      }
      return key.toLowerCase() === (reportName || '').toLowerCase();
    });

    if (matched && Array.isArray(matched[1]?.[section])) {
      return matched[1][section];
    }

    return [];
  };

  const buildCombinedMetadataRows = (reportName) => {
    const beforeRows = findMetadataForReport(reportName, 'before') || [];
    const afterRows = findMetadataForReport(reportName, 'after') || [];

    const beforeMap = new Map();
    beforeRows.forEach((row) => {
      const tableKey = getTableNameFromMetadata(row.name || row.tableName || row.table || '');
      if (tableKey) {
        beforeMap.set(tableKey, row);
      }
    });

    const afterMap = new Map();
    afterRows.forEach((row) => {
      const tableKey = getTableNameFromMetadata(row.name || row.tableName || row.table || '');
      if (tableKey) {
        afterMap.set(tableKey, row);
      }
    });

    const tableNames = Array.from(new Set([...beforeMap.keys(), ...afterMap.keys()]));

    return tableNames.map((tableName) => {
      const before = beforeMap.get(tableName) || {};
      const after = afterMap.get(tableName) || {};

      return {
        Connection: after.connectionType || before.connectionType || after.source || before.source || '',
        Table: tableName,
        'Before Mode': before.mode || '',
        'Before Source': before.source || '',
        'Before Connection Type': before.connectionType || '',
        'Before Server': before.server || '',
        'Before Database': before.database || '',
        'After Mode': after.mode || '',
        'After Source': after.source || '',
        'After Connection Type': after.connectionType || '',
        'After Server': after.server || '',
        'After Database': after.database || ''
      };
    });
  };

  const downloadSummaryParameters = () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const currentTime = now.toLocaleTimeString();
    const generatedAtUtc = now.toISOString();

    const downloadedCount = reportStatusRows.filter((row) => row.downloaded).length;
    const convertedCount = reportStatusRows.filter((row) => row.converted).length;
    const metadataExtractedCount = reportStatusRows.filter((row) => row.metadataBeforeCount > 0).length;
    const connectionUpdatedCount = reportStatusRows.filter((row) => row.metadataAfterCount > 0).length;
    const readyForPublishCount = reportStatusRows.filter((row) => row.converted && row.metadataAfterCount > 0).length;
    const publishSuccessCount = reportStatusRows.filter((row) => row.publishStatus === 'Success').length;
    const refreshSuccessCount = reportStatusRows.filter((row) => row.refreshStatus === 'Success').length;

    const summaryRows = [
      { Field: 'Title', Value: 'Migration Summary' },
      { Field: 'Date', Value: today },
      { Field: 'Time', Value: currentTime },
      { Field: 'Time Taken', Value: '-' },
      { Field: 'Number of Reports', Value: reportStatusRows.length },
      { Field: 'Generated At (UTC)', Value: generatedAtUtc },
      { Field: 'Run Status Banner', Value: statusMessage || '-' },
      { Field: 'Run Status Type', Value: statusType || 'info' }
    ];

    const configRows = [
      { Field: 'Tenant ID', Value: tenantId || '' },
      { Field: 'Client ID', Value: clientId || '' },
      { Field: 'Auth Configured', Value: authConfigured ? 'Yes' : 'No' },
      { Field: 'Source Workspace', Value: sourceWorkspaceId || '' },
      { Field: 'Target Workspace', Value: targetWorkspaceId || '' },
      { Field: 'PBIX Folder', Value: pbixFolder || '' },
      { Field: 'Target Technology', Value: autoTargetTechnology || '' },
      { Field: 'Server', Value: autoServer || '' },
      { Field: 'Database', Value: autoDatabase || '' },
      { Field: 'Fabric Workspace ID', Value: autoWorkspaceId || '' },
      { Field: 'Fabric Lakehouse ID', Value: autoLakehouseId || '' },
      { Field: 'Complexity - Connection (Low/Medium/High)', Value: `${complexityMatrix.connection.low} | ${complexityMatrix.connection.medium} | ${complexityMatrix.connection.high}` },
      { Field: 'Complexity - Table (Low/Medium/High)', Value: `${complexityMatrix.table.low} | ${complexityMatrix.table.medium} | ${complexityMatrix.table.high}` },
      { Field: 'Complexity - SQL Queries (Low/Medium/High)', Value: `${complexityMatrix.sqlQueries.low} | ${complexityMatrix.sqlQueries.medium} | ${complexityMatrix.sqlQueries.high}` },
      { Field: 'Selected Report', Value: selectedReport || '-' },
      { Field: 'Connection Report', Value: changeConnectionReport || '-' },
      { Field: 'Generated Time', Value: currentTime }
    ];

    const operationalRows = [
      { Field: 'Reports Downloaded', Value: downloadedCount },
      { Field: 'Reports Converted to PBIP', Value: convertedCount },
      { Field: 'Metadata Extracted', Value: metadataExtractedCount },
      { Field: 'Connection Updated', Value: connectionUpdatedCount },
      { Field: 'Ready for Publish', Value: readyForPublishCount },
      { Field: 'Publish Status', Value: formatStatusLabel(publishStatus) },
      { Field: 'Publish Message', Value: publishNote || '-' },
      { Field: 'Refresh Status', Value: formatStatusLabel(refreshStatus) },
      { Field: 'Refresh Message', Value: refreshNote || '-' },
      { Field: 'Reports Published (Success)', Value: publishSuccessCount },
      { Field: 'Reports Refreshed (Success)', Value: refreshSuccessCount }
    ];

    const reportSummaryRows = reportStatusRows.map((row) => ({
      'Report Name': row.displayName || row.reportName,
      Download: row.downloaded ? 'Success' : 'Pending',
      'Convert to PBIP': row.converted ? 'Success' : 'Pending',
      'Connection Changes': row.metadataAfterCount > 0 ? 'Success' : 'Pending',
      'Publish Status': row.publishStatus,
      'Refresh Status': row.refreshStatus,
      Connections: row.connectionCount,
      Tables: row.tableCount,
      'SQL Queries': row.sqlQueryCount,
      Complexity: row.complexity,
      Validation: row.validationStatus,
      'Before Metadata Count': row.metadataBeforeCount,
      'After Metadata Count': row.metadataAfterCount,
      Comments: row.comments
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(configRows), 'Configuration');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(operationalRows), 'Operational');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(reportSummaryRows), 'Report Summary');

    const fileName = `migration-summary-${today}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const downloadReportStatus = () => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    const summarySheetRows = reportStatusRows.map((row) => ({
      'Report Name': row.displayName || row.reportName,
      Download: row.downloaded ? 'Success' : 'Pending',
      'Convert to PBIP': row.converted ? 'Success' : 'Pending',
      'Connection Changes': row.metadataAfterCount > 0 ? 'Success' : 'Pending',
      'Publish Status': row.publishStatus,
      'Refresh Status': row.refreshStatus,
      Connections: row.connectionCount,
      Tables: row.tableCount,
      'SQL Queries': row.sqlQueryCount,
      Complexity: row.complexity,
      Validation: row.validationStatus,
      Comments: row.comments
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summarySheetRows), 'Report Summary');

    reportStatusRows.forEach((row, index) => {
      const reportName = row.displayName || row.reportName || `Report_${index + 1}`;
      const detailRows = [];
      const metadataRows = buildCombinedMetadataRows(row.reportName || row.displayName || '');

      detailRows.push({ Field: 'Details', Value: '' });
      detailRows.push({ Field: 'Report Name', Value: reportName });
      detailRows.push({ Field: 'Time Taken', Value: '-' });
      detailRows.push({ Field: 'Date', Value: today });
      detailRows.push({ Field: 'Number of Tables', Value: row.tableCount });
      detailRows.push({ Field: 'Number of Connection Details', Value: row.connectionCount });
      detailRows.push({ Field: 'Number of SQL Queries', Value: row.sqlQueryCount });
      detailRows.push({ Field: 'Complexity', Value: row.complexity });
      detailRows.push({ Field: 'Validation', Value: row.validationStatus });
      detailRows.push({ Field: '', Value: '' });

      const worksheet = XLSX.utils.json_to_sheet(detailRows, {
        header: ['Field', 'Value'],
        skipHeader: false
      });

      const metadataAoA = [
        [],
        [
          'Connection',
          'Table',
          'Before Mode',
          'Before Source',
          'Before Connection Type',
          'Before Server',
          'Before Database',
          'After Mode',
          'After Source',
          'After Connection Type',
          'After Server',
          'After Database'
        ]
      ];

      metadataRows.forEach((meta) => {
        metadataAoA.push([
          meta.Connection,
          meta.Table,
          meta['Before Mode'],
          meta['Before Source'],
          meta['Before Connection Type'],
          meta['Before Server'],
          meta['Before Database'],
          meta['After Mode'],
          meta['After Source'],
          meta['After Connection Type'],
          meta['After Server'],
          meta['After Database']
        ]);
      });

      XLSX.utils.sheet_add_aoa(worksheet, metadataAoA, { origin: -1 });
      XLSX.utils.book_append_sheet(workbook, worksheet, getSheetSafeName(reportName, index));
    });

    const fileName = `report-status-${today}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const authConfigured = Boolean(tenantId && clientId && clientSecret);
  const metadataBeforeCount = Array.isArray(metadataBefore) ? metadataBefore.length : 0;
  const metadataAfterCount = Array.isArray(metadataAfter) ? metadataAfter.length : 0;

  const completedSteps = React.useMemo(() => {
    return {
      auth: authStatus === 'success',
      download: downloadStatus === 'success',
      convert: convertStatus === 'success',
      publish: publishStatus === 'success',
      refresh: refreshStatus === 'success',
      connection: connectionStatus === 'success'
    };
  }, [authStatus, connectionStatus, convertStatus, downloadStatus, publishStatus, refreshStatus]);

  const stepMessages = React.useMemo(() => {
    return {
      auth: authStatus === 'success' ? 'Configured' : formatStatusLabel(authStatus),
      download: downloadStatus === 'success'
        ? (sessionDownloadedCount > 0 ? `${sessionDownloadedCount} files` : 'Success')
        : formatStatusLabel(downloadStatus),
      convert: convertStatus === 'success'
        ? (sessionConvertedCount > 0 ? `${sessionConvertedCount} files` : 'Success')
        : formatStatusLabel(convertStatus),
      publish: formatStatusLabel(publishStatus),
      refresh: formatStatusLabel(refreshStatus),
      connection: formatStatusLabel(connectionStatus)
    };
  }, [
    authStatus,
    connectionStatus,
    convertStatus,
    downloadStatus,
    publishStatus,
    refreshStatus,
    sessionConvertedCount,
    sessionDownloadedCount
  ]);

  const pages = [
    { id: 'setup', label: 'Setup' },
    { id: 'operations', label: 'Operations' },
    { id: 'connection', label: 'Connection' },
    { id: 'review', label: 'Review' },
    { id: 'publish', label: 'Publish' },
    { id: 'summary', label: 'Summary' }
  ];

  const handleComplexityCellChange = (objectKey, level, value) => {
    setComplexityMatrix((previous) => ({
      ...previous,
      [objectKey]: {
        ...(previous[objectKey] || DEFAULT_COMPLEXITY_MATRIX[objectKey]),
        [level]: value
      }
    }));
  };

  const toStatusPillClass = (statusLabel) => {
    const normalized = String(statusLabel || '').toLowerCase();
    if (normalized === 'success') {
      return 'success';
    }
    if (normalized === 'error' || normalized === 'failed') {
      return 'error';
    }
    if (normalized === 'running') {
      return 'info';
    }
    return 'idle';
  };

  const renderProgressBreadcrumb = (row) => {
    const stages = [
      { label: 'Downloaded', completed: row.downloaded },
      { label: 'Converted', completed: row.converted },
      { label: 'Metadata', completed: row.metadataBeforeCount > 0 },
      { label: 'Updated', completed: row.metadataAfterCount > 0 },
      { label: 'Published', completed: row.publishStatus === 'Success' },
      { label: 'Refreshed', completed: row.refreshStatus === 'Success' }
    ];
    return stages;
  };

  const reportTrackerSection = (
    <div className="card-section report-tracker-card">
      <div className="card-header">
        <div>
          <h2>Report Progress Tracker</h2>
          <p>Track each report across all stages: download, convert, metadata extraction, connection updates, publish, and refresh.</p>
        </div>
      </div>

      <div className="report-tracker-table-wrapper">
        <table className="report-tracker-table">
          <thead>
            <tr>
              <th>Report Name</th>
              <th>Progress</th>
              <th>Download</th>
              <th>Convert</th>
              <th>Connection</th>
              <th>Publish</th>
              <th>Refresh</th>
              <th>Connections</th>
              <th>Tables</th>
              <th>Queries</th>
              <th>Complexity</th>
              <th>Validation</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reportStatusRows.length === 0 ? (
              <tr>
                <td colSpan={13} className="report-tracker-empty">
                  No reports detected yet. Download or convert reports to populate this tracker.
                </td>
              </tr>
            ) : (
              reportStatusRows.map((row) => {
                const isSelected = (selectedReport || '').toLowerCase() === String(row.reportName || '').toLowerCase();
                const stages = renderProgressBreadcrumb(row);
                const completedStagesCount = stages.filter(s => s.completed).length;
                const progressPercent = (completedStagesCount / stages.length) * 100;
                return (
                  <tr key={row.reportName} className={isSelected ? 'selected' : ''}>
                    <td className="report-name-cell">{row.displayName || row.reportName}</td>
                    <td className="progress-cell">
                      <div className="progress-breadcrumb">
                        <div className="progress-indicator" style={{ width: `${progressPercent}%` }}></div>
                        <span className="progress-text">{completedStagesCount}/{stages.length}</span>
                      </div>
                      <div className="progress-stages">
                        {stages.map((stage, idx) => (
                          <span key={idx} className={`stage-badge ${stage.completed ? 'completed' : 'pending'}`} title={stage.label}>
                            {stage.label.charAt(0)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td><span className={`status-pill ${row.downloaded ? 'success' : 'idle'}`}>{row.downloaded ? '✓' : '○'}</span></td>
                    <td><span className={`status-pill ${row.converted ? 'success' : 'idle'}`}>{row.converted ? '✓' : '○'}</span></td>
                    <td><span className={`status-pill ${row.metadataAfterCount > 0 ? 'success' : 'idle'}`}>{row.metadataAfterCount > 0 ? '✓' : '○'}</span></td>
                    <td><span className={`status-pill ${toStatusPillClass(row.publishStatus)}`}>{row.publishStatus === 'Success' ? '✓' : row.publishStatus === 'Error' ? '✗' : '○'}</span></td>
                    <td><span className={`status-pill ${toStatusPillClass(row.refreshStatus)}`}>{row.refreshStatus === 'Success' ? '✓' : row.refreshStatus === 'Error' ? '✗' : '○'}</span></td>
                    <td className="metric-cell">{row.connectionCount}</td>
                    <td className="metric-cell">{row.tableCount}</td>
                    <td className="metric-cell">{row.sqlQueryCount}</td>
                    <td><span className={`complexity-pill ${String(row.complexity || '').toLowerCase().replace(/\s+/g, '-')}`}>{row.complexity}</span></td>
                    <td><span className={`validation-pill ${row.validationStatus === 'Validated' ? 'success' : 'warning'}`}>{row.validationStatus}</span></td>
                    <td className="report-tracker-comments">{row.comments}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="App">
      <div className="main-content-wrapper full-width">
        <ProgressHeader completedSteps={completedSteps} stepMessages={stepMessages} />

        <div className="app-container">
          <div className="page-nav" role="tablist" aria-label="Workflow pages">
            {pages.map((page) => (
              <button
                key={page.id}
                className={`page-tab ${activePage === page.id ? 'active' : ''}`}
                onClick={() => setActivePage(page.id)}
                role="tab"
                aria-selected={activePage === page.id}
              >
                {page.label}
              </button>
            ))}
          </div>

          {statusMessage && (
            <div className={`status-banner ${statusType}`}>
              {statusMessage}
            </div>
          )}

          {reportTrackerSection}

          {activePage === 'setup' && (
            <>
              <div className="card-section complexity-matrix-card">
                <div className="card-header">
                  <div>
                    <h2>Complexity Matrix</h2>
                    <p>Define thresholds used to classify each report as Low, Medium, or High complexity.</p>
                  </div>
                </div>

                <div className="complexity-matrix-table-wrapper">
                  <table className="complexity-matrix-table">
                    <thead>
                      <tr>
                        <th>Object</th>
                        <th>Low</th>
                        <th>Medium</th>
                        <th>High</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMPLEXITY_OBJECT_ROWS.map((row) => (
                        <tr key={row.key}>
                          <td>{row.label}</td>
                          <td>
                            <input
                              type="text"
                              className="text-input complexity-input"
                              value={complexityMatrix[row.key]?.low || ''}
                              onChange={(event) => handleComplexityCellChange(row.key, 'low', event.target.value)}
                              placeholder="e.g. 2"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="text-input complexity-input"
                              value={complexityMatrix[row.key]?.medium || ''}
                              onChange={(event) => handleComplexityCellChange(row.key, 'medium', event.target.value)}
                              placeholder="e.g. 2+"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="text-input complexity-input"
                              value={complexityMatrix[row.key]?.high || ''}
                              onChange={(event) => handleComplexityCellChange(row.key, 'high', event.target.value)}
                              placeholder="e.g. 5+"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="complexity-helper-text">
                  Tip: Enter numeric thresholds like 2, 2+, 5+. Complexity is recalculated live for every report in the tracker.
                </p>
              </div>

              <AuthPage
                tenantId={tenantId}
                setTenantId={setTenantId}
                clientId={clientId}
                setClientId={setClientId}
                clientSecret={clientSecret}
                setClientSecret={setClientSecret}
                authConnected={authStatus === 'success'}
                saveAuthConfig={saveAuthConfig}
                busyAction={busyAction}
                showStatus={showStatus}
                tenantIdHistory={[]}
                clientIdHistory={[]}
              />
            </>
          )}

          {activePage === 'operations' && (
            <OperationsPage
              sourceWorkspaceId={sourceWorkspaceId}
              setSourceWorkspaceId={setSourceWorkspaceId}
              targetWorkspaceId={targetWorkspaceId}
              setTargetWorkspaceId={setTargetWorkspaceId}
              pbixFolder={pbixFolder}
              setPbixFolder={setPbixFolder}
              downloadPbix={downloadPbix}
              convertPbix={convertPbix}
              busyAction={busyAction}
              flowSteps={[]}
              convertedReports={convertedFileNames}
              getPbipFolderPath={getPbipFolderPath}
              sourceWorkspaceHistory={sourceWorkspaceHistory}
              targetWorkspaceHistory={targetWorkspaceHistory}
              runAllOutput={runAllOutput}
              onSourceWorkspaceBlur={handleSourceWorkspaceBlur}
              onTargetWorkspaceBlur={handleTargetWorkspaceBlur}
              downloadedReports={downloadedFileNames}
              downloadStatus={downloadStatus}
              convertStatus={convertStatus}
            />
          )}

          {activePage === 'connection' && (
            <ConnectionPage
              changeConnectionReport={changeConnectionReport}
              setChangeConnectionReport={setChangeConnectionReport}
              autoServer={autoServer}
              setAutoServer={setAutoServer}
              autoDatabase={autoDatabase}
              setAutoDatabase={setAutoDatabase}
              autoTargetTechnology={autoTargetTechnology}
              setAutoTargetTechnology={setAutoTargetTechnology}
              autoWorkspaceId={autoWorkspaceId}
              setAutoWorkspaceId={setAutoWorkspaceId}
              autoLakehouseId={autoLakehouseId}
              setAutoLakehouseId={setAutoLakehouseId}
              extractBeforeMetadata={extractBeforeMetadata}
              changeConnection={changeConnection}
              changeConnectionForAll={changeConnectionForAll}
              busyAction={busyAction}
              selectedReport={selectedReport}
              changeConnectionOptions={changeConnectionOptions}
              runAllOutput={runAllOutput}
              onFabricWorkspaceBlur={handleFabricWorkspaceBlur}
            />
          )}

      {activePage === 'publish' && (
        <div className="card-section">
          <div className="card-header">
            <div>
              <h2>Publish & Refresh</h2>
              <p>Publish the PBIX and refresh the dataset.</p>
            </div>
          </div>

          <div className="action-row">
            <button
              className="action-btn secondary-btn"
              onClick={publishPbix}
              disabled={busyAction !== null}
            >
              {busyAction === 'publish' ? 'Publishing...' : 'Publish'}
            </button>
            <button
              className="action-btn secondary-btn"
              onClick={refreshDataset}
              disabled={busyAction !== null}
            >
              {busyAction === 'refresh' ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
          <div className="status-table">
            <div className="status-row status-header">
              <div>Action</div>
              <div>Status</div>
              <div>Message</div>
            </div>
            <div className="status-row">
              <div>Publish</div>
              <div className={`status-pill ${publishStatus}`}>
                {formatStatusLabel(publishStatus)}
              </div>
              <div className="status-message">{publishNote || '-'}</div>
            </div>
            <div className="status-row">
              <div>Refresh</div>
              <div className={`status-pill ${refreshStatus}`}>
                {formatStatusLabel(refreshStatus)}
              </div>
              <div className="status-message">{refreshNote || '-'}</div>
            </div>
          </div>

          <div className="action-row">
            <button
              className="action-btn secondary-btn"
              onClick={runFullFlow}
              disabled={busyAction !== null}
            >
              {busyAction === 'runall' ? 'Running...' : 'Run Full Flow'}
            </button>
          </div>
        </div>
      )}

      {activePage === 'review' && (
            <MetadataPage
              selectedReport={selectedReport}
              handleReportSelection={handleReportSelection}
              pbixReports={pbixReports}
              metadataBefore={metadataBefore}
              metadataAfter={metadataAfter}
              statusMessage={statusMessage}
              statusType={statusType}
              targetTechnology={autoTargetTechnology}
            />
      )}

      {activePage === 'summary' && (
        <div className="card-section">
          <div className="card-header">
            <div>
              <h2>Migration Summary</h2>
              <p>Quick view of configured values and current workflow status.</p>
            </div>
          </div>

          <div className="action-row">
            <button className="action-btn secondary-btn" onClick={downloadSummaryParameters}>
              Download Summary Report
            </button>
            <button className="action-btn secondary-btn" onClick={downloadReportStatus}>
              Download Detailed Report
            </button>
          </div>

          <div className="status-table summary-status-grid">
            <div className="status-row status-header">
              <div>Section</div>
              <div>Value</div>
              <div>Details</div>
            </div>

            <div className="status-row">
              <div>Azure AD Setup</div>
              <div>{authConfigured ? 'Configured' : 'Pending'}</div>
              <div className="status-message">{tenantId ? 'Tenant ID provided' : 'Tenant ID missing'}</div>
            </div>

            <div className="status-row">
              <div>Operations</div>
              <div>{downloadedFileNames.length} downloaded / {convertedFileNames.length} converted</div>
              <div className="status-message">PBIX folder: {pbixFolder || '-'}</div>
            </div>

            <div className="status-row">
              <div>Connection</div>
              <div>{changeConnectionReport || 'No report selected'}</div>
              <div className="status-message">{autoServer || '-'} / {autoDatabase || '-'}</div>
            </div>

            <div className="status-row">
              <div>Review</div>
              <div>{selectedReport || 'No report selected'}</div>
              <div className="status-message">Before: {metadataBeforeCount} | After: {metadataAfterCount}</div>
            </div>

            <div className="status-row">
              <div>Publish</div>
              <div>{formatStatusLabel(publishStatus)}</div>
              <div className="status-message">{publishNote || '-'}</div>
            </div>

            <div className="status-row">
              <div>Refresh</div>
              <div>{formatStatusLabel(refreshStatus)}</div>
              <div className="status-message">{refreshNote || '-'}</div>
            </div>
          </div>
        </div>
      )}

        </div>
      </div>
    </div>
  );
}

export default App;
