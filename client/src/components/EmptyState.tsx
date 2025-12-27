import { Button } from "@/components/ui/button";
import GlencairnLogo from "./GlencairnLogo";

interface EmptyStateProps {
  onCreateAlert?: () => void;
}

export default function EmptyState({ onCreateAlert }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <GlencairnLogo className="w-10 h-10 opacity-60" />
      </div>
      <h3 className="text-2xl font-semibold mb-3">No alerts yet</h3>
      <p className="text-muted-foreground mb-8 max-w-md">
        Create your first alert to start tracking your favorite bourbons on Baxus
      </p>
      <Button 
        size="lg"
        onClick={() => {
          onCreateAlert?.();
          console.log('Create first alert clicked');
        }}
        data-testid="button-create-first-alert"
      >
        Create Your First Alert
      </Button>
    </div>
  );
}
