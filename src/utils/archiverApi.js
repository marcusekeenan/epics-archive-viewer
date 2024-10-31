// archiverApi.js
import { API_CONFIG } from './constants';

const processValue = (point) => {
  if (!point || typeof point.val === 'undefined') {
    console.warn('Invalid point data:', point);
    return null;
  }

  if (Array.isArray(point.val)) {
    return {
      value: point.val[0], // mean
      min: point.val[2],
      max: point.val[3],
      stddev: point.val[1],
      count: point.val[4]
    };
  }
  return {
    value: point.val,
    min: point.val,
    max: point.val,
    stddev: 0,
    count: 1
  };
};

const normalizeData = (data) => {
  if (!Array.isArray(data) || data.length === 0) {
    console.warn('No data to normalize');
    return [];
  }
  
  return data.map(pvData => {
    if (!pvData?.data || !Array.isArray(pvData.data)) {
      console.warn('Invalid PV data format:', pvData);
      return {
        meta: pvData?.meta || { name: 'Unknown' },
        data: []
      };
    }

    return {
      meta: pvData.meta || { name: 'Unknown' },
      data: pvData.data
        .map(point => {
          if (!point || typeof point.secs === 'undefined') {
            return null;
          }
          const processed = processValue(point);
          if (!processed) return null;

          return {
            timestamp: point.secs * 1000 + Math.floor((point.nanos || 0) / 1e6),
            severity: point.severity || 0,
            status: point.status || 0,
            ...processed
          };
        })
        .filter(Boolean) // Remove null entries
    };
  });
};

const fetchWithTimeout = async (urlString, options = {}, timeout = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(urlString, {
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

const fetchPVData = async (pv, from, to, options = {}) => {
  const url = new URL(`${API_CONFIG.BASE_URL}/getData.json`);
  
  // Set time range parameters
  url.searchParams.set('from', formatDateForArchiver(from));
  url.searchParams.set('to', formatDateForArchiver(to));

  // For one hour or less, use raw data instead of optimized
  const duration = to - from;
  const useOptimized = duration > 60 * 60 * 1000; // > 1 hour

  // Construct PV query
  let pvQuery = pv;
  if (useOptimized && options.operator) {
    pvQuery = `${options.operator}(${pv})`;
  }
  url.searchParams.set('pv', pvQuery);

  console.debug('Fetching data:', {
    pv: pvQuery,
    operator: useOptimized ? options.operator : 'raw',
    from: formatDateForArchiver(from),
    to: formatDateForArchiver(to)
  });

  try {
    const response = await fetchWithTimeout(url.toString());
    const rawData = await response.json();
    
    // Log raw data for debugging
    console.debug('Received raw data:', rawData);

    if (!Array.isArray(rawData) || !rawData[0]?.data) {
      throw new Error('Invalid response format');
    }

    return normalizeData(rawData);
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

const fetchBinnedData = async (pvs, from, to, options = {}) => {
  if (!Array.isArray(pvs) || pvs.length === 0) {
    throw new Error('No PVs specified');
  }

  try {
    // Single fetch for all PVs
    const result = await fetchPVData(pvs[0], from, to, options);
    return result;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

const formatDateForArchiver = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().replace('Z', '-00:00');
};

export {
  fetchPVData,
  fetchBinnedData
};