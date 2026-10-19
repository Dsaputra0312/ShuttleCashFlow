'use client';

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatRupiah } from '@/lib/money';

interface BarChartDataItem {
  label: string;
  pemasukan: number;
  pengeluaran: number;
}

interface BarChartProps {
  data: BarChartDataItem[];
  height?: number;
}

/** Format singkat Rupiah untuk label sumbu Y: Rp1,2jt */
function formatYAxis(value: number): string {
  if (value === 0) return 'Rp0';
  if (value >= 1_000_000) {
    const juta = value / 1_000_000;
    return `Rp${juta % 1 === 0 ? juta : juta.toFixed(1)}jt`;
  }
  if (value >= 1_000) {
    const ribu = value / 1_000;
    return `Rp${ribu % 1 === 0 ? ribu : ribu.toFixed(0)}rb`;
  }
  return formatRupiah(value);
}

const COLORS = {
  pemasukan: '#28408F',  // primary-700
  pengeluaran: '#F29BA7', // pink-500
};

/**
 * Grafik batang: batang pemasukan primary-700, pengeluaran pink-500.
 * Menggunakan Recharts ResponsiveContainer.
 */
export function BarChart({ data, height = 240 }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data.map((d) => ({ ...d, name: d.label }))}
        margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        barCategoryGap="30%"
      >
        <CartesianGrid
          strokeDasharray="4 4"
          stroke="#F1E4DE"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fontWeight: 500, fill: '#9096AA' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fontSize: 11, fontWeight: 500, fill: '#9096AA' }}
          axisLine={false}
          tickLine={false}
          width={56}
        />
        <Tooltip
          formatter={(value, name) => [
            typeof value === 'number' ? formatRupiah(value) : String(value),
            name === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
          ]}
          contentStyle={{
            borderRadius: '12px',
            border: '1px solid #F1E4DE',
            boxShadow: '0 4px 16px rgba(40,64,143,0.06)',
            fontSize: '12px',
          }}
        />
        <Legend
          formatter={(value: string) =>
            value === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'
          }
          wrapperStyle={{ fontSize: '12px' }}
        />
        <Bar
          dataKey="pemasukan"
          fill={COLORS.pemasukan}
          radius={[4, 4, 0, 0]}
          name="pemasukan"
        />
        <Bar
          dataKey="pengeluaran"
          fill={COLORS.pengeluaran}
          radius={[4, 4, 0, 0]}
          name="pengeluaran"
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
