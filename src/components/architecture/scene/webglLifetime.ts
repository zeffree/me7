export function bindContextLifecycle(canvas: EventTarget, reportFailure: (message: string) => void): () => void {
  let lost = false;
  let disposed = false;
  const onLost = (event: Event) => {
    if (disposed) return;
    event.preventDefault();
    if (lost) return;
    lost = true;
    reportFailure('The browser lost the 3D graphics context. Continue in the interactive 2D architecture, or use Retry 3D to create a fresh view.');
  };
  const onRestored = () => {
    if (!disposed && lost) {
      reportFailure('Graphics support is available again. The 2D architecture remains usable; choose Retry 3D when you are ready.');
    }
  };
  canvas.addEventListener('webglcontextlost', onLost, false);
  canvas.addEventListener('webglcontextrestored', onRestored, false);
  return () => {
    disposed = true;
    canvas.removeEventListener('webglcontextlost', onLost);
    canvas.removeEventListener('webglcontextrestored', onRestored);
  };
}
