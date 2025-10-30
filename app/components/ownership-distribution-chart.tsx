import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface OwnershipData {
  name: string;
  value: number;
  color: string;
}

interface OwnershipDistributionChartProps {
  data?: OwnershipData[];
  height?: number;
}

/**
 * Default mock data for ownership distribution
 */
const defaultData: OwnershipData[] = [
  { name: "You", value: 450000, color: "#3b82f6" },
  { name: "Other Players", value: 350000, color: "#8b5cf6" },
  { name: "Companies", value: 200000, color: "#10b981" },
];

export function OwnershipDistributionChart({
  data = defaultData,
  height = 256,
}: OwnershipDistributionChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const formattedData = data.map((item) => ({
    ...item,
    percentage: ((item.value / total) * 100).toFixed(1),
  }));

  return (
    <div className="w-full">
      <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
        {formattedData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div>
              <div className="text-muted-foreground text-xs">{item.name}</div>
              <div className="font-semibold">{item.percentage}%</div>
            </div>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={formattedData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            animationDuration={800}
          >
            {formattedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any) => {
              const percentage = ((value / total) * 100).toFixed(1);
              return `${percentage}%`;
            }}
            contentStyle={{
              backgroundColor: "#1f2937",
              border: "1px solid #374151",
              borderRadius: "0.5rem",
              padding: "0.75rem",
              color: "#e5e7eb",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
