import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';

interface AdminNavItem {
  label: string;
  icon: string;
  to: string;
  exact?: boolean;
}

@Component({
  selector: 'app-admin-layout-page',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ConfirmModalComponent],
  templateUrl: './admin-layout.page.html',
  styleUrl: './admin-layout.page.scss'
})
export class AdminLayoutPageComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authStorageKey = 'bambino_basic_auth';
  private readonly userNameStorageKey = 'bambino_user_name';
  private readonly userRoleStorageKey = 'bambino_user_role';

  protected userFullName = 'Administrador';
  protected userEmail = 'admin@bambino.com';
  protected confirmAction: 'home' | 'logout' | null = null;
  protected commercialOpen = false;
  protected webOpen = false;

  protected readonly navItems: AdminNavItem[] = [
    { label: 'Pedidos', icon: 'receipt_long', to: '/admin/pedidos' },
    { label: 'Pagos', icon: 'payments', to: '/admin/pagos' },
    { label: 'Comprobantes', icon: 'description', to: '/admin/comprobantes' },
    { label: 'Empresa', icon: 'apartment', to: '/admin/empresa' },
    { label: 'Configuración', icon: 'tune', to: '/admin/configuracion' },
    { label: 'Usuarios y Roles', icon: 'group', to: '/admin/usuarios' },
    { label: 'Logs', icon: 'bug_report', to: '/admin/logs' },
    { label: 'Auditoría', icon: 'policy', to: '/admin/auditoria' }
  ];

  ngOnInit(): void {
    const storedName = localStorage.getItem(this.userNameStorageKey)?.trim();
    if (storedName) this.userFullName = storedName;

    const token = localStorage.getItem(this.authStorageKey);
    if (token) {
      try {
        const decoded = atob(token);
        const email = decoded.split(':')[0]?.trim();
        if (email) this.userEmail = email;
      } catch {
        // noop
      }
    }
    this.commercialOpen = this.router.url.startsWith('/admin/comercial');
    this.webOpen = this.router.url.startsWith('/admin/web');
  }

  protected toggleCommercialMenu(): void {
    this.commercialOpen = !this.commercialOpen;
  }

  protected toggleWebMenu(): void {
    this.webOpen = !this.webOpen;
  }

  protected openConfirm(action: 'home' | 'logout'): void {
    this.confirmAction = action;
  }

  protected closeConfirm(): void {
    this.confirmAction = null;
  }

  protected async confirmCurrentAction(): Promise<void> {
    if (!this.confirmAction) return;
    const action = this.confirmAction;
    this.confirmAction = null;
    if (action === 'home') {
      await this.router.navigate(['/inicio']);
      return;
    }
    localStorage.removeItem(this.authStorageKey);
    localStorage.removeItem(this.userNameStorageKey);
    localStorage.removeItem(this.userRoleStorageKey);
    await this.router.navigate(['/inicio']);
  }
}
