import EmptyState from '../EmptyState';

export default function EmptyStateExample() {
  return <EmptyState onCreateAlert={() => console.log('Create alert')} />;
}
