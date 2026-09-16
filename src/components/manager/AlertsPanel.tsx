import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  MapPin, 
  User as UserIcon,
  Filter,
  Check,
  Search
} from 'lucide-react';
import { AlertItem, User } from '../../types';
import { ApiService } from '../../services/api';

interface AlertsPanelProps {
  executives: User[];
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ executives }) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterResolved, setFilterResolved] = useState<string>('UNRESOLVED');
  const [isLoading, setIsLoading] = useState(true);

  const loadAlerts = async () => {
    setIsLoading(true);
    try {
      const data = await ApiService.getAlerts();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load alerts:', err);
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleResolve = async (alertId: string) => {
    try {
      await ApiService.resolveAlert(alertId);
      setAlerts(prev => (Array.isArray(prev) ? prev : []).map(a => a.id === alertId ? { ...a, resolved: true } : a));
    } catch (err) {
      console.error(err);
    }
  };

  // Filter safely guarded
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const filteredAlerts = safeAlerts.filter(alert => {
    if (!alert) return false;
    if (filterSeverity !== 'ALL' && alert.severity !== filterSeverity.toLowerCase()) return false;
    if (filterResolved === 'UNRESOLVED' && alert.resolved) return false;
    if (filterResolved === 'RESOLVED' && !alert.resolved) return false;
    return true;
  });

  return (
    <div className="space-y-4 text-slate-800">
      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Severity Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Severity
            </label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
              Resolution Status
            </label>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setFilterResolved('UNRESOLVED')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filterResolved === 'UNRESOLVED' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active ({safeAlerts.filter(a => a && !a.resolved).length})
              </button>
              <button
                onClick={() => setFilterResolved('RESOLVED')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filterResolved === 'RESOLVED' ? 'bg-green-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Resolved
              </button>
              <button
                onClick={() => setFilterResolved('ALL')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  filterResolved === 'ALL' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>

        <span className="text-xs font-mono text-slate-500">
          {filteredAlerts.length} Security Alerts Flagged
        </span>
      </div>

      {/* Alerts Feed */}
      {filteredAlerts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-800">No alerts match criteria</p>
          <p className="text-[11px] text-slate-500 mt-1">All GPS integrity &amp; geofence checks are in healthy status.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-2xl border transition-all ${
                alert.resolved 
                  ? 'bg-slate-50 border-slate-200 opacity-60' 
                  : alert.severity === 'critical' || alert.severity === 'high'
                  ? 'bg-red-50/70 border-red-200 shadow-xs'
                  : 'bg-amber-50/70 border-amber-200 shadow-xs'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    alert.severity === 'critical' ? 'bg-red-100 text-red-600' :
                    alert.severity === 'high' ? 'bg-orange-100 text-orange-600' : 'bg-amber-100 text-amber-600'
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{alert.type.replace(/_/g, ' ')}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                        alert.severity === 'critical' ? 'bg-red-100 text-red-700 border border-red-200' :
                        alert.severity === 'high' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 font-medium">{alert.message}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 font-mono pt-1">
                      <span>Executive: <strong className="text-slate-800">{alert.employeeName} ({alert.employeeId})</strong></span>
                      <span>&bull;</span>
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      {alert.latitude && alert.longitude && (
                        <>
                          <span>&bull;</span>
                          <span>Lat: {alert.latitude.toFixed(4)}, Lng: {alert.longitude.toFixed(4)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {!alert.resolved && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    className="px-4 py-2 bg-white hover:bg-green-50 text-green-700 font-bold text-xs rounded-xl border border-green-300 shadow-xs flex items-center gap-1.5 transition-colors self-end sm:self-center"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Resolve Alert</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
