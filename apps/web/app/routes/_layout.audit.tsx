import { useState } from 'react';
import type { LoaderFunctionArgs } from 'react-router';
import { data, useLoaderData, useNavigate } from 'react-router';
import { createAuthenticatedApi } from '@/lib/api';
import type { AuditLogDto, AuditLogsResponseDto } from '@licensebox/shared';

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Crear',
  UPDATE: 'Actualizar',
  DELETE: 'Eliminar',
  LOGIN: 'Login',
  LOGIN_FAILED: 'Login Fallido',
  CHANGE_PASSWORD: 'Cambio de Contraseña',
  LICENSE_ACTIVATE: 'Activar Licencia',
  LICENSE_DEACTIVATE: 'Desactivar Licencia',
  GENERATE_OFFLINE_TOKEN: 'Token Offline',
  REGENERATE_SECRET: 'Regenerar Secret',
  TOGGLE_ACTIVE: 'Cambiar Estado',
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-500/10 text-green-600 dark:text-green-400',
  UPDATE: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  DELETE: 'bg-red-500/10 text-red-600 dark:text-red-400',
  LOGIN: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  LOGIN_FAILED: 'bg-red-500/10 text-red-600 dark:text-red-400',
  CHANGE_PASSWORD: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  LICENSE_ACTIVATE: 'bg-green-500/10 text-green-600 dark:text-green-400',
  LICENSE_DEACTIVATE: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  GENERATE_OFFLINE_TOKEN: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  REGENERATE_SECRET: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  TOGGLE_ACTIVE: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
};

const ENTITY_LABELS: Record<string, string> = {
  LICENSE: 'Licencia',
  CLIENT: 'Cliente',
  USER: 'Usuario',
};

type ChangesMap = Record<string, { previous: unknown; updated: unknown }>;

function getContextDescription(
  action: string,
  metadata: Record<string, unknown> | null,
): string | null {
  if (!metadata) return null;
  const m = metadata;

  switch (action) {
    case 'CREATE':
    case 'DELETE':
      if (m['key'] && m['product']) return `${m['product']} · ${m['key']}`;
      if (m['name']) return String(m['name']);
      break;
    case 'UPDATE': {
      const changes = m['changes'] as ChangesMap | undefined;
      const count = changes ? Object.keys(changes).length : 0;
      const label = count === 1 ? '1 campo modificado' : `${count} campos modificados`;
      if (m['key']) return `${m['key']} · ${label}`;
      if (m['name']) return `${m['name']} · ${label}`;
      break;
    }
    case 'GENERATE_OFFLINE_TOKEN':
      if (m['product'] && m['licenseKey'] && m['clientName'])
        return `${m['product']} · ${m['licenseKey']} · Cliente: ${m['clientName']}`;
      if (m['product'] && m['licenseKey']) return `${m['product']} · ${m['licenseKey']}`;
      break;
    case 'LICENSE_ACTIVATE':
    case 'LICENSE_DEACTIVATE':
      if (m['product'] && m['key']) return `${m['product']} · ${m['key']}`;
      break;
    case 'TOGGLE_ACTIVE':
      if (m['name']) return `${m['name']} → ${m['isActive'] ? 'Activo' : 'Inactivo'}`;
      break;
    case 'REGENERATE_SECRET':
      if (m['name']) return String(m['name']);
      break;
    case 'LOGIN_FAILED':
      if (m['reason']) return String(m['reason']);
      break;
  }
  return null;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  description: 'Descripción',
  isActive: 'Estado',
  key: 'Clave',
  product: 'Producto',
  clientId: 'Cliente ID',
  machineId: 'Machine ID',
  maxUsers: 'Usuarios máx.',
  expiresAt: 'Vencimiento',
};

function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (field === 'isActive') return value ? 'Activo' : 'Inactivo';
  if (field === 'expiresAt' && typeof value === 'string') {
    return new Date(value).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return String(value);
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const entity = url.searchParams.get('entity') ?? '';
  const action = url.searchParams.get('action') ?? '';
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? '';
  const page = parseInt(url.searchParams.get('page') ?? '1', 10);
  const limit = 50;
  const offset = (page - 1) * limit;

  const params = new URLSearchParams();
  if (entity) params.set('entity', entity);
  if (action) params.set('action', action);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  params.set('limit', String(limit));
  params.set('offset', String(offset));

  const api = await createAuthenticatedApi(request);
  const { data: result } = await api.get<AuditLogsResponseDto>(`/audit-logs?${params.toString()}`);

  return data({ logs: result, page, limit, entity, action, from, to });
}

