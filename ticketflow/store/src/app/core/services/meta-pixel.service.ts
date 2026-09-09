import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

/** Standard Meta Pixel event names supported by TicketFlow */
export type MetaPixelEvent =
  | 'PageView'
  | 'ViewContent'
  | 'InitiateCheckout'
  | 'Purchase'
  | 'AddToCart';

export interface MetaPixelParams {
  content_name?: string;
  content_category?: string;
  content_type?: string;
  content_ids?: string[];
  value?: number;
  currency?: string;
  num_items?: number;
}

/** Augment the global window to include fbq */
declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

/**
 * MetaPixelService — dynamically loads a Meta (Facebook) Pixel per artist.
 *
 * Each artist can configure their own Pixel ID in their Admin profile.
 * The Store app calls this service when loading an event page and fires
 * standard conversion events (ViewContent, InitiateCheckout, Purchase).
 *
 * If no Pixel ID is configured, this service is a no-op — zero impact.
 */
@Injectable({ providedIn: 'root' })
export class MetaPixelService {
  private readonly document = inject(DOCUMENT);

  private activePixelId: string | null = null;
  private readonly SCRIPT_ID = 'tf-meta-pixel-sdk';
  private readonly NOSCRIPT_ID = 'tf-meta-pixel-noscript';

  /**
   * Load the Meta Pixel for a given Pixel ID.
   * Safe to call multiple times — it will skip re-injection if the same
   * pixel is already loaded, or cleanly swap to a new pixel if different.
   */
  load(pixelId: string | null | undefined): void {
    if (!pixelId || typeof window === 'undefined') return;

    // Already loaded for the same artist — nothing to do
    if (this.activePixelId === pixelId) {
      this.track('PageView');
      return;
    }

    // Different artist: clean up previous pixel first
    if (this.activePixelId) {
      this.unload();
    }

    this.activePixelId = pixelId;
    this.injectScript(pixelId);
  }

  /**
   * Fire a standard Meta Pixel event.
   * Safe to call even if no pixel is loaded — will silently no-op.
   */
  track(event: MetaPixelEvent, params?: MetaPixelParams): void {
    if (typeof window === 'undefined' || !window.fbq || !this.activePixelId) return;
    if (params) {
      window.fbq('track', event, params);
    } else {
      window.fbq('track', event);
    }
  }

  /**
   * Remove the pixel script and reset fbq.
   * Called when navigating between events from different artists.
   */
  unload(): void {
    this.activePixelId = null;

    // Remove injected script tags
    const script = this.document.getElementById(this.SCRIPT_ID);
    if (script) script.remove();
    const noscript = this.document.getElementById(this.NOSCRIPT_ID);
    if (noscript) noscript.remove();

    // Reset fbq so the next init() starts fresh
    if (typeof window !== 'undefined') {
      delete window.fbq;
      delete window._fbq;
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private injectScript(pixelId: string): void {
    const doc = this.document;
    const head = doc.head || doc.getElementsByTagName('head')[0];

    // Inline Meta Pixel base code (minimized)
    const script = doc.createElement('script');
    script.id = this.SCRIPT_ID;
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = this.buildPixelSnippet(pixelId);
    head.appendChild(script);

    // <noscript> fallback img
    const noscript = doc.createElement('noscript');
    noscript.id = this.NOSCRIPT_ID;
    const img = doc.createElement('img');
    img.height = 1;
    img.width = 1;
    img.style.display = 'none';
    img.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`;
    noscript.appendChild(img);
    head.appendChild(noscript);
  }

  private buildPixelSnippet(pixelId: string): string {
    // Standard Meta Pixel base code (from Meta documentation)
    // eslint-disable-next-line max-len
    return `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`;
  }
}
