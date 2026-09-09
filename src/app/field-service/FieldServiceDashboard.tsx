'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Wrench, Users, Calendar, Package, BarChart3,
  Search,
} from 'lucide-react';
import { Card, Badge, Button, EmptyState } from '@/components/ui';
import type {
  ServiceOrder, Technician, ServiceAssignment, ServiceEquipment,
  FieldServiceMetrics, FieldServiceStats,
  OrderStatus, AssignmentStatus,
} from '@/lib/services/field-service-service';

type TabId = 'overview' | 'orders' | 'technicians' | 'assignments' | 'equipment';

interface FieldServiceDashboardProps {
  organizationId: string;
  orders: ServiceOrder[];
  technicians: Technician[];
  assignments: ServiceAssignment[];
  equipment: ServiceEquipment[];
  metrics: FieldServiceMetrics;
  stats: FieldServiceStats;
}

const orderStatusVariant = (status: OrderStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'completed') return 'success';
  if (['new', 'assigned', 'scheduled', 'in_progress'].includes(status)) return 'warning';
  if (['cancelled', 'on_hold'].includes(status)) return 'danger';
  return 'info';
};

const assignmentStatusVariant = (status: AssignmentStatus): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (status === 'completed') return 'success';
  if (['assigned', 'accepted', 'in_progress'].includes(status)) return 'warning';
  if (['declined', 'cancelled'].includes(status)) return 'danger';
  return 'info';
};

const priorityVariant = (priority: string): 'success' | 'warning' | 'danger' | 'default' | 'info' => {
  if (priority === 'low') return 'info';
  if (priority === 'medium') return 'warning';
  if (priority === 'high') return 'danger';
  if (priority === 'urgent' || priority === 'emergency') return 'danger';
  return 'default';
};

export function FieldServiceDashboard({
  orders, technicians, assignments, equipment, metrics, stats,
}: FieldServiceDashboardProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');

  const technicianName = useCallback(
    (id: string) => technicians.find((t) => t.id === id)?.name || id,
    [technicians],
  );

  const orderTitle = useCallback(
    (id: string) => orders.find((o) => o.id === id)?.title || id,
    [orders],
  );

  const filteredOrders = useMemo(() => {
    if (!search) return orders;
    const q = search.toLowerCase();
    return orders.filter(
      (o) => o.title.toLowerCase().includes(q) || o.type.toLowerCase().includes(q) || o.status.toLowerCase().includes(q) || o.priority.toLowerCase().includes(q),
    );
  }, [orders, search]);

  const filteredTechnicians = useMemo(() => {
    if (!search) return technicians;
    const q = search.toLowerCase();
    return technicians.filter(
      (t) => t.name.toLowerCase().includes(q) || t.status.toLowerCase().includes(q) || t.zone.toLowerCase().includes(q),
    );
  }, [technicians, search]);

  const filteredAssignments = useMemo(() => {
    if (!search) return assignments;
    const q = search.toLowerCase();
    return assignments.filter(
      (a) => orderTitle(a.orderId).toLowerCase().includes(q) || technicianName(a.technicianId).toLowerCase().includes(q) || a.status.toLowerCase().includes(q),
    );
  }, [assignments, search, orderTitle, technicianName]);

  const filteredEquipment = useMemo(() => {
    if (!search) return equipment;
    const q = search.toLowerCase();
    return equipment.filter(
      (e) => e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q) || e.status.toLowerCase().includes(q),
    );
  }, [equipment, search]);

  const tabs: { id: TabId; label: string; icon: typeof Wrench }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'orders', label: 'Orders', icon: Wrench },
    { id: 'technicians', label: 'Technicians', icon: Users },
    { id: 'assignments', label: 'Assignments', icon: Calendar },
    { id: 'equipment', label: 'Equipment', icon: Package },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-accent-primary text-white' : 'bg-bg-secondary text-fg-secondary hover:bg-bg-tertiary'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab !== 'overview' && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-tertiary" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border-primary bg-bg-primary px-10 py-2 text-sm focus:border-accent-primary focus:outline-none"
          />
        </div>
      )}

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Open Orders</div>
              <div className="mt-1 text-2xl font-bold">{metrics.openOrders}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Completed Orders</div>
              <div className="mt-1 text-2xl font-bold">{metrics.completedOrders}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Available Technicians</div>
              <div className="mt-1 text-2xl font-bold">{metrics.availableTechnicians}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Active Assignments</div>
              <div className="mt-1 text-2xl font-bold">{metrics.activeAssignments}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-fg-tertiary">Equipment Utilization</div>
              <div className="mt-1 text-2xl font-bold">{metrics.equipmentUtilization}%</div>
            </Card>
          </div>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Order Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byOrderType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Order Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byOrderStatus).map(([status, count]) => (
                <Badge key={status} variant={orderStatusVariant(status as OrderStatus)}>{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Order Priority Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byOrderPriority).map(([priority, count]) => (
                <Badge key={priority} variant={priorityVariant(priority)}>{priority}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Technician Status Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byTechnicianStatus).map(([status, count]) => (
                <Badge key={status} variant="info">{status.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-sm font-semibold">Equipment Type Breakdown</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byEquipmentType).map(([type, count]) => (
                <Badge key={type} variant="info">{type.replace('_', ' ')}: {count}</Badge>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Wrench} title="No service orders" description="Service orders will appear here." /></Card>
          ) : (
            filteredOrders.map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{o.title}</div>
                    <div className="text-sm text-fg-secondary">{o.type.replace('_', ' ')} · {o.customerName || 'No customer'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={priorityVariant(o.priority)}>{o.priority}</Badge>
                    <Badge variant={orderStatusVariant(o.status)}>{o.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'technicians' && (
        <div className="space-y-3">
          {filteredTechnicians.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Users} title="No technicians" description="Technicians will appear here." /></Card>
          ) : (
            filteredTechnicians.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm text-fg-secondary">{t.zone || 'No zone'} · {t.completedJobs} jobs · {t.rating} rating</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default">{t.skills.length} skills</Badge>
                    <Badge variant={t.status === 'available' ? 'success' : t.status === 'off_duty' || t.status === 'unavailable' ? 'danger' : 'warning'}>{t.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'assignments' && (
        <div className="space-y-3">
          {filteredAssignments.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Calendar} title="No assignments" description="Service assignments will appear here." /></Card>
          ) : (
            filteredAssignments.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{orderTitle(a.orderId)}</div>
                    <div className="text-sm text-fg-secondary">{technicianName(a.technicianId)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={assignmentStatusVariant(a.status)}>{a.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'equipment' && (
        <div className="space-y-3">
          {filteredEquipment.length === 0 ? (
            <Card className="p-8"><EmptyState icon={Package} title="No equipment" description="Service equipment will appear here." /></Card>
          ) : (
            filteredEquipment.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-sm text-fg-secondary">{e.type.replace('_', ' ')} · {e.location || 'No location'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {e.serialNumber && <Badge variant="default">{e.serialNumber}</Badge>}
                    <Badge variant={e.status === 'available' ? 'success' : e.status === 'lost' || e.status === 'retired' ? 'danger' : 'warning'}>{e.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
