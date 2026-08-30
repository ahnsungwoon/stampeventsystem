export const FLOORS = [
  { value: 'B1', label: 'B1층' },
  { value: '1',  label: '1층' },
  { value: '2',  label: '2층' },
  { value: '3',  label: '3층' },
];

export const FLOOR_VALUES = FLOORS.map(f => f.value);

export function floorLabel(value) {
  return FLOORS.find(f => f.value === value)?.label ?? `${value}층`;
}
