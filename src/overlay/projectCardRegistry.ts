/**
 * The 3D scene positions the HTML project cards every frame (no React renders):
 * cards register their elements here; ProjectTowers writes transform/opacity.
 */
export const projectCardEls: (HTMLElement | null)[] = []
/** Card layout width in CSS px before scaling (aspect 16:10). */
export const CARD_BASE_W = 560
