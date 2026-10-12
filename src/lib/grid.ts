export interface GridSize {
  readonly cols: number
  readonly rows: number
}

const CARD_TARGET_HEIGHT = 276
const GRID_GAP = 14
const MIN_CARD_WIDTH = 285
const MAX_COLS = 4

export function getGridSize(width: number, height: number, siteCount: number): GridSize {
  const fittedCols = Math.max(
    1,
    Math.min(MAX_COLS, Math.floor((width + GRID_GAP) / (MIN_CARD_WIDTH + GRID_GAP))),
  )
  const fittedRows = Math.max(1, Math.floor((height + GRID_GAP) / (CARD_TARGET_HEIGHT + GRID_GAP)))

  const preferredCols = siteCount <= 4 ? 2 : 3
  const useCompactGrid =
    siteCount > 0 && siteCount <= 6 && fittedCols >= preferredCols && fittedRows >= 2

  return {
    cols: useCompactGrid ? preferredCols : fittedCols,
    rows: useCompactGrid ? 2 : fittedRows,
  }
}
