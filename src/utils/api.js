const BASE_URL = 'http://lcls-archapp.slac.stanford.edu/retrieval/data';

/**
 * Gets data for a PV with optional binning
 * @param {string} pv - PV name
 * @param {string} from - Start time in ISO format
 * @param {string} to - End time in ISO format
 * @param {Object} options - Optional parameters
 * @param {string} options.operator - Binning operator (e.g., 'mean', 'max', 'min')
 * @param {number} options.binSize - Bin size in seconds (e.g., 900 for 15min, 3600 for 1h)
 */
export const fetchPVData = async (pv, from, to, options = {}) => {
  // Format PV name with operator if binning is requested
  let processedPV = pv;
  if (options.operator && options.binSize) {
    processedPV = `${options.operator}_${options.binSize}(${pv})`;
  }

  const url = new URL(`${BASE_URL}/getData.json`);
  url.searchParams.set('pv', processedPV);
  url.searchParams.set('from', from);
  url.searchParams.set('to', to);

  console.log('Fetching data from URL:', url.toString());

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching PV data:', error);
    throw error;
  }
};

/**
 * Fetches binned data for multiple PVs
 */
export const fetchBinnedData = async (pvs, from, to, options = { operator: 'mean', binSize: 900 }) => {
  try {
    const requests = pvs.map(pv => fetchPVData(pv, from, to, options));
    const results = await Promise.all(requests);
    return results;
  } catch (error) {
    console.error('Error fetching binned data:', error);
    throw error;
  }
};

/**
 * Gets current value for multiple PVs
 */
export const fetchPVDataAtTime = async (pvs, timestamp) => {
  const url = new URL(`${BASE_URL}/getDataAtTime`);
  url.searchParams.set('at', timestamp);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pvs)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching PV data:', error);
    throw error;
  }
};