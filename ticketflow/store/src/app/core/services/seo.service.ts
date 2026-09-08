import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface SeoConfig {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly metaService = inject(Meta);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  private readonly defaultTitle = 'TicketFlow — Tu Entrada a los Mejores Conciertos y Festivales';
  private readonly defaultDescription =
    'Compra boletos para tus conciertos, festivales y eventos favoritos de forma rápida, segura y directa con TicketFlow. Entradas 100% garantizadas.';

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
        const title = data['title'] || this.defaultTitle;
        const description = data['description'] || this.defaultDescription;

        this.updateTags({ title, description });
      });
  }

  /** Explicitly update SEO metadata for a specific page */
  updateTags(config: SeoConfig): void {
    const fullTitle = config.title
      ? `${config.title} | TicketFlow`
      : this.defaultTitle;
    const desc = config.description || this.defaultDescription;

    this.titleService.setTitle(fullTitle);

    this.metaService.updateTag({ name: 'description', content: desc });
    this.metaService.updateTag({ property: 'og:title', content: fullTitle });
    this.metaService.updateTag({ property: 'og:description', content: desc });
    this.metaService.updateTag({ name: 'twitter:title', content: fullTitle });
    this.metaService.updateTag({ name: 'twitter:description', content: desc });

    if (config.image) {
      this.metaService.updateTag({ property: 'og:image', content: config.image });
      this.metaService.updateTag({ name: 'twitter:image', content: config.image });
    }
  }
}
