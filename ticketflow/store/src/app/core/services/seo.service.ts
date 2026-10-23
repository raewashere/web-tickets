import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface SeoConfig {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: 'website' | 'event';
  noindex?: boolean;
  canonicalUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly doc = inject(DOCUMENT);

  private readonly siteUrl = 'https://boletocoqueto.com';
  private readonly defaultTitle =
    'BoletoCoqueto — Tus Conciertos y Festivales Favoritos, Sin Intermediarios';
  private readonly defaultDescription =
    'Compra boletos oficiales directo de tus artistas favoritos en menos de un minuto y sin crear cuenta. Acceso inmediato con código QR antifraude y pagos protegidos por PayPal.';

  /** Initialize automatic SEO tracking based on Angular Router route data */
  initAutoTracking(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        let route = this.activatedRoute;
        while (route.firstChild) {
          route = route.firstChild;
        }

        const data = route.snapshot.data;
        const title = data['title'] || undefined;
        const description = data['description'] || this.defaultDescription;
        const keywords = data['keywords'] || undefined;
        const noindex = Boolean(data['noindex']);

        // Clear route-specific JSON-LD before component potentially sets a new one
        this.setJsonLd(null);

        this.updateTags({
          title,
          description,
          keywords,
          noindex,
          type: 'website',
        });
      });
  }

  /** Explicitly update SEO metadata for a specific page */
  updateTags(config: SeoConfig): void {
    const fullTitle = config.title
      ? `${config.title} | BoletoCoqueto`
      : this.defaultTitle;
    const desc = config.description || this.defaultDescription;
    const ogType = config.type || 'website';
    const robotsContent = config.noindex ? 'noindex, nofollow' : 'index, follow';

    const cleanPath = this.router.url.split('?')[0].split('#')[0] || '/';
    const canonical =
      config.canonicalUrl ||
      `${this.siteUrl}${cleanPath === '/' ? '/' : cleanPath}`;

    this.titleService.setTitle(fullTitle);

    this.metaService.updateTag({ name: 'description', content: desc });
    this.metaService.updateTag({ name: 'robots', content: robotsContent });

    if (config.keywords) {
      this.metaService.updateTag({ name: 'keywords', content: config.keywords });
    }

    this.metaService.updateTag({ property: 'og:type', content: ogType });
    this.metaService.updateTag({ property: 'og:site_name', content: 'BoletoCoqueto' });
    this.metaService.updateTag({ property: 'og:locale', content: 'es_MX' });
    this.metaService.updateTag({ property: 'og:url', content: canonical });
    this.metaService.updateTag({ property: 'og:title', content: fullTitle });
    this.metaService.updateTag({ property: 'og:description', content: desc });

    this.metaService.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.metaService.updateTag({ name: 'twitter:title', content: fullTitle });
    this.metaService.updateTag({ name: 'twitter:description', content: desc });

    if (config.image) {
      this.metaService.updateTag({ property: 'og:image', content: config.image });
      this.metaService.updateTag({ name: 'twitter:image', content: config.image });
    } else {
      this.metaService.removeTag('property="og:image"');
      this.metaService.removeTag('name="twitter:image"');
    }

    this.updateCanonicalLink(canonical);
  }

  /** Inject or remove dynamic Schema.org JSON-LD structured data */
  setJsonLd(schema: Record<string, unknown> | null): void {
    const scriptId = 'seo-dynamic-json-ld';
    const existing = this.doc.getElementById(scriptId);

    if (!schema) {
      if (existing) {
        existing.remove();
      }
      return;
    }

    const scriptEl =
      (existing as HTMLScriptElement | null) ||
      this.doc.createElement('script');
    scriptEl.id = scriptId;
    scriptEl.type = 'application/ld+json';
    scriptEl.text = JSON.stringify(schema);

    if (!existing) {
      this.doc.head.appendChild(scriptEl);
    }
  }

  private updateCanonicalLink(url: string): void {
    let link: HTMLLinkElement | null = this.doc.querySelector(
      'link[rel="canonical"]'
    );
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
