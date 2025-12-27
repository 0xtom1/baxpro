import AlertCard from '../AlertCard';

export default function AlertCardExample() {
  return (
    <div className="p-8 space-y-4">
      <AlertCard
        id="1"
        name="Pappy Van Winkle"
        matchStrings={["Pappy", "Van Winkle", "PVW"]}
        maxPrice={500}
        createdAt="2 days ago"
        onEdit={(id) => console.log('Edit', id)}
        onDelete={(id) => console.log('Delete', id)}
      />
      <AlertCard
        id="2"
        name="Buffalo Trace Antique Collection"
        matchStrings={["BTAC", "Buffalo Trace Antique", "Eagle Rare 17"]}
        maxPrice={300}
        createdAt="1 week ago"
      />
    </div>
  );
}
