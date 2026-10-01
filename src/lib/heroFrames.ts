/**
 * Hero frame manifest.
 * 84 frames extracted from ezgif-3b18cdca5ab192d9-jpg.zip
 * Filenames: ezgif-frame-001.jpg → ezgif-frame-084.jpg
 */

export const HERO_FRAME_COUNT = 84;

/** Zero-padded 3-digit index → public URL */
export function getFrameUrl(index: number): string {
  const pad = String(index + 1).padStart(3, "0");
  return `/hero-frames/ezgif-frame-${pad}.jpg`;
}

/** All frame URLs in order */
export const FRAME_URLS: string[] = Array.from(
  { length: HERO_FRAME_COUNT },
  (_, i) => getFrameUrl(i)
);

/**
 * Scroll distance in vh units for the pinned hero.
 * The first 300vh of the pinned range drives the frame sequence + intro
 * phases; the remaining ~130vh is the "Our Impact" ember stage.
 */
export const HERO_SCROLL_VH = 480;
