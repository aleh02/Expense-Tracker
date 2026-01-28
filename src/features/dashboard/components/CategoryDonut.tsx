type Props = {
    value: number;
    total: number;
    size?: number;
};

//donut chart for each category % share
export function CategoryDonut({ value, total, size = 48 }: Props) {
    const pct = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;

    const stroke = 6;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const dash = c * pct;
    const gap = c - dash;

    return (
        <svg width={size} height={size}
            viewBox={`0 0 ${size} ${size}`}
            aria-label="Category share"
        >
            {/* background ring */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="currentColor"
                opacity={0.15}
                strokeWidth={stroke}
            />
            {/* progress ring */}
            <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke="currentColor"
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${gap}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
            {/* percentage label */}
            <text
                x="50%"
                y="50%"
                dominantBaseline="middle"
                textAnchor="middle"
                fontSize={size * 0.28}
                fill="currentColor"
                opacity={0.8}
            >
                {Math.round(pct * 100)}%
            </text>
        </svg>
    );
}
