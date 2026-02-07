import RegulationsManager from '@/components/admin/RegulationsManager';
import { RequireBrandPermission } from '@/components/guards';

function BrandRegulationsPageContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reglamento Interno</h1>
        <p className="text-muted-foreground">
          Gestión del reglamento de la marca
        </p>
      </div>
      <RegulationsManager />
    </div>
  );
}

export default function BrandRegulationsPage() {
  return (
    <RequireBrandPermission
      permission="canEditBrandConfig"
      noAccessMessage="Solo el Superadmin puede gestionar reglamentos."
    >
      <BrandRegulationsPageContent />
    </RequireBrandPermission>
  );
}
