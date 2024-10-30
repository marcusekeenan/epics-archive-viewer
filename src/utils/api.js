const BASE_URL = 'http://lcls-archapp.slac.stanford.edu/retrieval/data';

/**
 * Gets current timezone offset in format "-07:00" or "-08:00"
 */
const getTimezoneOffset = () => {
  const now = new Date();
  const isDST = now.getTimezoneOffset() < new Date(now.getFullYear(), 0, 1).getTimezoneOffset();
  return isDST ? '-07:00' : '-08:00';
};

/**
 * Fetches data for multiple PVs at a specific time
 */
export const fetchPVDataAtTime = async (pvs) => {
  const now = new Date();
  const formattedDate = now.toISOString().slice(0, -5) + '.000' + getTimezoneOffset();

  const params = new URLSearchParams({
    at: formattedDate
  });

  try {
    console.log('Request URL:', `${BASE_URL}/getDataAtTime?${params}`);
    console.log('Request Body:', JSON.stringify(pvs));

    const response = await fetch(`${BASE_URL}/getDataAtTime?${params}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(pvs)
    });

    console.log('Response status:', response.status);
    const responseText = await response.text();
    console.log('Response text:', responseText);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}, body: ${responseText}`);
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.error('Error details:', error);
    throw error;
  }
};

/**
 * Fetches historical data for a single PV
 */
export const fetchPVData = async (pv, from, to) => {
  // Format dates with timezone offset
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const tzOffset = getTimezoneOffset();

  const fromStr = fromDate.toISOString().slice(0, -5) + '.000' + tzOffset;
  const toStr = toDate.toISOString().slice(0, -5) + '.000' + tzOffset;

  const url = new URL(`${BASE_URL}/getData.json`);
  url.searchParams.set('pv', pv);
  url.searchParams.set('from', fromStr);
  url.searchParams.set('to', toStr);

  try {
    console.log('Fetching data from URL:', url.toString());
    
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Error response:', text);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching PV data:', error);
    throw error;
  }
};

// Test function
export const testAPI = async () => {
  const testPVs = [
    "VPIO:IN20:111:VRAW",
    "ROOM:LI30:1:OUTSIDE_TEMP"
  ];

  console.log('Testing API with PVs:', testPVs);
  const result = await fetchPVDataAtTime(testPVs);
  console.log('Test result:', result);
  return result;
};