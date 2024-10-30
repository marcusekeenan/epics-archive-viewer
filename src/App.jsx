import { createSignal, createEffect } from 'solid-js';
import PVSelector from './components/controls/PVSelector';
import TimeRangeSelector from './components/controls/TimeRangeSelector';
import EPICSChart from './components/chart/EPICSChart';
import { fetchPVData } from './utils/api';

const ArchiveViewer = () => {
  const [selectedPVs, setSelectedPVs] = createSignal([]);
  const [timeRange, setTimeRange] = createSignal({ start: null, end: null });
  const [data, setData] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const [debugLogs, setDebugLogs] = createSignal([]);
  const [lastResponse, setLastResponse] = createSignal(null);

  const addDebugLog = (message, type = 'info') => {
    setDebugLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      message,
      type
    }].slice(-50)); // Keep last 50 messages
  };

  const handleRefresh = async () => {
    if (!selectedPVs().length) {
      addDebugLog('No PVs selected', 'error');
      return;
    }
    if (!timeRange().start || !timeRange().end) {
      addDebugLog('Invalid time range', 'error');
      return;
    }

    setLoading(true);
    addDebugLog(`Fetching data for ${selectedPVs().length} PVs...`);
    
    try {
      const responseData = await fetchPVData(selectedPVs(), timeRange().start, timeRange().end);
      setData(responseData);
      setLastResponse(responseData);
      addDebugLog(`Successfully fetched ${responseData.length} data points`, 'success');
    } catch (error) {
      addDebugLog(`Error: ${error.message}`, 'error');
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    console.log('State Update:', {
      selectedPVs: selectedPVs(),
      timeRange: timeRange(),
      dataPoints: data().length,
      loading: loading()
    });
  });

  return (
    <div class="min-h-screen bg-gray-100">
      <nav class="bg-blue-600 text-white p-4">
        <h1 class="text-xl font-bold">EPICS Archive Viewer</h1>
        <p class="text-sm mt-1 text-blue-100">Interactive visualization tool for EPICS process variables</p>
      </nav>
      
      <main class="container mx-auto p-4">
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Controls */}
          <div class="space-y-6">
            <div class="bg-white rounded-lg shadow-md p-6">
              <h2 class="text-lg font-semibold mb-4">Process Variables</h2>
              <PVSelector
                selectedPVs={selectedPVs}
                onAddPV={(pv) => {
                  setSelectedPVs([...selectedPVs(), pv]);
                  addDebugLog(`Added PV: ${pv}`);
                }}
                onRemovePV={(pv) => {
                  setSelectedPVs(selectedPVs().filter(p => p !== pv));
                  addDebugLog(`Removed PV: ${pv}`);
                }}
              />
            </div>

            <div class="bg-white rounded-lg shadow-md p-6">
              <h2 class="text-lg font-semibold mb-4">Time Range</h2>
              <TimeRangeSelector 
                onChange={(start, end) => {
                  setTimeRange({ start, end });
                  addDebugLog(`Time range updated: ${start} to ${end}`);
                }}
                disabled={loading()}
              />
            </div>
            
            {/* Debug Console */}
            <div class="bg-white rounded-lg shadow-md p-6">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-lg font-semibold">Debug Console</h2>
                <button
                  onClick={() => setDebugLogs([])}
                  class="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
              <div class="h-48 overflow-y-auto font-mono text-sm bg-gray-50 p-3 rounded">
                {debugLogs().map((log, i) => (
                  <div 
                    class={`mb-1 ${
                      log.type === 'error' ? 'text-red-600' :
                      log.type === 'success' ? 'text-green-600' :
                      'text-gray-600'
                    }`}
                  >
                    [{log.timestamp.split('T')[1].split('.')[0]}] {log.message}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Visualization */}
          <div class="space-y-6">
            <div class="bg-white rounded-lg shadow-md p-6">
              <div class="flex justify-between items-center mb-4">
                <h2 class="text-lg font-semibold">Data Visualization</h2>
                <button
                  onClick={handleRefresh}
                  disabled={loading()}
                  class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                         flex items-center gap-2"
                >
                  {loading() ? (
                    <>
                      <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Fetching...
                    </>
                  ) : 'Fetch Data'}
                </button>
              </div>
              <EPICSChart 
                data={data()} 
                pvs={selectedPVs()} 
                timeRange={timeRange()} 
              />
            </div>

            {/* API Response Viewer */}
            <div class="bg-white rounded-lg shadow-md p-6">
              <h2 class="text-lg font-semibold mb-4">API Response</h2>
              <div class="h-48 overflow-y-auto font-mono text-sm bg-gray-50 p-3 rounded">
                {lastResponse() ? (
                  <pre>{JSON.stringify(lastResponse(), null, 2)}</pre>
                ) : (
                  <p class="text-gray-500">No data fetched yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ArchiveViewer;