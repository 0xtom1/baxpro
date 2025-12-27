import LandingNav from '../LandingNav';

export default function LandingNavExample() {
  return (
    <div className="h-[200vh]">
      <LandingNav />
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Scroll to see navigation change</p>
      </div>
    </div>
  );
}
