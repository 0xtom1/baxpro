interface GlencairnLogoProps {
  className?: string;
  white?: boolean;
}

export default function GlencairnLogo({ className = "w-6 h-6", white = false }: GlencairnLogoProps) {
  const fillColor = white ? "white" : "hsl(var(--primary))";
  
  return (
    <svg
      viewBox="0 0 100 140"
      fill="none"
      className={className}
      style={{ color: white ? 'white' : undefined }}
    >
      {/* Bourbon bottle */}
      {/* Cap */}
      <rect
        x="40"
        y="10"
        width="20"
        height="8"
        rx="2"
        fill={fillColor}
      />
      
      {/* Neck */}
      <rect
        x="42"
        y="18"
        width="16"
        height="20"
        fill={fillColor}
      />
      
      {/* Shoulder */}
      <path
        d="M 42 38 L 35 45 L 35 120 L 65 120 L 65 45 L 58 38 Z"
        fill={fillColor}
      />
      
      {/* Label area - lighter rectangle */}
      <rect
        x="40"
        y="65"
        width="20"
        height="35"
        fill="white"
        opacity="0.25"
        rx="1"
      />
      
      {/* Shine/highlight on bottle */}
      <rect
        x="38"
        y="50"
        width="4"
        height="50"
        fill="white"
        opacity="0.2"
        rx="2"
      />
      
      {/* Base */}
      <rect
        x="35"
        y="120"
        width="30"
        height="10"
        rx="1"
        fill={fillColor}
      />
    </svg>
  );
}
