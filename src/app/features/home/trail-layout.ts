/** Keep readable cards; rows are a responsive trail, independent of journey weeks. */
export function trailColumns(width: number) {
  return width >= 1280
    ? 5
    : width >= 950
      ? 4
      : width >= 680
        ? 3
        : width >= 520
          ? 2
          : 1;
}
export function trailPlacement(index: number, count: number, columns: number) {
  const row = Math.floor(index / columns),
    within = index % columns;
  const lastCount = count % columns || columns;
  const centered =
    row === Math.floor((count - 1) / columns)
      ? Math.floor((columns - lastCount) / 2)
      : 0;
  const column =
    row % 2 === 0 ? centered + within + 1 : columns - centered - within;
  return {
    row: row + 1,
    column,
    offset: columns === 1 ? 0 : [0, 18, 6, 26, 10][within],
  };
}
