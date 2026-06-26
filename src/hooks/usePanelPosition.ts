import { type RefObject, useEffect } from 'react';
import { EDGE_GAP, STORAGE_KEYS } from '../shared/constants';
import { safeJsonGet, safeJsonSet } from '../shared/storage';

interface SavedPanelPosition {
  left?: number;
  top?: number;
  leftRatio?: number;
  topRatio?: number;
}

function viewportSize() {
  const doc = document.documentElement;
  return {
    width: window.innerWidth || doc.clientWidth || 0,
    height: window.innerHeight || doc.clientHeight || 0
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function usePanelPosition(
  panelRef: RefObject<HTMLDivElement | null>,
  headerRef: RefObject<HTMLDivElement | null>
) {
  const getPanelTravel = (panel: HTMLDivElement) => {
    const rect = panel.getBoundingClientRect();
    const viewport = viewportSize();
    return {
      rect,
      viewport,
      maxLeft: Math.max(EDGE_GAP, viewport.width - rect.width - EDGE_GAP),
      maxTop: Math.max(EDGE_GAP, viewport.height - rect.height - EDGE_GAP)
    };
  };

  const clampPanelPosition = (panel: HTMLDivElement, left: number, top: number) => {
    const travel = getPanelTravel(panel);
    return {
      left: clamp(left, EDGE_GAP, travel.maxLeft),
      top: clamp(top, EDGE_GAP, travel.maxTop)
    };
  };

  const savePanelPosition = (panel: HTMLDivElement, left: number, top: number) => {
    const next = clampPanelPosition(panel, left, top);
    const travel = getPanelTravel(panel);
    const xRange = Math.max(1, travel.maxLeft - EDGE_GAP);
    const yRange = Math.max(1, travel.maxTop - EDGE_GAP);
    safeJsonSet(STORAGE_KEYS.panelPosition, {
      left: next.left,
      top: next.top,
      leftRatio: clamp((next.left - EDGE_GAP) / xRange, 0, 1),
      topRatio: clamp((next.top - EDGE_GAP) / yRange, 0, 1)
    });
  };

  const placePanel = (panel: HTMLDivElement, left: number, top: number, shouldSave = false) => {
    const next = clampPanelPosition(panel, left, top);
    panel.style.left = `${next.left}px`;
    panel.style.top = `${next.top}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    if (shouldSave) savePanelPosition(panel, next.left, next.top);
  };

  const placePanelBySaved = (panel: HTMLDivElement, saved: SavedPanelPosition | null, shouldSave = false) => {
    if (saved && Number.isFinite(saved.leftRatio) && Number.isFinite(saved.topRatio)) {
      const travel = getPanelTravel(panel);
      const left = EDGE_GAP + Number(saved.leftRatio) * Math.max(1, travel.maxLeft - EDGE_GAP);
      const top = EDGE_GAP + Number(saved.topRatio) * Math.max(1, travel.maxTop - EDGE_GAP);
      placePanel(panel, left, top, shouldSave);
      return;
    }

    if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) {
      placePanel(panel, Number(saved.left), Number(saved.top), shouldSave);
      return;
    }

    const viewport = viewportSize();
    const rect = panel.getBoundingClientRect();
    placePanel(panel, viewport.width - rect.width - 16, viewport.height - rect.height - 16, shouldSave);
  };

  const clampCurrentPanel = (shouldSave = false) => {
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    placePanel(panel, rect.left, rect.top, shouldSave);
  };

  useEffect(() => {
    const panel = panelRef.current;
    const header = headerRef.current;
    if (!panel || !header) return;

    requestAnimationFrame(() => placePanelBySaved(panel, safeJsonGet<SavedPanelPosition | null>(STORAGE_KEYS.panelPosition, null), true));

    let dragging = false;
    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    const onPointerDown = (event: PointerEvent) => {
      if ((event.target as HTMLElement).closest('button, textarea, input, label')) return;
      dragging = true;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      const rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      header.setPointerCapture(pointerId);
      event.preventDefault();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      placePanel(panel, startLeft + event.clientX - startX, startTop + event.clientY - startY, false);
    };

    const end = () => {
      if (!dragging) return;
      dragging = false;
      try {
        if (pointerId !== null) header.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
      pointerId = null;
      clampCurrentPanel(true);
    };

    const onResize = () => placePanelBySaved(panel, safeJsonGet<SavedPanelPosition | null>(STORAGE_KEYS.panelPosition, null), false);

    header.addEventListener('pointerdown', onPointerDown);
    header.addEventListener('pointermove', onPointerMove);
    header.addEventListener('pointerup', end);
    header.addEventListener('pointercancel', end);
    window.addEventListener('resize', onResize, { passive: true });
    window.visualViewport?.addEventListener('resize', onResize, { passive: true });

    return () => {
      header.removeEventListener('pointerdown', onPointerDown);
      header.removeEventListener('pointermove', onPointerMove);
      header.removeEventListener('pointerup', end);
      header.removeEventListener('pointercancel', end);
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, [panelRef, headerRef]);

  return { clampCurrentPanel };
}
