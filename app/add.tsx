import { useRouter } from 'expo-router';
import { useApp } from '@/state/AppContext';
import { usePackages } from '@/state/usePackages';
import { PackageForm, type PackageFormValues } from '@/ui/PackageForm';
import { LoadingState } from '@/ui/LoadingState';
import type { CreatePackageInput, DataSource } from '@/types';

export default function AddScreen() {
  const { ready } = useApp();
  const router = useRouter();
  const { create } = usePackages();

  if (!ready) return <LoadingState />;

  const submit = async (v: PackageFormValues) => {
    const input: CreatePackageInput = { ...v, source: 'MANUAL' as DataSource };
    await create(input);
  };

  return (
    <PackageForm
      visible
      title="添加快递"
      submitLabel="保存"
      onClose={() => router.back()}
      onSubmit={submit}
    />
  );
}
