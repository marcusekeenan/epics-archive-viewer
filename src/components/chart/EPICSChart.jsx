import { onMount, createEffect, createSignal, onCleanup } from 'solid-js';
import uPlot from 'uplot';
import { fetchBinnedData } from '../../utils/archiverApi';
import 'uplot/dist/uPlot.min.css';

const EPICSChart = (props) => {
  let chartRef;
  let uPlotInstance;
  const [isRealTime, setIsRealTime] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  let realtimeInterval;

  const processData = (rawData) => {
    if (!rawData?.length) return null;
    
    const timestamps = [];
    const seriesData = {};
    const series = [{ 
      label: 'Time',
      value: (u, v) => v != null ? new Date(v * 1e3).toLocaleString('en-US', { 
        timeZone: props.timezone || 'UTC',
        dateStyle: 'short',
        timeStyle: 'medium'
      }) : '-'
    }];
  
    rawData.forEach(pvData => {
      if (!pvData.data?.[0]?.data?.length) return;
  
      const pvInfo = pvData.data[0];
      const name = pvInfo.meta?.name;
      const unit = pvInfo.meta?.EGU || '';
      
      // Add series for the PV
      series.push({ 
        label: `${name} (${unit})`,
        stroke: `hsl(${Math.random() * 360}, 70%, 50%)`,
        value: (u, rawValue) => {
          if (rawValue == null) return '-';
          
          // Handle both array (statistical) and single values
          const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
          return typeof value === 'number' ? value.toFixed(2) : '-';
        }
      });
      
      seriesData[name] = new Array(pvInfo.data.length);
      
      
      pvInfo.data.forEach((point, i) => {
        if (i >= timestamps.length) {
          timestamps[i] = point.secs;
        }
        seriesData[name][i] = point.val;
      });
    });
  
    if (!timestamps.length || !Object.keys(seriesData).length) return null;
  
    return {
      series,
      data: [
        timestamps,
        ...Object.values(seriesData)
      ]
    };
  };

  const fetchNewData = async (start, end) => {
    if (!start || !end || start === end) return null;
    
    setIsLoading(true);
    try {
      const responseData = await fetchBinnedData(
        props.pvs,
        new Date(start * 1000),
        new Date(end * 1000),
        { width: chartRef?.clientWidth }
      );
      return processData(responseData);
    } catch (error) {
      console.error('Error fetching data:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const startRealtime = () => {
    setIsRealTime(true);
    realtimeInterval = setInterval(async () => {
      if (!uPlotInstance) return;
      
      const end = Math.floor(Date.now() / 1000);
      const start = end - (5 * 60);
      
      const newData = await fetchNewData(start, end);
      if (newData) {
        uPlotInstance.setData(newData.data);
      }
    }, 5000);
  };

  const stopRealtime = () => {
    setIsRealTime(false);
    if (realtimeInterval) {
      clearInterval(realtimeInterval);
    }
  };

  const formatTimeAxis = (u, timestamps) => {
    if (!timestamps?.length) return [];
    
    return timestamps.map(ts => {
      const date = new Date(ts * 1e3);
      const range = u.scales.x.max - u.scales.x.min;
      
      return date.toLocaleString('en-US', {
        timeZone: props.timezone || 'UTC',
        ...range < 300 ? {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        } : range < 86400 ? {
          hour: '2-digit',
          minute: '2-digit'
        } : {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }
      });
    });
  };

  const initChart = (data) => {
    if (uPlotInstance) {
      uPlotInstance.destroy();
    }

    if (!data) return;

    const opts = {
      title: "EPICS Data",
      width: chartRef.clientWidth,
      height: 500,
      series: data.series,
      scales: {
        x: {
          time: true,
          auto: false,
          range: (u, dataMin, dataMax) => [dataMin, dataMax]
        },
        y: {
          auto: true,
          distr: 1
        }
      },
      axes: [
        {
          scale: "x",
          space: 100,
          values: formatTimeAxis,
          grid: { show: true },
          ticks: { show: true }
        },
        {
          scale: "y",
          grid: { show: true },
          ticks: { show: true },
          size: 70
        }
      ],
      cursor: {
        drag: {
          setScale: true,
          x: true,
          y: false
        },
        sync: {
          key: 'epics-sync'
        },
        focus: {
          prox: 30
        }
      },
      hooks: {
        setScale: [
          async (u) => {
            if (!isRealTime() && u.scales.x) {
              const xRange = u.scales.x.range;
              if (Array.isArray(xRange) && xRange.length === 2) {
                const [minX, maxX] = xRange;
                if (typeof minX === 'number' && typeof maxX === 'number' && minX !== maxX) {
                  try {
                    const newData = await fetchNewData(minX, maxX);
                    if (newData?.data && Array.isArray(newData.data)) {
                      u.setData(newData.data);
                    }
                  } catch (error) {
                    console.error('Error updating data:', error);
                  }
                }
              }
            }
          }
        ],
        ready: [
          (u) => {
            const controls = document.createElement('div');
            controls.className = 'u-controls';
            controls.style.position = 'absolute';
            controls.style.top = '8px';
            controls.style.right = '8px';
            
            controls.innerHTML = `
              <button class="zoom-in px-2 py-1 bg-blue-500 text-white rounded mr-1">+</button>
              <button class="zoom-out px-2 py-1 bg-blue-500 text-white rounded mr-1">-</button>
              <button class="reset px-2 py-1 bg-blue-500 text-white rounded mr-1">Reset</button>
              <button class="realtime px-2 py-1 bg-green-500 text-white rounded">
                ${isRealTime() ? 'Stop' : 'Real-time'}
              </button>
            `;
            
            u.over.appendChild(controls);

            controls.querySelector('.zoom-in').onclick = () => u.zoom(0.5, u.cursor.left);
            controls.querySelector('.zoom-out').onclick = () => u.zoom(2.0, u.cursor.left);
            controls.querySelector('.reset').onclick = () => {
              const firstTimestamp = data.data[0][0];
              const lastTimestamp = data.data[0][data.data[0].length - 1];
              if (typeof firstTimestamp === 'number' && typeof lastTimestamp === 'number') {
                u.setScale('x', { min: firstTimestamp, max: lastTimestamp });
              }
            };
            controls.querySelector('.realtime').onclick = () => {
              if (isRealTime()) {
                stopRealtime();
                controls.querySelector('.realtime').textContent = 'Real-time';
                controls.querySelector('.realtime').className = 'realtime px-2 py-1 bg-green-500 text-white rounded';
              } else {
                startRealtime();
                controls.querySelector('.realtime').textContent = 'Stop';
                controls.querySelector('.realtime').className = 'realtime px-2 py-1 bg-red-500 text-white rounded';
              }
            };
          }
        ]
      }
    };

    uPlotInstance = new uPlot(opts, data.data, chartRef);
  };

  onMount(() => {
    const data = processData(props.data);
    if (data) initChart(data);

    const resizeObserver = new ResizeObserver(() => {
      if (uPlotInstance && chartRef) {
        uPlotInstance.setSize({ width: chartRef.clientWidth, height: 500 });
      }
    });

    resizeObserver.observe(chartRef);

    onCleanup(() => {
      resizeObserver.disconnect();
      stopRealtime();
      if (uPlotInstance) {
        uPlotInstance.destroy();
      }
    });
  });

  createEffect(() => {
    const data = processData(props.data);
    if (data) initChart(data);
  });

  return (
    <div class="relative">
      <div ref={chartRef} class="w-full" />
      {isLoading() && (
        <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default EPICSChart;