export default function AuditPage() {
  const { logs, page, limit, entity, action, from, to } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const totalPages = Math.ceil(logs.total / limit);
  const [selectedLog, setSelectedLog] = useState<AuditLogDto | null>(null);

  function applyFilter(updates: Record<string, string>) {
    const url = new URL(window.location.href);
    Object.entries(updates).forEach(([k, v]) => {
      if (v) {
        url.searchParams.set(k, v);
      } else {
        url.searchParams.delete(k);
      }
    });
    url.searchParams.delete('page');
    navigate(url.pathname + url.search);
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Registro de Auditoría</h1>
        <p className="text-muted-foreground mt-1">
          Historial de todas las acciones realizadas en el sistema
        </p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border p-4 shadow-sm mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Entidad
          </label>
          <select
            value={entity}
            onChange={(e) => applyFilter({ entity: e.target.value })}
            className="text-sm bg-background border rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todas</option>
            <option value="LICENSE">Licencia</option>
            <option value="CLIENT">Cliente</option>
            <option value="USER">Usuario</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Acción
          </label>
          <select
            value={action}
            onChange={(e) => applyFilter({ action: e.target.value })}
            className="text-sm bg-background border rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todas</option>
            <option value="CREATE">Crear</option>
            <option value="UPDATE">Actualizar</option>
            <option value="DELETE">Eliminar</option>
            <option value="LOGIN">Login</option>
            <option value="LOGIN_FAILED">Login Fallido</option>
            <option value="LICENSE_ACTIVATE">Activar Licencia</option>
            <option value="LICENSE_DEACTIVATE">Desactivar Licencia</option>
            <option value="GENERATE_OFFLINE_TOKEN">Token Offline</option>
            <option value="REGENERATE_SECRET">Regenerar Secret</option>
            <option value="TOGGLE_ACTIVE">Cambiar Estado</option>
            <option value="CHANGE_PASSWORD">Cambio de Contraseña</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Desde
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => applyFilter({ from: e.target.value })}
            className="text-sm bg-background border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Hasta
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => applyFilter({ to: e.target.value })}
            className="text-sm bg-background border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {(entity || action || from || to) && (
          <button
            onClick={() => navigate('/audit')}
            className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-accent transition-colors"
          >
            Limpiar filtros
          </button>
        )}
        <div className="ml-auto text-sm text-muted-foreground self-end py-2">
          {logs.total} registro{logs.total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Acción
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Entidad
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Contexto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Usuario
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.items.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${ACTION_COLORS[log.action] ?? 'bg-muted text-muted-foreground'}`}
                    >
                      {ACTION_LABELS[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {ENTITY_LABELS[log.entity] ?? log.entity}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground max-w-55">
                    {(() => {
                      const ctx = getContextDescription(log.action, log.metadata);
                      if (!ctx) return <span className="text-muted-foreground/50">—</span>;
                      const short = ctx.length > 35 ? ctx.slice(0, 35) + '…' : ctx;
                      return (
                        <span className="font-medium text-foreground" title={ctx}>
                          {short}
                        </span>
                      );
                    })()}
                  </td>

                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {log.userEmail ?? (
                      <span className="text-muted-foreground/50">Sistema / Público</span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-7 w-7 text-muted-foreground"
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" x2="8" y1="13" y2="13" />
                          <line x1="16" x2="8" y1="17" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                      </div>
                      <p className="text-muted-foreground">
                        No hay registros con los filtros aplicados
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => applyFilter({ page: String(page - 1) })}
                className="px-3 py-1.5 text-sm rounded-lg border bg-background hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => applyFilter({ page: String(page + 1) })}
                className="px-3 py-1.5 text-sm rounded-lg border bg-background hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-card border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${ACTION_COLORS[selectedLog.action] ?? 'bg-muted text-muted-foreground'}`}
                >
                  {ACTION_LABELS[selectedLog.action] ?? selectedLog.action}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {ENTITY_LABELS[selectedLog.entity] ?? selectedLog.entity}
                </span>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto px-6 py-5 flex flex-col gap-5">
              {/* Fields grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fecha y hora</p>
                  <p className="text-sm">
                    {new Date(selectedLog.createdAt).toLocaleString('es-ES', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">ID del registro</p>
                  <p className="text-xs font-mono text-muted-foreground break-all">{selectedLog.id}</p>
                </div>
                {selectedLog.entityId && (
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">ID del recurso</p>
                    <p className="text-xs font-mono text-muted-foreground break-all">{selectedLog.entityId}</p>
                  </div>
                )}
                {selectedLog.userEmail && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Usuario</p>
                    <p className="text-sm">{selectedLog.userEmail}</p>
                  </div>
                )}
                {selectedLog.userId && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">ID usuario</p>
                    <p className="text-xs font-mono text-muted-foreground break-all">{selectedLog.userId}</p>
                  </div>
                )}
                {(() => {
                  const ctx = getContextDescription(selectedLog.action, selectedLog.metadata);
                  return ctx ? (
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Contexto</p>
                      <p className="text-sm font-medium">{ctx}</p>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Before/After diff for UPDATE */}
              {selectedLog.action === 'UPDATE' &&
                Boolean(selectedLog.metadata?.['changes']) &&
                Object.keys(selectedLog.metadata!['changes'] as ChangesMap).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Cambios realizados
                    </p>
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-1/4">
                              Campo
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-red-500 uppercase tracking-wider w-[37.5%]">
                              Anterior
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider w-[37.5%]">
                              Nuevo
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {Object.entries((selectedLog.metadata?.['changes'] ?? {}) as ChangesMap).map(
                            ([field, { previous, updated }]) => (
                              <tr key={field} className="bg-card">
                                <td className="px-3 py-2.5 text-xs font-medium text-muted-foreground">
                                  {FIELD_LABELS[field] ?? field}
                                </td>
                                <td className="px-3 py-2.5 font-mono text-xs text-red-600 dark:text-red-400 bg-red-500/5 break-all">
                                  {formatFieldValue(field, previous)}
                                </td>
                                <td className="px-3 py-2.5 font-mono text-xs text-green-700 dark:text-green-400 bg-green-500/5 break-all">
                                  {formatFieldValue(field, updated)}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              {/* Metadata JSON (non-UPDATE or UPDATE without changes) */}
              {selectedLog.metadata &&
                Object.keys(selectedLog.metadata).length > 0 &&
                selectedLog.action !== 'UPDATE' && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Datos completos
                    </p>
                    <pre className="bg-muted/50 border rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all text-foreground">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
