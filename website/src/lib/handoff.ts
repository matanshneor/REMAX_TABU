/**
 * "The photo opens": when a listing is pressed, its page shows the very photo that was pressed
 * (already loaded, at the size the card used) while the fresh details arrive. The browser holds
 * the pressed photo here for a few seconds; nothing is stored beyond that, and nothing on the server.
 */
type Hit = { id: string; src: string; at: number };

let last: Hit | null = null;

const FRESH_MS = 5000;

/** Remember the photo of the listing that was just pressed. */
export function stashPhoto(id: string, src: string | undefined | null) {
  if (src) last = { id, src, at: Date.now() };
}

/** The photo pressed a moment ago (of this listing, when an id is given), or null. */
export function pressedPhoto(id?: string): Hit | null {
  if (!last || Date.now() - last.at > FRESH_MS) return null;
  return !id || last.id === id ? last : null;
}

/** The shared name that ties a listing's photo on a card to the same photo on its page. */
export const photoName = (id: string) => `photo-${id}`;
