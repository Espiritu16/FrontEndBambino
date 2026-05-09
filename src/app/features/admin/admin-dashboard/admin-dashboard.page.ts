import { Component } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  templateUrl: './admin-dashboard.page.html',
  styleUrl: './admin-dashboard.page.scss'
})
export class AdminDashboardPageComponent {
  protected readonly kpis = [
    { label: 'Pedidos hoy', value: '84', trend: '+12%' },
    { label: 'Pagos pendientes', value: '09', trend: '-3%' },
    { label: 'Comprobantes emitidos', value: '71', trend: '+8%' },
    { label: 'Incidencias cocina', value: '04', trend: '-1%' }
  ];
}
