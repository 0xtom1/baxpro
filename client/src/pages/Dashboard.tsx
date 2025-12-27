import { useState, useEffect } from "react";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { useToast } from "@/hooks/use-toast";
import { getAlerts, createAlert, updateAlert, deleteAlert } from "@/lib/alerts";
import { type Alert } from "@shared/schema";
import DashboardNav from "@/components/DashboardNav";
import AlertCard from "@/components/AlertCard";
import AlertModal from "@/components/AlertModal";
import EmptyState from "@/components/EmptyState";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { user, loading: authLoading } = useRequireAuth();
  const { toast } = useToast();
  
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadAlerts();
    } else {
      // Clear alerts and stop loading when user logs out
      setAlerts([]);
      setLoading(false);
    }
  }, [user]);

  const loadAlerts = async () => {
    try {
      const data = await getAlerts();
      setAlerts(data);
    } catch (error) {
      toast({
        title: "Failed to load alerts",
        description: "Please try refreshing the page",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewAlert = () => {
    setEditingAlert(null);
    setModalOpen(true);
  };

  const handleEditAlert = (id: string) => {
    const alert = alerts.find(a => a.id === id);
    if (alert) {
      setEditingAlert(alert);
      setModalOpen(true);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await deleteAlert(id);
      setAlerts(alerts.filter(a => a.id !== id));
      toast({
        title: "Alert deleted",
        description: "Your alert has been removed",
      });
    } catch (error) {
      toast({
        title: "Failed to delete alert",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleSaveAlert = async (data: { 
    name: string; 
    matchStrings: string[]; 
    matchAll: boolean;
    maxPrice: number;
    bottledYearMin?: number | null;
    bottledYearMax?: number | null;
    ageMin?: number | null;
    ageMax?: number | null;
  }) => {
    setSaving(true);
    try {
      if (editingAlert) {
        const updated = await updateAlert(editingAlert.id, data);
        setAlerts(alerts.map(a => a.id === editingAlert.id ? updated : a));
        toast({
          title: "Alert updated",
          description: "Your changes have been saved",
        });
      } else {
        const newAlert = await createAlert(data);
        setAlerts([newAlert, ...alerts]);
        toast({
          title: "Alert created",
          description: "You'll be notified when matching spirits are available",
        });
      }
      setModalOpen(false);
      setEditingAlert(null);
      
      // Refetch alerts after a delay to get updated match counts
      // (matching runs async on the server)
      setTimeout(() => {
        loadAlerts();
      }, 1500);
    } catch (error) {
      toast({
        title: "Failed to save alert",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav onNewAlert={handleNewAlert} alertCount={alerts.length} />
      
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Alerts</h1>
          <p className="text-muted-foreground">
            Manage your spirit availability alerts
          </p>
        </div>

        {alerts.length === 0 ? (
          <EmptyState onCreateAlert={handleNewAlert} />
        ) : (
          <div className="space-y-4">
            {alerts.map(alert => (
              <AlertCard
                key={alert.id}
                {...alert}
                createdAt={formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                onEdit={handleEditAlert}
                onDelete={handleDeleteAlert}
              />
            ))}
          </div>
        )}
      </main>

      <AlertModal
        open={modalOpen}
        onClose={() => {
          if (!saving) {
            setModalOpen(false);
            setEditingAlert(null);
          }
        }}
        onSave={handleSaveAlert}
        initialData={editingAlert ? {
          name: editingAlert.name,
          matchStrings: editingAlert.matchStrings,
          matchAll: editingAlert.matchAll,
          maxPrice: editingAlert.maxPrice,
          bottledYearMin: editingAlert.bottledYearMin,
          bottledYearMax: editingAlert.bottledYearMax,
          ageMin: editingAlert.ageMin,
          ageMax: editingAlert.ageMax,
        } : undefined}
      />
    </div>
  );
}
