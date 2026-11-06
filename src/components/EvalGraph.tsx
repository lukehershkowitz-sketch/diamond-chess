"use client";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";

export function EvalGraph({
  winPcts,
  ply,
  onSelect,
}: {
  winPcts: number[];
  ply: number;
  onSelect: (ply: number) => void;
}) {
  const data = winPcts.map((w, i) => ({ ply: i, w }));
  return (
    <div className="h-28 w-full cursor-pointer" aria-label="Evaluation graph. Click to jump to a move.">
      <ResponsiveContainer>
        <AreaChart
          data={data}
          margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          onClick={(s) => {
            const idx = Number(s?.activeLabel);
            if (Number.isFinite(idx)) onSelect(idx);
          }}
        >
          <XAxis dataKey="ply" hide />
          <YAxis domain={[0, 100]} hide />
          <ReferenceLine y={50} stroke="#888" strokeDasharray="3 3" />
          <ReferenceLine x={ply} stroke="#f59e0b" />
          <Area type="monotone" dataKey="w" stroke="#e5e5e5" fill="#e5e5e5" fillOpacity={0.85} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
