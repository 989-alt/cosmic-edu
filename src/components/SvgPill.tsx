/** SVG 도해 안 라벨 알약. 폭은 글자 수로 근사(한글 13px, 그 외 7.5px @ 14px). */
export function SvgPill({ x, y, text, tone = 'muted', anchor = 'middle', size = 14 }: {
    x: number; y: number; text: string;
    tone?: 'muted' | 'sun' | 'earth' | 'summer' | 'winter' | 'spring' | 'autumn' | 'strong';
    anchor?: 'start' | 'middle' | 'end';
    size?: number;
}) {
    const k = size / 14;
    let w = 0;
    for (const ch of text) w += /[ㄱ-힝]/.test(ch) ? 13 * k : 7.5 * k;
    const width = w + 20 * k;
    const height = 24 * k;
    const left = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2;
    const fill: Record<string, string> = {
        muted: '#cbd5e1', sun: '#fcd34d', earth: '#93c5fd', summer: '#fca5a5', winter: '#93c5fd',
        spring: '#f9a8d4', autumn: '#fcd34d', strong: '#f8fafc',
    };
    const stroke: Record<string, string> = {
        muted: 'rgba(148,163,184,0.25)', sun: 'rgba(245,158,11,0.45)', earth: 'rgba(59,130,246,0.45)',
        summer: 'rgba(239,68,68,0.45)', winter: 'rgba(96,165,250,0.45)', spring: 'rgba(244,114,182,0.45)',
        autumn: 'rgba(245,158,11,0.45)', strong: 'rgba(148,163,184,0.35)',
    };
    return (
        <g>
            <rect x={left} y={y - height / 2} width={width} height={height} rx={height / 2}
                fill="rgba(13,18,32,0.78)" stroke={stroke[tone]} strokeWidth={1} />
            <text x={left + width / 2} y={y} fontSize={size} fontWeight={600} fill={fill[tone]}
                textAnchor="middle" dominantBaseline="central">{text}</text>
        </g>
    );
}
