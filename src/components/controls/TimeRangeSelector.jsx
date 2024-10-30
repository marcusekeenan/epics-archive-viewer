import { createSignal, createEffect } from 'solid-js';

const TimeRangeSelector = (props) => {
  const [startDate, setStartDate] = createSignal('');
  const [endDate, setEndDate] = createSignal('');
  const [timezone, setTimezone] = createSignal(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [relativeRange, setRelativeRange] = createSignal('1h'); // Default to 1 hour

  const timezones = [
    'UTC',
    'America/Los_Angeles',
    'America/Denver',
    'America/Chicago',
    'America/New_York',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo'
  ];

  const relativeRanges = [
    { value: 'custom', label: 'Custom Range' },
    { value: '15m', label: 'Last 15 Minutes' },
    { value: '30m', label: 'Last 30 Minutes' },
    { value: '1h', label: 'Last Hour' },
    { value: '3h', label: 'Last 3 Hours' },
    { value: '6h', label: 'Last 6 Hours' },
    { value: '12h', label: 'Last 12 Hours' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '2d', label: 'Last 2 Days' },
    { value: '7d', label: 'Last Week' },
    { value: '30d', label: 'Last 30 Days' }
  ];

  const getRelativeTimeRange = (value) => {
    const now = new Date();
    const start = new Date(now);

    const match = value.match(/^(\d+)([mhd])$/);
    if (!match) return { start: now, end: now };

    const [_, amount, unit] = match;
    const num = parseInt(amount);

    switch (unit) {
      case 'm':
        start.setMinutes(start.getMinutes() - num);
        break;
      case 'h':
        start.setHours(start.getHours() - num);
        break;
      case 'd':
        start.setDate(start.getDate() - num);
        break;
    }

    return { start, end: now };
  };

  const formatForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.getFullYear() +
           '-' + String(d.getMonth() + 1).padStart(2, '0') +
           '-' + String(d.getDate()).padStart(2, '0') +
           'T' + String(d.getHours()).padStart(2, '0') +
           ':' + String(d.getMinutes()).padStart(2, '0');
  };

  const formatForAPI = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const tzOffset = new Date(d).toLocaleString('en-US', {
      timeZone: timezone(),
      timeZoneName: 'shortOffset'
    }).split(' ').pop();
    
    return d.toISOString().slice(0, -5) + tzOffset.replace('GMT', '');
  };

  const updateTimeRange = (start, end) => {
    const startInput = formatForInput(start);
    const endInput = formatForInput(end);
    
    setStartDate(startInput);
    setEndDate(endInput);

    // Send formatted dates to parent
    if (props.onChange) {
      props.onChange(
        new Date(start),
        new Date(end)
      );
    }
  };

  // Handle relative range selection
  const handleRelativeRangeChange = (value) => {
    setRelativeRange(value);
    if (value === 'custom') return;

    const { start, end } = getRelativeTimeRange(value);
    updateTimeRange(start, end);
  };

  // Handle manual date input
  const handleDateInput = (isStart, value) => {
    if (isStart) {
      setStartDate(value);
      updateTimeRange(new Date(value), new Date(endDate()));
    } else {
      setEndDate(value);
      updateTimeRange(new Date(startDate()), new Date(value));
    }
    setRelativeRange('custom');
  };

  // Initialize when component mounts or timezone changes
  createEffect(() => {
    const { start, end } = getRelativeTimeRange(relativeRange());
    updateTimeRange(start, end);
  });

  return (
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <label class="font-medium">Timezone</label>
        <select
          value={timezone()}
          onChange={(e) => setTimezone(e.target.value)}
          class="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {timezones.map(tz => (
            <option value={tz}>{tz.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      <div class="flex flex-col gap-2">
        <label class="font-medium">Time Range</label>
        <select
          value={relativeRange()}
          onChange={(e) => handleRelativeRangeChange(e.target.value)}
          class="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {relativeRanges.map(range => (
            <option value={range.value}>{range.label}</option>
          ))}
        </select>
      </div>

      <div class="flex flex-col gap-2">
        <label class="font-medium">Start Time ({timezone()})</label>
        <input
          type="datetime-local"
          value={startDate()}
          onInput={(e) => handleDateInput(true, e.target.value)}
          disabled={props.disabled || relativeRange() !== 'custom'}
          class="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label class="font-medium">End Time ({timezone()})</label>
        <input
          type="datetime-local"
          value={endDate()}
          onInput={(e) => handleDateInput(false, e.target.value)}
          disabled={props.disabled || relativeRange() !== 'custom'}
          class="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>

      <div class="text-sm text-gray-600 mt-2">
        Current range: {startDate()} to {endDate()} ({timezone()})
      </div>
    </div>
  );
};

export default TimeRangeSelector;