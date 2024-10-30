import { BASE_URL } from './constants';

const fetchWithTimeout = async (url, options, timeout = 30000) => {
 const controller = new AbortController();
 const timeoutId = setTimeout(() => controller.abort(), timeout);
 
 try {
   const response = await fetch(url, { ...options, signal: controller.signal });
   clearTimeout(timeoutId);
   return response;
 } catch (error) {
   clearTimeout(timeoutId);
   throw error;
 }
};

const calculateBinSize = (start, end, width = 1000) => {
  if (!start || !end) return 1;
  const timeRange = Math.abs(new Date(end) - new Date(start)) / 1000; // in seconds
  const targetPoints = Math.floor(width / 2); // 2 pixels per point
  const rawBinSize = Math.max(1, Math.floor(timeRange / targetPoints));
  
  // Round to common intervals
  const intervals = [1, 5, 10, 30, 60, 300, 900, 1800, 3600, 7200, 14400, 86400];
  return intervals.find(i => i >= rawBinSize) || intervals[intervals.length - 1];
};
  
const formatDateForArchiver = (date) => {
 if (!date) return null;
 const d = new Date(date);
 const offset = d.getTimezoneOffset();
 const isDST = offset < new Date(d.getFullYear(), 0, 1).getTimezoneOffset();
 const tzString = isDST ? '-07:00' : '-08:00';
 return `${d.toISOString().split('.')[0]}.000${tzString}`;
};

export const fetchPVData = async (pv, from, to, options = {}) => {
 const { width = 1000, operator = 'optimized' } = options;
 const binSize = calculateBinSize(from, to, width);
 
 // Use different operators based on time range and zoom level
 let processedPV;
 if (operator === 'optimized') {
   processedPV = `optimized_${width}(${pv})`; // Uses server-side optimization
 } else {
   processedPV = binSize > 1 ? `${operator}_${binSize}(${pv})` : pv;
 }

 const url = new URL(`${BASE_URL}/getData.json`);
 url.searchParams.set('pv', processedPV);
 url.searchParams.set('from', formatDateForArchiver(from));
 url.searchParams.set('to', formatDateForArchiver(to));
 url.searchParams.set('donotchunk', 'true');

 console.log('Fetching:', {
   pv: processedPV,
   from: formatDateForArchiver(from),
   to: formatDateForArchiver(to),
   binSize,
   width
 });

 try {
   const response = await fetchWithTimeout(url);
   if (!response.ok) {
     throw new Error(`HTTP error! status: ${response.status}`);
   }
   const data = await response.json();
   return {
     data,
     binSize,
     processedPV
   };
 } catch (error) {
   if (error.name === 'AbortError') {
     throw new Error('Request timeout');
   }
   throw error;
 }
};

export const fetchBinnedData = async (pvs, from, to, options = {}) => {
 if (!pvs.length) return [];
 
 const batchSize = 5; // Number of concurrent requests
 const results = [];

 for (let i = 0; i < pvs.length; i += batchSize) {
   const batch = pvs.slice(i, i + batchSize);
   const batchPromises = batch.map(pv => 
     fetchPVData(pv, from, to, options)
       .catch(error => ({ error, pv }))
   );
   
   const batchResults = await Promise.all(batchPromises);
   results.push(...batchResults);
 }

 return results;
};

export const fetchRealtimeData = async (pvs, duration = 300) => {
 const end = new Date();
 const start = new Date(end - duration * 1000);
 return fetchBinnedData(pvs, start, end, { operator: 'raw' });
};

export const fetchPVDataAtTime = async (pvs, timestamp) => {
 const url = new URL(`${BASE_URL}/getDataAtTime`);
 url.searchParams.set('at', formatDateForArchiver(timestamp));
 url.searchParams.set('includeProxies', 'true');

 try {
   const response = await fetchWithTimeout(url, {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify(pvs)
   });

   if (!response.ok) {
     throw new Error(`HTTP error! status: ${response.status}`);
   }

   return await response.json();
 } catch (error) {
   if (error.name === 'AbortError') {
     throw new Error('Request timeout');
   }
   throw error;
 }
};

export const EXPORT_FORMATS = {
 CSV: 'csv',
 JSON: 'json'
};

export const exportData = (data, format = EXPORT_FORMATS.CSV) => {
 switch (format) {
   case EXPORT_FORMATS.CSV:
     return generateCSV(data);
   case EXPORT_FORMATS.JSON:
     return JSON.stringify(data, null, 2);
   default:
     throw new Error(`Unsupported format: ${format}`);
 }
};

const generateCSV = (data) => {
 if (!data?.length) return '';
 
 // Extract all available fields from the data
 const samplePoint = data[0]?.data?.[0]?.data?.[0] || {};
 const fields = Object.keys(samplePoint).filter(k => k !== 'secs' && k !== 'nanos');
 
 const headers = ['timestamp', ...fields];
 const rows = [];

 data.forEach(pvData => {
   const pvInfo = pvData.data?.[0];
   if (!pvInfo?.data) return;
   
   pvInfo.data.forEach(point => {
     const timestamp = new Date(point.secs * 1000 + Math.round(point.nanos / 1e6)).toISOString();
     const values = fields.map(field => point[field]);
     rows.push([timestamp, ...values]);
   });
 });
 
 return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
};