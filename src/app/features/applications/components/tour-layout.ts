export type TourArrowDirection = "left" | "right" | "up" | "down";
export interface TourViewport {
  width: number;
  height: number;
  left: number;
  top: number;
}
export function readTourViewport(): TourViewport {
  const viewport = window.visualViewport;
  return {
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
    left: viewport?.offsetLeft ?? 0,
    top: viewport?.offsetTop ?? 0,
  };
}

/** Uses the measured card height and the visible viewport, including an open mobile keyboard. */
export function placeTourCard(
  target: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    width: number;
    height: number;
  },
  viewport: TourViewport,
  cardHeight: number,
  edge = false,
) {
  const margin = 12,
    gap = 12;
  const width = Math.min(280, Math.max(180, viewport.width - (edge ? 80 : 24)));
  const height = Math.min(
    cardHeight,
    Math.max(80, viewport.height - margin * 2),
  );
  const minX = viewport.left + margin,
    maxX = Math.max(minX, viewport.left + viewport.width - width - margin);
  const minY = viewport.top + margin,
    maxY = Math.max(minY, viewport.top + viewport.height - height - margin);
  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));
  const centerX = target.left + target.width / 2,
    centerY = target.top + target.height / 2;
  if (edge) {
    const right = target.left < viewport.left + viewport.width / 2;
    const top = clamp(centerY - height / 2, minY, maxY);
    return {
      top,
      left: clamp(
        right ? target.right + gap : target.left - width - gap,
        minX,
        maxX,
      ),
      width,
      arrowDir: (right ? "left" : "right") as TourArrowDirection,
      arrowOffset: clamp(centerY - top, 18, height - 18),
    };
  }
  const below = viewport.top + viewport.height - target.bottom - margin;
  const above = target.top - viewport.top - margin;
  const useBelow =
    below >= height + gap || (above < height + gap && below >= above);
  const top = clamp(
    useBelow ? target.bottom + gap : target.top - height - gap,
    minY,
    maxY,
  );
  const left = clamp(centerX - width / 2, minX, maxX);
  return {
    top,
    left,
    width,
    arrowDir: (useBelow ? "up" : "down") as TourArrowDirection,
    arrowOffset: clamp(centerX - left, 20, width - 20),
  };
}
