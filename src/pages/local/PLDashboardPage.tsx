import { useParams } from 'react-router-dom';
import { RdoDashboard } from '@/components/rdo/RdoDashboard';

export default function PLDashboardPage() {
  const { branchId } = useParams<{ branchId: string }>();

  return (
    <div className="p-6">
      <RdoDashboard branchId={branchId!} />
    </div>
  );
}
