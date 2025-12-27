import { useState } from 'react';
import AlertModal from '../AlertModal';
import { Button } from '@/components/ui/button';

export default function AlertModalExample() {
  const [open, setOpen] = useState(false);

  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>Open Alert Modal</Button>
      <AlertModal 
        open={open} 
        onClose={() => setOpen(false)}
        onSave={(data) => console.log('Saved:', data)}
      />
    </div>
  );
}
