import { useParams } from 'react-router-dom';
import ProfitLossReport from '@/pages/admin/ProfitLossReport';

export default function LocalPL() {
  const { branchId } = useParams<{ branchId: string }>();
  
  // Reuse the admin P&L component but it will filter by branch automatically
  return <ProfitLossReport />;
}
