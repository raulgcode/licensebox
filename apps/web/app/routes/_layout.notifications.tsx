import { useState } from 'react';
import type { LoaderFunctionArgs } from 'react-router';
import { data, useLoaderData, useNavigate, Form } from 'react-router';
import { createAuthenticatedApi } from '@/lib/api';
import type { NotificationLogDto } from '@licensebox/shared';

interface NotificationLogsResponse {
  items: NotificationLogDto[];
  total: number;
}

const STATUS_STYLES: Record<string, string> = {
  SENT: 'bg-green-500/10 text-green-600 dark:text-green-400',
  FAILED: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  SENT: 'Enviado',
  FAILED: 'Fallido',
};

function getDaysLabel(days: number): string {
  if (days === 1) return '1 dia';
  return `${days} dias`;
}

function getDaysColor(days: number): string {
  if (days <= 1) return 'bg-red-500/10 text-red-600 dark:text-red-400';
  if (days <= 7) return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status') ?? '';
  const licenseId = url.searchParams.get('licenseId') ?? '';
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? '';
  const page = parseInt(url.searchParams.get('page') ?? '1', 10);
  const limit = 50;
  const offset = (page - 1) * limit;

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (licenseId) params.set('licenseId', licenseId);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  params.set('limit', String(limit));
  params.set('offset', String(offset));

  const api = await createAuthenticatedApi(request);
  const { data: result } = await api.get<NotificationLogsResponse>(
    `/notifications/logs?${params.toString()}`,
  );

  return data({ logs: result, page, limit, status, licenseId, from, to });
}

export default function NotificationsPage() {
  const { logs, page, limit, status, from, to } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const totalPages = Math.ceil(logs.total / limit);
  const [selectedLog, setSelectedLog] = useState<NotificationLogDto | null>(null);

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

  const sentCount = logs.items.filter((l) => l.status === 'SENT').length;
  const failedCount = logs.items.filter((l) => l.status === 'FAILED').length;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
        <p className="text-muted-foreground mt-1">
          Historial de notificaciones de vencimiento de licencias
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">{logs.total}</p>
              <p className="text-sm text-muted-foreground">Total Enviadas</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">{sentCount}</p>
              <p className="text-sm text-muted-foreground">Exitosas</p>
            </div>
          </div>
        </div>
        <div className="bg-card rounded-xl border p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" x2="12" y1="8" y2="12" />
                <line x1="12" x2="12.01" y1="16" y2="16" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">{failedCount}</p>
              <p className="text-sm text-muted-foreground">Fallidas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border p-4 shadow-sm mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Estado
          </label>
          <select
            value={status}
            onChange={(e) => applyFilter({ status: e.target.value })}
            className="text-sm bg-background border rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todos</option>
            <option value="SENT">Enviado</option>
            <option value="FAILED">Fallido</option>
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
        {(status || from || to) && (
          <button
            onClick={() => navigate('/notifications')}
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
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Umbral
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Licencia
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Destinatario
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
                    {new Date(log.sentAt).toLocaleString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[log.status] ?? 'bg-muted text-muted-foreground'}`}
                    >
                      {STATUS_LABELS[log.status] ?? log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${getDaysColor(log.daysBeforeExpiry)}`}
                    >
                      {getDaysLabel(log.daysBeforeExpiry)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{log.license?.product ?? '—'}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {log.license?.key ?? '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {log.license?.client?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {log.recipientEmail}
                  </td>
                </tr>
              ))}
              {logs.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-muted-foreground">
                          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
                          <line x1="1" x2="23" y1="1" y2="23" />
                        </svg>
                      </div>
                      <p className="text-muted-foreground">
                        No hay notificaciones con los filtros aplicados
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
              Pagina {page} de {totalPages}
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
                  className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[selectedLog.status] ?? 'bg-muted text-muted-foreground'}`}
                >
                  {STATUS_LABELS[selectedLog.status] ?? selectedLog.status}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  Detalle de notificacion
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
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fecha de envio</p>
                  <p className="text-sm">
                    {new Date(selectedLog.sentAt).toLocaleString('es-ES', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit', second: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Umbral</p>
                  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${getDaysColor(selectedLog.daysBeforeExpiry)}`}>
                    {getDaysLabel(selectedLog.daysBeforeExpiry)} antes del vencimiento
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Destinatario</p>
                  <p className="text-sm">{selectedLog.recipientEmail}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Estado</p>
                  <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${STATUS_STYLES[selectedLog.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {STATUS_LABELS[selectedLog.status] ?? selectedLog.status}
                  </span>
                </div>
                {selectedLog.license && (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Producto</p>
                      <p className="text-sm font-medium">{selectedLog.license.product}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cliente</p>
                      <p className="text-sm font-medium">{selectedLog.license.client?.name ?? '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Clave de licencia</p>
                      <p className="text-sm font-mono text-muted-foreground">{selectedLog.license.key}</p>
                    </div>
                    {selectedLog.license.expiresAt && (
                      <div className="col-span-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Fecha de vencimiento</p>
                        <p className="text-sm">
                          {new Date(selectedLog.license.expiresAt).toLocaleDateString('es-ES', {
                            year: 'numeric', month: 'long', day: 'numeric',
                          })}
                        </p>
                      </div>
                    )}
                  </>
                )}
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">ID del registro</p>
                  <p className="text-xs font-mono text-muted-foreground break-all">{selectedLog.id}</p>
                </div>
                {selectedLog.errorMessage && (
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-1">Error</p>
                    <pre className="bg-red-500/5 border border-red-200 dark:border-red-900 rounded-lg p-3 text-xs font-mono text-red-600 dark:text-red-400 whitespace-pre-wrap break-all">
                      {selectedLog.errorMessage}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
