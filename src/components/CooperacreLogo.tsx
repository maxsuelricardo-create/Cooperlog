import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  variant?: "light" | "dark" | "colored";
}

export const CooperacreSymbol: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className = "",
}) => {
  // SVG of the 3 leaves symbol of Cooperacre
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`inline-block select-none ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      id="cooperacre-symbol-svg"
    >
      <g transform="translate(50, 50)">
        {/* Leaf 1 (Top-Left pointing, rotated 0) */}
        <g transform="rotate(-30) translate(0, -12)">
          {/* Leaf Fill with a beautiful gradient or solid color representing Cooperacre leaf */}
          <path
            d="M 0 -24 C -14 -16, -14 2, 0 10 C 14 2, 10 -16, 0 -24 Z"
            fill="#b1d17a"
            stroke="#486121"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Leaf central vein */}
          <path
            d="M 0 10 Q -3 -5, 0 -18"
            stroke="#486121"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Leaf 2 (Right-pointing, rotated 120) */}
        <g transform="rotate(90) translate(0, -12)">
          <path
            d="M 0 -24 C -14 -16, -14 2, 0 10 C 14 2, 10 -16, 0 -24 Z"
            fill="#b1d17a"
            stroke="#486121"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M 0 10 Q -3 -5, 0 -18"
            stroke="#486121"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Leaf 3 (Bottom-Left pointing, rotated 240) */}
        <g transform="rotate(210) translate(0, -12)">
          <path
            d="M 0 -24 C -14 -16, -14 2, 0 10 C 14 2, 10 -16, 0 -24 Z"
            fill="#b1d17a"
            stroke="#486121"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M 0 10 Q -3 -5, 0 -18"
            stroke="#486121"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* Small central node to bind them harmoniously */}
        <circle cx="0" cy="0" r="4" fill="#486121" />
      </g>
    </svg>
  );
};

export const CooperacreLogo: React.FC<LogoProps> = ({
  className = "",
  size = 48,
  showText = true,
  variant = "colored",
}) => {
  const textColorClass =
    variant === "light"
      ? "text-white"
      : variant === "dark"
      ? "text-emerald-950"
      : "text-[#5b802b]";

  return (
    <div className={`flex flex-col items-center justify-center gap-1.5 ${className}`} id="cooperacre-logo-container">
      <CooperacreSymbol size={size} />
      {showText && (
        <span
          className={`font-sans text-xs font-black tracking-widest uppercase ${textColorClass}`}
          style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
        >
          cooperacre
        </span>
      )}
    </div>
  );
};

export default CooperacreLogo;
