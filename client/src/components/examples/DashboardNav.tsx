import DashboardNav from '../DashboardNav';

export default function DashboardNavExample() {
  return <DashboardNav onNewAlert={() => console.log('New alert')} />;
}
