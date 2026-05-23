/* Dench logo SVG — blue rounded square with ~ and / glassy marks */

interface DenchLogoProps {
    /** Size of the logo chip in pixels (width = height) */
    size?: number;
    /** Extra className on the outer <svg> element */
    className?: string;
}

export function DenchLogo({ size = 36, className = "" }: DenchLogoProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            aria-label="Dench CRM logo"
            role="img"
        >
            {/* Blue rounded-square background */}
            <rect width="100" height="100" rx="22" fill="#2B72AA" />

            {/* Subtle inner gradient shine */}
            <rect width="100" height="100" rx="22" fill="url(#dench-shine)" opacity="0.18" />

            {/* ── Tilde ~ ── left side */}
            <path
                d="M14 51 C18 43, 24 43, 28 51 C32 59, 38 59, 42 51"
                stroke="white"
                strokeWidth="6.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity="0.88"
                filter="url(#dench-glow)"
            />

            {/* ── Slash / ── right side, top-right to bottom-left */}
            <line
                x1="80"
                y1="20"
                x2="54"
                y2="82"
                stroke="white"
                strokeWidth="7"
                strokeLinecap="round"
                opacity="0.88"
                filter="url(#dench-glow)"
            />

            <defs>
                {/* Radial shine */}
                <radialGradient id="dench-shine" cx="30%" cy="25%" r="60%">
                    <stop offset="0%" stopColor="white" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>

                {/* Subtle glow on the marks */}
                <filter id="dench-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
        </svg>
    );
}
