import { onMount, createEffect, createSignal, onCleanup } from 'solid-js';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

const EPICSChart = (props) => {
  let chartRef;
  let uPlotInstance;
  const [isLoading, setIsLoading] = createSignal(false);
  const [processingMode, setProcessingMode] = createSignal('mean');

  // All available processing modes
  const displayModes = [
    { value: 'raw', label: 'Raw Data' },
    { value: 'firstSample', label: 'First Sample' },
    { value: 'lastSample', label: 'Last Sample' },
    { value: 'firstFill', label: 'First Fill (with interpolation)' },
    { value: 'lastFill', label: 'Last Fill (with interpolation)' },
    { value: 'mean', label: 'Mean Value' },
    { value: 'min', label: 'Minimum Value' },
    { value: 'max', label: 'Maximum Value' },
    { value: 'count', label: 'Sample Count' },
    { value: 'median', label: 'Median Value' },
    { value: 'std', label: 'Standard Deviation' }
  ];

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const getProcessedValue = (point, mode) => {
    if (!point) return null;
    
    if (Array.isArray(point.val)) {
      // Handle statistical data [mean, stddev, min, max, count]
      const [mean, std, min, max, count] = point.val;
      switch (mode) {
        case 'mean': return mean;
        case 'min': return min;
        case 'max': return max;
        case 'std': return std;
        case 'count': return count;
        case 'firstSample': return mean;
        case 'lastSample': return mean;
        case 'firstFill': return mean;
        case 'lastFill': return mean;
        case 'median': return mean;
        default: return mean;
      }
    } else {
      // Handle raw data
      return point.value ?? point.val;
    }
  };

  const processData = (rawData) => {
    if (!rawData?.[0]?.data) {
      console.log('No data array found');
      return null;
    }

    const meta = rawData[0].meta;
    const dataPoints = rawData[0].data;
    const mode = processingMode();
    
    console.log('Processing data points:', dataPoints.length, 'with mode:', mode);

    const timestamps = [];
    const values = [];
    const mins = [];
    const maxs = [];
    let isStatisticalData = false;

    dataPoints.forEach((point, index) => {
      if (!point) return;

      const timestamp = point.timestamp || (point.secs * 1000);
      
      if (Array.isArray(point.val)) {
        isStatisticalData = true;
        const value = getProcessedValue(point, mode);
        
        if (typeof value === 'number' && !isNaN(value)) {
          timestamps.push(timestamp);
          values.push(value);
          
          if (mode === 'minmax' || mode === 'raw') {
            mins.push(point.val[2]); // min
            maxs.push(point.val[3]); // max
          } else {
            mins.push(value);
            maxs.push(value);
          }
        }
      } else {
        const value = point.value ?? point.val;
        if (typeof value === 'number' && !isNaN(value)) {
          timestamps.push(timestamp);
          values.push(value);
          mins.push(value);
          maxs.push(value);
        }
      }
    });

    if (timestamps.length === 0) {
      console.log('No valid data points found');
      return null;
    }

    // Calculate y-axis range
    const allValues = [...values];
    if (mode === 'minmax' || mode === 'raw') {
      allValues.push(...mins, ...maxs);
    }
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const range = maxVal - minVal;
    const padding = range * 0.1;

    return {
      name: meta?.name ?? 'Unknown',
      unit: meta?.EGU ?? '',
      data: [timestamps, values, mins, maxs],
      yRange: [minVal - padding, maxVal + padding],
      isStatisticalData: isStatisticalData && (mode === 'minmax' || mode === 'raw')
    };
  };

  const getTimeAxisSplits = (data) => {
    if (!data?.[0]?.length) return null;
    
    const timeRange = data[0][data[0].length - 1] - data[0][0];
    const hours = timeRange / (3600 * 1000);
    
    if (hours <= 2) {
      return {
        values: (u, vals) => vals.map(v => new Date(v).toLocaleTimeString()),
        space: 60
      };
    } else if (hours <= 24) {
      return {
        values: (u, vals) => vals.map(v => {
          const d = new Date(v);
          return d.getMinutes() === 0 ? d.toLocaleTimeString() : '';
        }),
        space: 80
      };
    } else {
      return {
        values: (u, vals) => vals.map(v => {
          const d = new Date(v);
          return d.getHours() === 0 ? d.toLocaleDateString() : '';
        }),
        space: 100
      };
    }
  };

  const initChart = () => {
    if (!chartRef || !props.data) return;

    const processedData = processData(props.data);
    if (!processedData?.data?.[0]?.length) return;

    if (uPlotInstance) {
      uPlotInstance.destroy();
      uPlotInstance = null;
    }

    chartRef.innerHTML = '';

    const timeAxis = getTimeAxisSplits(processedData.data);

    const opts = {
      title: processedData.name,
      width: chartRef.clientWidth || 800,
      height: 400,
      series: [
        {
          label: "Time",
          value: (u, v) => formatDate(v)
        },
        {
          label: `${processedData.name} (${processedData.unit})`,
          stroke: "rgb(0, 102, 204)",
          width: 2,
          points: {
            show: true,
            size: 4,
          },
          value: (u, v) => v?.toFixed(2)
        },
        processedData.isStatisticalData ? {
          label: "Min",
          stroke: "rgba(0, 102, 204, 0.2)",
          fill: "rgba(0, 102, 204, 0.1)",
          points: { show: false },
          value: (u, v) => v?.toFixed(2)
        } : null,
        processedData.isStatisticalData ? {
          label: "Max",
          stroke: "rgba(0, 102, 204, 0.2)",
          points: { show: false },
          value: (u, v) => v?.toFixed(2)
        } : null
      ].filter(Boolean),
      scales: {
        x: {
          time: true,
        },
        y: {
          auto: false,
          range: processedData.yRange
        }
      },
      axes: [
        {
          scale: "x",
          ...timeAxis,
          side: 2,
          grid: { show: true, stroke: "#dedede" },
          ticks: { show: false }
        },
        {
          scale: "y",
          values: (u, vals) => vals.map(v => v.toFixed(2)),
          side: 3,
          grid: { show: true, stroke: "#dedede" },
          ticks: { show: false }
        }
      ],
      bands: processedData.isStatisticalData ? [
        {
          series: [2, 3],
          fill: "rgba(0, 102, 204, 0.1)",
        }
      ] : [],
      padding: [20, 50, 40, 60]
    };

    try {
      uPlotInstance = new uPlot(opts, processedData.data, chartRef);
      console.log('Chart initialized with', processedData.data[0].length, 'points');
    } catch (error) {
      console.error('Error initializing chart:', error);
    }
  };

  const getDataSummary = () => {
    const data = props.data?.[0]?.data;
    if (!data?.length) return null;

    const firstPoint = data[0];
    const lastPoint = data[data.length - 1];
    
    const getValue = (point) => {
      if (!point) return 'N/A';
      const value = getProcessedValue(point, processingMode());
      return typeof value === 'number' ? value.toFixed(2) : 'N/A';
    };

    const getTimestamp = (point) => {
      if (!point) return null;
      return point.timestamp || (point.secs * 1000);
    };

    return {
      points: data.length,
      timeRange: {
        start: formatDate(getTimestamp(firstPoint)),
        end: formatDate(getTimestamp(lastPoint))
      },
      latest: getValue(lastPoint)
    };
  };

  onMount(() => {
    if (chartRef) {
      requestAnimationFrame(initChart);
      
      const resizeObserver = new ResizeObserver(() => {
        if (uPlotInstance && chartRef) {
          uPlotInstance.setSize({
            width: chartRef.clientWidth,
            height: 400
          });
        }
      });
      
      resizeObserver.observe(chartRef);
      
      onCleanup(() => {
        resizeObserver.disconnect();
        if (uPlotInstance) {
          uPlotInstance.destroy();
        }
      });
    }
  });

  createEffect(() => {
    if (props.data && chartRef) {
      initChart();
    }
  });

  return (
    <div class="space-y-4">
      <div class="mb-4">
        <label class="block mb-2 text-sm font-medium">Display Mode:</label>
        <select
          value={processingMode()}
          onChange={(e) => {
            setProcessingMode(e.target.value);
            if (props.data) {
              initChart();
            }
          }}
          class="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {displayModes.map(mode => (
            <option value={mode.value}>{mode.label}</option>
          ))}
        </select>
      </div>

      <div class="relative bg-white rounded-lg shadow-sm">
        <div 
          ref={el => chartRef = el}
          class="w-full h-[400px] p-4"
          style="min-height: 400px"
        />
        
        {isLoading() && (
          <div class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        )}
      </div>

      <div class="px-4 py-2 bg-gray-50 rounded text-sm">
        {(() => {
          const summary = getDataSummary();
          if (!summary) return <div>No data available</div>;
          
          return (
            <>
              <div>Data Points: {summary.points}</div>
              <div>Time Range: {summary.timeRange.start} - {summary.timeRange.end}</div>
              <div class="text-gray-500 text-xs mt-1">
                Latest Value: {summary.latest} {props.data?.[0]?.meta?.EGU || ''} 
                ({processingMode()} mode)
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default EPICSChart;