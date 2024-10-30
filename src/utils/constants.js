export const OPERATORS = {
    FIRST_SAMPLE: "firstSample",
    LAST_SAMPLE: "lastSample",
    FIRST_FILL: "firstFill",
    LAST_FILL: "lastFill",
    MEAN: "mean",
    MIN: "min",
    MAX: "max",
    COUNT: "count",
    NCOUNT: "ncount",
    NTH: "nth",
    MEDIAN: "median",
    STD: "std",
    JITTER: "jitter",
    IGNORE_FLYERS: "ignoreflyers",
    FLYERS: "flyers",
    VARIANCE: "variance",
    POP_VARIANCE: "popvariance",
    KURTOSIS: "kurtosis",
    SKEWNESS: "skewness"
  };
  
  export const DEFAULT_BIN_SIZES = {
    MINUTE: 60,
    FIVE_MINUTES: 300,
    FIFTEEN_MINUTES: 900,
    HOUR: 3600,
    FOUR_HOURS: 14400,
    DAY: 86400
  };
  
  export const REQUEST_TIMEOUTS = {
    DEFAULT: 30000,
    LONG: 60000
  };
  
  export const BATCH_SIZES = {
    DEFAULT: 5,
    LARGE: 10
  };
  
  export const BASE_URL = 'http://lcls-archapp.slac.stanford.edu/retrieval/data';
  
  export const TARGET_DATA_POINTS = 1000;