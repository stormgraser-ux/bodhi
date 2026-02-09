export function EnsoLoader() {
  return (
    <div className="loading">
      <svg
        width="80"
        height="80"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="50"
          cy="50"
          r="38"
          stroke="var(--text-secondary)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="220 40"
          style={{
            animation: "enso-draw 4s ease-in-out infinite",
            transformOrigin: "center",
          }}
        />
        <style>{`
          @keyframes enso-draw {
            0% {
              stroke-dashoffset: 260;
              opacity: 0.3;
            }
            50% {
              stroke-dashoffset: 0;
              opacity: 1;
            }
            100% {
              stroke-dashoffset: -260;
              opacity: 0.3;
            }
          }
        `}</style>
      </svg>
    </div>
  );
}
