export function BrandLogo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Document foundation in Primary Navy */}
      <rect x="3" y="3" width="30" height="30" rx="7" fill="#123B65" />
      {/* Subtle folded document page corner */}
      <path
        d="M11 10.5C11 9.67157 11.6716 9 12.5 9H20.5L25 13.5V25.5C25 26.3284 24.3284 27 23.5 27H12.5C11.6716 27 11 26.3284 11 25.5V10.5Z"
        fill="#FFFFFF"
      />
      {/* Guiding pathway curve in Civic Green */}
      <path
        d="M13.5 23.5C14.8 19.8 17.5 18 22.5 17.5"
        stroke="#138A55"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Directional guidance accent in Saffron */}
      <path
        d="M19.5 14.8L22.8 17.4L19.9 20.4"
        stroke="#F39C35"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Subtle fold line */}
      <path d="M20.5 9V13.5H25" stroke="#123B65" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
