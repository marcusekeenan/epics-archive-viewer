/**
 * EPICS Archiver Appliance Constants and Configuration
 * Based on official documentation and user guide
 */

/**
 * Data Processing Operators
 * Each operator can be used to process data during retrieval
 */
export const OPERATORS = {
  // Sampling Operators
  FIRST_SAMPLE: {
    name: 'firstSample',
    description: 'Returns the first sample in a bin (default sparsification operator)'
  },
  LAST_SAMPLE: {
    name: 'lastSample',
    description: 'Returns the last sample in a bin'
  },
  FIRST_FILL: {
    name: 'firstFill',
    description: 'Like firstSample but fills empty bins with previous value'
  },
  LAST_FILL: {
    name: 'lastFill',
    description: 'Like lastSample but fills empty bins with previous value'
  },

  // Statistical Operators
  MEAN: {
    name: 'mean',
    description: 'Returns the average value of samples in a bin'
  },
  MIN: {
    name: 'min',
    description: 'Returns the minimum value in a bin'
  },
  MAX: {
    name: 'max',
    description: 'Returns the maximum value in a bin'
  },
  COUNT: {
    name: 'count',
    description: 'Returns the number of samples in a bin'
  },
  NCOUNT: {
    name: 'ncount',
    description: 'Returns the total number of samples in selected time span'
  },
  NTH: {
    name: 'nth',
    description: 'Returns every n-th value',
    requiresParam: true,
    paramName: 'n'
  },
  MEDIAN: {
    name: 'median',
    description: 'Returns the median value (50th percentile) of a bin'
  },
  STD: {
    name: 'std',
    description: 'Returns the standard deviation of samples in a bin'
  },
  JITTER: {
    name: 'jitter',
    description: 'Returns the jitter (std dev / mean) of samples in a bin'
  },

  // Advanced Statistical Operators
  VARIANCE: {
    name: 'variance',
    description: 'Returns the variance of samples in a bin'
  },
  POP_VARIANCE: {
    name: 'popvariance',
    description: 'Returns the population variance of samples in a bin'
  },
  KURTOSIS: {
    name: 'kurtosis',
    description: 'Returns the kurtosis (peakedness measure) of samples in a bin'
  },
  SKEWNESS: {
    name: 'skewness',
    description: 'Returns the skewness (asymmetry measure) of samples in a bin'
  },

  // Filter Operators
  IGNORE_FLYERS: {
    name: 'ignoreflyers',
    description: 'Ignores data points more than N standard deviations from mean',
    requiresParams: true,
    params: ['binSize', 'numDeviations']
  },
  FLYERS: {
    name: 'flyers',
    description: 'Only returns data points more than N standard deviations from mean',
    requiresParams: true,
    params: ['binSize', 'numDeviations']
  },

  // Advanced Processing
  LINEAR: {
    name: 'linear',
    description: 'Implements linear arithmetic mean across interval'
  },
  LOESS: {
    name: 'loess',
    description: 'Implements Loess arithmetic mean across interval'
  },
  OPTIMIZED: {
    name: 'optimized',
    description: 'Server-side optimization for requested number of points',
    requiresParam: true,
    paramName: 'points'
  },
  ERROR_BAR: {
    name: 'errorbar',
    description: 'Similar to mean with additional std deviation column'
  }
};

/**
 * Common bin sizes in seconds
 * Used for data reduction and optimization
 */
export const BIN_SIZES = {
  // Short intervals
  SECONDS_30: 30,
  MINUTE: 60,
  MINUTES_5: 300,
  MINUTES_15: 900,
  
  // Medium intervals
  HOUR: 3600,
  HOURS_4: 14400,
  HOURS_12: 43200,
  
  // Long intervals
  DAY: 86400,
  WEEK: 604800
};

/**
 * Time range configurations for optimal binning
 */
export const TIME_RANGES = {
  REALTIME: {
    duration: 300, // 5 minutes
    operator: null, // Use raw data
    binSize: null
  },
  SHORT: {
    duration: 3600, // 1 hour
    operator: OPERATORS.FIRST_SAMPLE.name,
    binSize: BIN_SIZES.SECONDS_30
  },
  MEDIUM: {
    duration: 86400, // 1 day
    operator: OPERATORS.MEAN.name,
    binSize: BIN_SIZES.MINUTES_5
  },
  LONG: {
    duration: 604800, // 1 week
    operator: OPERATORS.MEAN.name,
    binSize: BIN_SIZES.MINUTES_15
  },
  EXTENDED: {
    duration: 2592000, // 30 days
    operator: OPERATORS.MEAN.name,
    binSize: BIN_SIZES.HOUR
  }
};

/**
 * API Configuration
 */
export const API_CONFIG = {
  // Base URL for the archiver
  BASE_URL: 'http://lcls-archapp.slac.stanford.edu/retrieval/data',
  
  // Request timeouts (ms)
  TIMEOUTS: {
    DEFAULT: 30000,  // 30 seconds
    LONG: 60000,     // 1 minute
    EXTENDED: 120000 // 2 minutes
  },
  
  // Batch processing
  BATCH_SIZES: {
    DEFAULT: 5,  // Default number of concurrent PV requests
    LARGE: 10,   // For shorter time ranges
    SMALL: 3     // For longer time ranges
  },

  // Target number of data points for visualization
  TARGET_POINTS: {
    DEFAULT: 1000,  // Default for most displays
    HIGH_RES: 2000, // For detailed views
    LOW_RES: 500    // For overview displays
  },

  // Supported data formats
  FORMATS: {
    JSON: 'json',
    CSV: 'csv',
    MAT: 'mat',  // Matlab format
    RAW: 'raw',  // Binary format
    TXT: 'txt',  // Simple text format
    SVG: 'svg'   // Vector graphics format
  }
};

/**
 * Error constants
 */
export const ERRORS = {
  INVALID_TIMERANGE: 'Invalid time range specified',
  TIMEOUT: 'Request timed out',
  NO_DATA: 'No data available',
  INVALID_PV: 'Invalid PV name',
  SERVER_ERROR: 'Server error',
  RATE_LIMIT: 'Rate limit exceeded'
};

export default {
  OPERATORS,
  BIN_SIZES,
  TIME_RANGES,
  API_CONFIG,
  ERRORS
};