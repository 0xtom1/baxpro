import GlencairnLogo from "./GlencairnLogo";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <GlencairnLogo className="w-10 h-10 opacity-60" />
      </div>
      <h3 className="text-2xl font-semibold mb-3">No alerts yet</h3>
      <p className="text-muted-foreground max-w-md">
        Create your first alert to start tracking your favorite bourbons on Baxus
      </p>
    </div>
  );
}
