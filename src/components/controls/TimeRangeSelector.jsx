import { createSignal, createEffect } from 'solid-js';

const TimeRangeSelector = (props) => {
  const [startDate, setStartDate] = createSignal(new Date().toISOString().slice(0, 16));
  const [endDate, setEndDate] = createSignal(new Date().toISOString().slice(0, 16));

  createEffect(() => {
    if (startDate() && endDate()) {
      props.onChange(startDate(), endDate());
    }
  });

  return (
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <label class="font-medium">Start Time</label>
        <input
          type="datetime-local"
          value={startDate()}
          onInput={(e) => setStartDate(e.target.value)}
          disabled={props.disabled}
          class="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="flex flex-col gap-2">
        <label class="font-medium">End Time</label>
        <input
          type="datetime-local"
          value={endDate()}
          onInput={(e) => setEndDate(e.target.value)}
          disabled={props.disabled}
          class="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
};

export default TimeRangeSelector;
