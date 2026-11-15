const CLOSE_DELAY: number = 150

export function closeOnMouseLeave(node: HTMLDetailsElement): { destroy: () => void } {
  let closeTimer: ReturnType<typeof setTimeout> | undefined
  const isPickerOpen: boolean = CSS.supports('selector(select:open)')

  function cancelClose(): void {
    clearTimeout(closeTimer)
    closeTimer = undefined
  }

  function close(): void {
    closeTimer = undefined
    if (!node.open) return
    if (isPickerOpen && node.querySelector('select:open')) {
      closeTimer = setTimeout(close, CLOSE_DELAY)
      return
    }
    node.open = false
  }

  function scheduleClose(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || !node.open) return
    cancelClose()
    closeTimer = setTimeout(close, CLOSE_DELAY)
  }

  node.addEventListener('pointerenter', cancelClose)
  node.addEventListener('pointerleave', scheduleClose)

  return {
    destroy(): void {
      cancelClose()
      node.removeEventListener('pointerenter', cancelClose)
      node.removeEventListener('pointerleave', scheduleClose)
    },
  }
}
