interface PhantomLogoProps {
  className?: string;
}

export default function PhantomLogo({ className = "w-5 h-5" }: PhantomLogoProps) {
  return (
    <svg
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="64" cy="64" r="64" fill="url(#phantom-gradient)" />
      <path
        d="M110.584 64.9142H99.142C99.142 41.7651 80.173 23 56.7724 23C33.6612 23 14.8716 41.3057 14.4118 64.0583C13.936 87.5174 35.8742 107.857 59.9837 105.775C62.1684 105.588 63.8814 103.799 63.8814 101.605V97.7289C63.8814 95.8007 62.5174 94.1263 60.6212 93.7809C47.1532 91.3288 37.0245 79.7461 37.4563 66.0508C37.9241 51.3326 50.3353 39.5181 65.2689 39.5181C79.7988 39.5181 91.6062 51.1887 91.6062 65.5181V68.9782C91.6062 71.1154 93.3672 72.8467 95.5399 72.8467H110.584C112.757 72.8467 114.518 71.1154 114.518 68.9782V64.9142C114.518 62.777 112.757 61.0457 110.584 61.0457V64.9142Z"
        fill="white"
      />
      <ellipse cx="77.5" cy="56.5" rx="7.5" ry="8.5" fill="white" />
      <ellipse cx="50.5" cy="56.5" rx="7.5" ry="8.5" fill="white" />
      <defs>
        <linearGradient
          id="phantom-gradient"
          x1="0"
          y1="0"
          x2="128"
          y2="128"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#534BB1" />
          <stop offset="1" stopColor="#551BF9" />
        </linearGradient>
      </defs>
    </svg>
  );
}
