import { createSignal, createEffect } from 'solid-js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import PVSelector from './components/controls/PVSelector';
import TimeRangeSelector from './components/controls/TimeRangeSelector';
import EPICSChart from './components/chart/EPICSChart';
import { fetchBinnedData } from './utils/archiverApi';

const APIResponseDialog = (props) => (
  <Dialog isOpen={props.isOpen} onClose={props.onClose}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>API Response</DialogTitle>
      </DialogHeader>
      <pre class="p-4 bg-gray-50 rounded overflow-auto">
        {JSON.stringify(props.data, null, 2)}
      </pre>
    </DialogContent>
  </Dialog>
);

const ArchiveViewer = () => {
  let chartContainer;
  const [selectedPVs, setSelectedPVs] = createSignal([]);
  const [timeRange, setTimeRange] = createSignal({ start: null, end: null });
  const [data, setData] = createSignal([]);
  const [loading, setLoading] = createSignal(false);
  const [debugLogs, setDebugLogs] = createSignal([]);
  const [showApiResponse, setShowApiResponse] = createSignal(false);

  const addDebugLog = (message, type = 'info') => {
    setDebugLogs(prev => [...prev, {
      timestamp: new Date().toISOString(),
      message,
      type
    }].slice(-50));
  };

  const handleRefresh = async () => {
    if (!selectedPVs().length || !timeRange().start || !timeRange().end) {
      addDebugLog('Missing PVs or time range', 'error');
      return;
    }

    setLoading(true);
    try {
      const responseData = await fetchBinnedData(
        selectedPVs(),
        timeRange().start,
        timeRange().end,
        { 
          width: chartContainer?.clientWidth || 1000,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone // Pass timezone to API
        }
      );
      setData(responseData);
      addDebugLog(`Fetched data for ${selectedPVs().length} PVs`);
    } catch (error) {
      console.error('Error:', error);
      addDebugLog(`Error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="min-h-screen bg-gray-100">
      <nav class="bg-blue-600 text-white p-4">
        <h1 class="text-xl font-bold">EPICS Archive Viewer</h1>
        <p class="text-sm mt-1 text-blue-100">Interactive visualization tool</p>
      </nav>
      
      <main class="container mx-auto p-4">
        <div class="grid grid-cols-2 gap-6 mb-6">
          <div class="bg-white rounded-lg shadow-md p-6">
            <h2 class="text-lg font-semibold mb-4">Process Variables</h2>
            <PVSelector
              selectedPVs={selectedPVs}
              onAddPV={pv => {
                setSelectedPVs([...selectedPVs(), pv]);
                addDebugLog(`Added PV: ${pv}`);
              }}
              onRemovePV={pv => {
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
                addDebugLog(`Time range updated: ${start.toISOString()} to ${end.toISOString()}`);
              }}
              disabled={loading()}
            />
          </div>
        </div>

        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold">Data Visualization</h2>
            <div class="flex gap-2">
              <button
                onClick={() => setShowApiResponse(true)}
                class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                View Response
              </button>
              <button
                onClick={handleRefresh}
                disabled={loading()}
                class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 
                      disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
          </div>
          <div ref={chartContainer} class="w-full">
            <EPICSChart 
              data={data()} 
              pvs={selectedPVs()} 
              timeRange={timeRange()}
              timezone={Intl.DateTimeFormat().resolvedOptions().timeZone}
            />
          </div>
        </div>

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
            {debugLogs().map(log => (
              <div class={`mb-1 ${log.type === 'error' ? 'text-red-600' : log.type === 'success' ? 'text-green-600' : 'text-gray-600'}`}>
                [{log.timestamp.split('T')[1].split('.')[0]}] {log.message}
              </div>
            ))}
          </div>
        </div>

        <APIResponseDialog
          isOpen={showApiResponse()}
          onClose={() => setShowApiResponse(false)}
          data={data()}
        />
      </main>
    </div>
  );
};

export default ArchiveViewer;