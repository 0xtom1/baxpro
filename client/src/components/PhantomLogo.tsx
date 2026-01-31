interface PhantomLogoProps {
  className?: string;
}

export default function PhantomLogo({ className = "w-5 h-5" }: PhantomLogoProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="40" height="40" rx="10" fill="url(#phantom-grad)" />
      <path
        d="M29.543 20.498H27.3C27.3 15.967 23.578 12.286 19 12.286C14.474 12.286 10.786 15.866 10.696 20.307C10.603 24.9 14.906 28.879 19.63 28.471C20.057 28.434 20.392 28.084 20.392 27.655V26.896C20.392 26.519 20.124 26.191 19.752 26.123C17.111 25.643 14.927 23.373 15.012 20.692C15.103 17.808 17.536 15.518 20.464 15.518C23.312 15.518 25.626 17.805 25.626 20.654V21.331C25.626 21.75 25.972 22.089 26.4 22.089H29.543C29.971 22.089 30.318 21.75 30.318 21.331V20.498C30.318 20.079 29.971 19.74 29.543 19.74V20.498Z"
        fill="white"
      />
      <circle cx="22.5" cy="18.5" r="1.5" fill="white" />
      <circle cx="17" cy="18.5" r="1.5" fill="white" />
      <defs>
        <linearGradient id="phantom-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#AB9FF2" />
          <stop offset="1" stopColor="#534BB1" />
        </linearGradient>
      </defs>
    </svg>
  );
}
