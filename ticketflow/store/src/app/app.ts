import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from './shared/layout/navbar.component';
import { FooterComponent } from './shared/layout/footer.component';
import { SeoService } from './core/services/seo.service';
import { ToastContainerComponent } from '@ticketflow/shared-ui';

@Component({
  imports: [RouterModule, NavbarComponent, FooterComponent, ToastContainerComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  protected title = 'store';
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.initAutoTracking();
  }
}
