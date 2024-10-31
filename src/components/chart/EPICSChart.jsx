import { onMount, createEffect, createSignal, onCleanup } from 'solid-js';
import uPlot from 'uplot';
import { fetchBinnedData } from '../../utils/archiverApi';
import 'uplot/dist/uPlot.min.css';

const EPICSChart = (props) => {
  let chartRef;
  let uPlotInstance;
  const [isLoading, setIsLoading] = createSignal(false);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Convert milliseconds to seconds if needed
    const seconds = String(timestamp).length > 10 ? Math.floor(timestamp / 1000) : timestamp;
    return new Date(seconds * 1000).toLocaleString();
  };

  const processData = (rawData) => {
    if (!rawData?.[0]?.data) {
      console.log('No data array found');
      return null;
    }

    // Extract metadata and data points
    const meta = rawData[0].meta;
    const dataPoints = rawData[0].data;

    console.log('Sample datapoint:', dataPoints[0]);

    // Process data points
    const timestamps = [];
    const values = [];

    dataPoints.forEach(point => {
      // Convert to seconds if in milliseconds
      const timestamp = point.timestamp ? Math.floor(point.timestamp / 1000) : point.secs;
      const value = point.value ?? point.val;

      if (timestamp && typeof value === 'number') {
        timestamps.push(timestamp);
        values.push(value);
      }
    });

    console.log('Processed data:', {
      points: timestamps.length,
      first: { time: formatDate(timestamps[0]), value: values[0] },
      last: { time: formatDate(timestamps[timestamps.length - 1]), value: values[values.length - 1] }
    });

    // Find min/max for y-axis
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal;
    const padding = range * 0.1;

    return {
      name: meta.name,
      unit: meta.EGU,
      data: [timestamps, values],
      yRange: [minVal - padding, maxVal + padding]
    };
  };

  const initChart = () => {
    if (!chartRef || !props.data) return;

    const processedData = processData(props.data);
    if (!processedData?.data?.[0]?.length) return;

    // Clean up existing instance
    if (uPlotInstance) {
      uPlotInstance.destroy();
      uPlotInstance = null;
    }

    // Clear container
    chartRef.innerHTML = '';

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
          value: (u, v) => v?.toFixed(2),
          scale: "temp"
        }
      ],
      scales: {
        x: {
          time: true,
        },
        temp: {
          auto: false,
          range: processedData.yRange
        }
      },
      axes: [
        {
          scale: "x",
          values: (u, vals) => vals.map(formatDate),
          side: 2,
          grid: { show: true, stroke: "#dedede" },
          ticks: { show: false }
        },
        {
          scale: "temp",
          values: (u, vals) => vals.map(v => v.toFixed(2)),
          side: 3,
          grid: { show: true, stroke: "#dedede" },
          ticks: { show: false }
        }
      ],
      padding: [20, 50, 40, 60]
    };

    try {
      uPlotInstance = new uPlot(opts, processedData.data, chartRef);
      console.log('Chart initialized with', processedData.data[0].length, 'points');
    } catch (error) {
      console.error('Error initializing chart:', error);
    }
  };

  onMount(() => {
    if (chartRef) {
      // Initial render
      requestAnimationFrame(initChart);
      
      // Handle resize
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

  // Get current data summary
  const getDataSummary = () => {
    const data = props.data?.[0]?.data;
    if (!data?.length) return null;

    const firstPoint = data[0];
    const lastPoint = data[data.length - 1];

    return {
      points: data.length,
      timeRange: {
        start: formatDate(firstPoint.timestamp || firstPoint.secs),
        end: formatDate(lastPoint.timestamp || lastPoint.secs)
      },
      latest: (lastPoint.value || lastPoint.val)?.toFixed(2)
    };
  };

  return (
    <div class="space-y-4">
      <div class="relative bg-white rounded-lg shadow-sm">
        <div 
          ref={chartRef}
          class="w-full h-[400px] p-4"
          style="min-height: 400px"
        />
        
        {isLoading() && (
          <div class="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        )}
      </div>

      {/* Data Summary */}
      <div class="px-4 py-2 bg-gray-50 rounded text-sm">
        {(() => {
          const summary = getDataSummary();
          if (!summary) return <div>No data available</div>;
          
          return (
            <>
              <div>Data Points: {summary.points}</div>
              <div>Time Range: {summary.timeRange.start} - {summary.timeRange.end}</div>
              <div class="text-gray-500 text-xs mt-1">
                Latest Value: {summary.latest} {props.data?.[0]?.meta?.EGU}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default EPICSChart;