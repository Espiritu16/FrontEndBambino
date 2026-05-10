import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, timeout } from 'rxjs';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ToastService } from '../../../shared/services/toast.service';

type UsuarioResponse = {
  idUsuario: number;
  uuidUsuario: string;
  email: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
  rol: string;
  fechaCreacion: string;
  fechaActualizacion: string;
};

type RolResponse = {
  idRol: number;
  nombre: string;
  descripcion: string | null;
};

type RolChip = {
  key: string;
  label: string;
};

@Component({
  selector: 'app-admin-usuarios-page',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './admin-usuarios.page.html',
  styleUrl: './admin-usuarios.page.scss'
})
export class AdminUsuariosPageComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly apiBase = 'http://localhost:8080/api/admin/seguridad/usuarios';
  private readonly authStorageKey = 'bambino_basic_auth';

  protected loading = false;
  protected error = '';
  protected usuarios: UsuarioResponse[] = [];
  protected roles: RolResponse[] = [];
  protected roleChips: RolChip[] = [{ key: '', label: 'Todo' }];
  protected filtroRol = '';
  protected savingByUserId = new Set<number>();
  protected showEditModal = false;
  protected showCreateModal = false;
  protected editTarget: UsuarioResponse | null = null;
  protected createSaving = false;
  protected editSaving = false;
  protected editTouched = { email: false, nombres: false, apellidos: false, rol: false, estado: false };
  protected editErrors = { email: '', nombres: '', apellidos: '', rol: '', estado: '' };
  protected createTouched = { email: false, nombres: false, apellidos: false, rol: false, password: false };
  protected createErrors = { email: '', nombres: '', apellidos: '', rol: '', password: '' };
  protected readonly internalRoles = ['ADMIN', 'COCINA'];
  protected editForm = {
    uuidUsuario: '',
    rol: '',
    estado: 'ACTIVO' as 'ACTIVO' | 'INACTIVO',
    email: '',
    nombres: '',
    apellidos: '',
    telefono: ''
  };
  protected createForm = {
    email: '',
    password: '',
    nombres: '',
    apellidos: '',
    telefono: '',
    rol: 'COCINA'
  };

  protected rolDraftByUserId: Record<number, string> = {};
  protected estadoDraftByUserId: Record<number, 'ACTIVO' | 'INACTIVO'> = {};

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  protected get usuariosFiltrados(): UsuarioResponse[] {
    if (!this.filtroRol) return this.usuarios;
    return this.usuarios.filter((u) => (u.rol || '').toUpperCase() === this.filtroRol.toUpperCase());
  }

  protected rolLabel(rol: string): string {
    const r = (rol || '').toUpperCase();
    if (r === 'ADMIN') return 'Administrador';
    if (r === 'COCINA') return 'Cocinero';
    if (r === 'CLIENTE') return 'Cliente';
    return rol;
  }

  protected setFiltroRol(rol: string): void {
    this.filtroRol = rol;
  }

  protected canAssignRol(usuario: UsuarioResponse, rolDestino: string): boolean {
    const actual = (usuario.rol || '').toUpperCase();
    const destino = (rolDestino || '').toUpperCase();
    if (actual === 'CLIENTE' && (destino === 'ADMIN' || destino === 'COCINA')) {
      return false;
    }
    return true;
  }

  protected canEditUsuario(usuario: UsuarioResponse): boolean {
    const rol = (usuario.rol || '').toUpperCase();
    return rol === 'ADMIN' || rol === 'COCINA';
  }

  protected estaGuardando(idUsuario: number): boolean {
    return this.savingByUserId.has(idUsuario);
  }

  protected openEditModal(usuario: UsuarioResponse): void {
    if (!this.canEditUsuario(usuario)) {
      this.toast.warning('No se permite editar un usuario cliente desde este módulo.');
      return;
    }
    this.editTarget = usuario;
    this.editForm = {
      uuidUsuario: usuario.uuidUsuario ?? '',
      rol: usuario.rol ?? '',
      estado: usuario.estado ?? 'ACTIVO',
      email: usuario.email ?? '',
      nombres: usuario.nombres ?? '',
      apellidos: usuario.apellidos ?? '',
      telefono: usuario.telefono ?? ''
    };
    this.showEditModal = true;
    this.editTouched = { email: false, nombres: false, apellidos: false, rol: false, estado: false };
    this.editErrors = { email: '', nombres: '', apellidos: '', rol: '', estado: '' };
  }

  protected closeEditModal(): void {
    if (this.editSaving) return;
    this.showEditModal = false;
    this.editTarget = null;
    this.editTouched = { email: false, nombres: false, apellidos: false, rol: false, estado: false };
    this.editErrors = { email: '', nombres: '', apellidos: '', rol: '', estado: '' };
    this.editForm = {
      uuidUsuario: '',
      rol: '',
      estado: 'ACTIVO',
      email: '',
      nombres: '',
      apellidos: '',
      telefono: ''
    };
  }

  protected openCreateModal(): void {
    this.createForm = { email: '', password: '', nombres: '', apellidos: '', telefono: '', rol: 'COCINA' };
    this.createTouched = { email: false, nombres: false, apellidos: false, rol: false, password: false };
    this.createErrors = { email: '', nombres: '', apellidos: '', rol: '', password: '' };
    this.showCreateModal = true;
  }

  protected closeCreateModal(): void {
    if (this.createSaving) return;
    this.showCreateModal = false;
  }

  protected async guardarEdicion(): Promise<void> {
    if (!this.editTarget || this.editSaving) return;
    const u = this.editTarget;
    if (!this.canEditUsuario(u)) {
      this.toast.warning('No se permite editar un usuario cliente desde este módulo.');
      return;
    }

    const email = (this.editForm.email || '').trim().toLowerCase();
    const nombres = (this.editForm.nombres || '').trim();
    const apellidos = (this.editForm.apellidos || '').trim();
    const telefono = (this.editForm.telefono || '').trim();
    const telOrNull = telefono ? telefono : null;

    if (!this.validarFormularioEdicion()) {
      this.editTouched = { email: true, nombres: true, apellidos: true, rol: true, estado: true };
      this.toast.warning('Corrige los campos resaltados en rojo.');
      return;
    }
    const rolNuevo = (this.editForm.rol || '').trim().toUpperCase();
    const estadoNuevo = (this.editForm.estado || 'ACTIVO').toUpperCase() as 'ACTIVO' | 'INACTIVO';

    if (
      email === (u.email || '').trim().toLowerCase() &&
      nombres === (u.nombres || '').trim() &&
      apellidos === (u.apellidos || '').trim() &&
      (u.telefono || null) === telOrNull &&
      rolNuevo === (u.rol || '').toUpperCase() &&
      estadoNuevo === (u.estado || '').toUpperCase()
    ) {
      this.toast.info('No hay cambios para guardar en este usuario.');
      return;
    }

    this.editSaving = true;
    try {
      if (rolNuevo !== (u.rol || '').toUpperCase()) {
        const updatedRol = await firstValueFrom(
          this.http.patch<UsuarioResponse>(`${this.apiBase}/${u.idUsuario}/rol`, { rol: rolNuevo }, { headers: this.authHeaders() }).pipe(timeout(10000))
        );
        u.rol = updatedRol.rol;
      }

      if (estadoNuevo !== (u.estado || '').toUpperCase()) {
        const updatedEstado = await firstValueFrom(
          this.http.patch<UsuarioResponse>(`${this.apiBase}/${u.idUsuario}/estado`, { estado: estadoNuevo }, { headers: this.authHeaders() }).pipe(timeout(10000))
        );
        u.estado = updatedEstado.estado as 'ACTIVO' | 'INACTIVO';
      }

      if (
        email !== (u.email || '').trim().toLowerCase() ||
        nombres !== (u.nombres || '').trim() ||
        apellidos !== (u.apellidos || '').trim() ||
        (u.telefono || null) !== telOrNull
      ) {
        const updatedDatos = await firstValueFrom(
          this.http.patch<UsuarioResponse>(
            `${this.apiBase}/${u.idUsuario}`,
            { email, nombres, apellidos, telefono: telOrNull },
            { headers: this.authHeaders() }
          ).pipe(timeout(10000))
        );
        u.email = updatedDatos.email;
        u.nombres = updatedDatos.nombres;
        u.apellidos = updatedDatos.apellidos;
        u.telefono = updatedDatos.telefono;
      }
      this.toast.success('Datos del usuario actualizados.');
      this.closeEditModal();
    } catch (e: any) {
      const msg = e?.error?.mensaje || 'No se pudo actualizar datos del usuario.';
      this.toast.error(msg);
    } finally {
      this.editSaving = false;
    }
  }

  protected async guardarCreacion(): Promise<void> {
    if (this.createSaving) return;
    if (!this.validarFormularioCreacion()) {
      this.createTouched = { email: true, nombres: true, apellidos: true, rol: true, password: true };
      this.toast.warning('Corrige los campos resaltados en rojo.');
      return;
    }

    const payload = {
      email: this.createForm.email.trim().toLowerCase(),
      password: this.createForm.password.trim(),
      nombres: this.createForm.nombres.trim(),
      apellidos: this.createForm.apellidos.trim(),
      telefono: (this.createForm.telefono || '').trim() || null,
      rol: this.createForm.rol.trim().toUpperCase()
    };

    this.createSaving = true;
    try {
      const created = await firstValueFrom(
        this.http.post<UsuarioResponse>(this.apiBase, payload, { headers: this.authHeaders() }).pipe(timeout(10000))
      );
      this.usuarios = [created, ...this.usuarios];
      this.toast.success('Usuario creado correctamente.');
      this.closeCreateModal();
    } catch (e: any) {
      const msg = e?.error?.mensaje || 'No se pudo crear el usuario.';
      this.toast.error(msg);
    } finally {
      this.createSaving = false;
    }
  }

  protected markTouched(field: keyof typeof this.editTouched): void {
    this.editTouched[field] = true;
    this.validarFormularioEdicion();
  }

  protected fieldInvalid(field: keyof typeof this.editErrors): boolean {
    return !!this.editErrors[field] && this.editTouched[field];
  }

  protected markCreateTouched(field: keyof typeof this.createTouched): void {
    this.createTouched[field] = true;
    this.validarFormularioCreacion();
  }

  protected createFieldInvalid(field: keyof typeof this.createErrors): boolean {
    return !!this.createErrors[field] && this.createTouched[field];
  }

  private validarFormularioEdicion(): boolean {
    const email = (this.editForm.email || '').trim().toLowerCase();
    const nombres = (this.editForm.nombres || '').trim();
    const apellidos = (this.editForm.apellidos || '').trim();
    const rol = (this.editForm.rol || '').trim().toUpperCase();
    const estado = (this.editForm.estado || '').trim().toUpperCase();

    this.editErrors.email = !email
      ? 'Correo obligatorio.'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? 'Correo inválido.'
        : '';
    this.editErrors.nombres = !nombres ? 'Nombres obligatorios.' : '';
    this.editErrors.apellidos = !apellidos ? 'Apellidos obligatorios.' : '';
    this.editErrors.rol = this.internalRoles.includes(rol) ? '' : 'Rol inválido.';
    this.editErrors.estado = estado === 'ACTIVO' || estado === 'INACTIVO' ? '' : 'Estado inválido.';

    return Object.values(this.editErrors).every((e) => !e);
  }

  private validarFormularioCreacion(): boolean {
    const email = (this.createForm.email || '').trim().toLowerCase();
    const nombres = (this.createForm.nombres || '').trim();
    const apellidos = (this.createForm.apellidos || '').trim();
    const rol = (this.createForm.rol || '').trim().toUpperCase();
    const password = (this.createForm.password || '').trim();

    this.createErrors.email = !email
      ? 'Correo obligatorio.'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? 'Correo inválido.'
        : '';
    this.createErrors.nombres = !nombres ? 'Nombres obligatorios.' : '';
    this.createErrors.apellidos = !apellidos ? 'Apellidos obligatorios.' : '';
    this.createErrors.rol = this.internalRoles.includes(rol) ? '' : 'Rol inválido.';
    this.createErrors.password = password.length >= 8 ? '' : 'Password mínimo 8 caracteres.';

    return Object.values(this.createErrors).every((e) => !e);
  }

  private async loadData(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const [usuariosResult, rolesResult] = await Promise.allSettled([
        firstValueFrom(this.http.get<UsuarioResponse[]>(this.apiBase, { headers: this.authHeaders() }).pipe(timeout(10000))),
        firstValueFrom(this.http.get<RolResponse[]>(`${this.apiBase}/roles`, { headers: this.authHeaders() }).pipe(timeout(10000)))
      ]);

      if (usuariosResult.status === 'fulfilled') {
        this.usuarios = usuariosResult.value ?? [];
      } else {
        this.usuarios = [];
        const cause: any = usuariosResult.reason;
        this.error = cause?.error?.mensaje || 'No se pudo cargar usuarios.';
      }

      if (rolesResult.status === 'fulfilled') {
        this.roles = rolesResult.value ?? [];
        const order: Record<string, number> = { ADMIN: 1, COCINA: 2, CLIENTE: 3 };
        this.roles.sort((a, b) => {
          const ao = order[(a.nombre || '').toUpperCase()] ?? 99;
          const bo = order[(b.nombre || '').toUpperCase()] ?? 99;
          if (ao !== bo) return ao - bo;
          return (a.nombre || '').localeCompare(b.nombre || '');
        });
        this.roleChips = [
          { key: '', label: 'Todo' },
          ...this.roles.map((r) => ({ key: r.nombre, label: this.rolLabel(r.nombre) }))
        ];
      } else {
        this.roles = [];
        this.roleChips = [{ key: '', label: 'Todo' }];
        const cause: any = rolesResult.reason;
        this.error = this.error || cause?.error?.mensaje || 'No se pudo cargar roles.';
      }

      for (const u of this.usuarios) {
        this.rolDraftByUserId[u.idUsuario] = u.rol;
        this.estadoDraftByUserId[u.idUsuario] = u.estado;
      }

      if (this.error) {
        this.toast.warning(this.error);
      }
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.authStorageKey) ?? '';
    return new HttpHeaders({ Authorization: `Basic ${token}` });
  }
}
