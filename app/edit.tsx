import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '@/state/AppContext';
import { usePackages } from '@/state/usePackages';
import { createPackageService } from '@/services/package';
import { PackageForm, type PackageFormValues } from '@/ui/PackageForm';
import { LoadingState } from '@/ui/LoadingState';
import type { Package, UpdatePackageInput } from '@/types';

export default function EditScreen() {
  const { ready, db } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const { update } = usePackages();
  const [pkg, setPkg] = React.useState<Package | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    if (!id || !db) {
      setLoading(false);
      return;
    }
    createPackageService(db)
      .get(id)
      .then((p) => {
        if (active) {
          setPkg(p);
          setLoading(false);
        }
      })
      .catch(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, db]);

  if (!ready || loading) return <LoadingState />;
  if (!pkg) {
    router.back();
    return null;
  }

  const submit = async (v: PackageFormValues) => {
    const input: UpdatePackageInput = {
      stationId: v.stationId,
      courierCompany: v.courierCompany,
      trackingNumber: v.trackingNumber,
      pickupCode: v.pickupCode,
      tailNumber: v.tailNumber,
      boxNo: v.boxNo,
      status: v.status,
      arrivedAt: v.arrivedAt,
      remark: v.remark,
    };
    await update(id, input);
  };

  return (
    <PackageForm
      key={id}
      visible
      compact
      title="编辑快递"
      submitLabel="保存"
      initial={pkg}
      onClose={() => router.back()}
      onSubmit={submit}
    />
  );
}
