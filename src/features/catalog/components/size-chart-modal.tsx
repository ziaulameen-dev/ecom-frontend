'use client';

import Image from 'next/image';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn, mediaSrc } from '@/lib/utils';

interface SizeChartModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sizeChartImageUrl?: string | null;
  sizeTableColumns?: string[] | null;
  sizeTableRows?: string[][] | null;
}

const MEASUREMENTS_INCHES = [
  { size: 'XS', chest: '38', length: '28', shoulder: '18.5' },
  { size: 'S', chest: '40', length: '29', shoulder: '19.5' },
  { size: 'M', chest: '42', length: '30', shoulder: '20.5' },
  { size: 'L', chest: '44', length: '31', shoulder: '21.5' },
  { size: 'XL', chest: '46', length: '32', shoulder: '22.5' },
  { size: 'XXL', chest: '48', length: '32.5', shoulder: '23.5' },
  { size: 'XXXL', chest: '50', length: '33', shoulder: '24.5' },
];

const MEASUREMENTS_CMS = [
  { size: 'XS', chest: '96.5', length: '71.1', shoulder: '47.0' },
  { size: 'S', chest: '101.6', length: '73.7', shoulder: '49.5' },
  { size: 'M', chest: '106.7', length: '76.2', shoulder: '52.1' },
  { size: 'L', chest: '111.8', length: '78.7', shoulder: '54.6' },
  { size: 'XL', chest: '116.8', length: '81.3', shoulder: '57.2' },
  { size: 'XXL', chest: '121.9', length: '82.6', shoulder: '59.7' },
  { size: 'XXXL', chest: '127.0', length: '83.8', shoulder: '62.2' },
];

export function SizeChartModal({
  open,
  onOpenChange,
  sizeChartImageUrl,
  sizeTableColumns,
  sizeTableRows,
}: SizeChartModalProps) {
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const rows = unit === 'in' ? MEASUREMENTS_INCHES : MEASUREMENTS_CMS;

  const hasCustomTable = Boolean(sizeTableColumns?.length && sizeTableRows?.length);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-center font-bold text-gray-900">
            SIZE CHART
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto overflow-x-hidden flex-1 min-w-0">
          {/* Custom Size Chart Image */}
          {sizeChartImageUrl && (
            <div className="space-y-1">
              <div className="relative w-full aspect-[4/3] rounded-xs overflow-hidden border border-gray-200 bg-gray-50">
                <Image
                  src={mediaSrc(sizeChartImageUrl)}
                  alt="Size Guide Chart"
                  fill
                  className="object-contain"
                />
              </div>
              <p className="text-[11px] text-gray-500 text-center">
                *Size guide reference chart.
              </p>
            </div>
          )}

          {/* Custom Admin Table (if defined on Attribute) */}
          {hasCustomTable ? (
            <div className="space-y-1">
              <div className="overflow-x-auto border border-gray-200 rounded-xs">
                <table className="min-w-max w-full text-center text-xs">
                  <thead className="bg-gray-100 font-bold text-gray-700 uppercase border-b border-gray-200">
                    <tr>
                      {sizeTableColumns?.map((col, i) => (
                        <th key={i} className="py-2.5 px-3 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-800">
                    {sizeTableRows?.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-gray-50">
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={cn(
                              'py-2.5 px-3 whitespace-nowrap',
                              cIdx === 0 && 'font-bold text-gray-900'
                            )}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : !sizeChartImageUrl ? (
            /* Standard Fallback Measurement Table */
            <>
              <div className="flex justify-center my-2">
                <div className="inline-flex rounded-xs border border-gray-200 p-1 bg-gray-50">
                  <button
                    type="button"
                    onClick={() => setUnit('in')}
                    className={cn(
                      'px-4 py-1.5 text-xs font-semibold rounded-xs transition-colors',
                      unit === 'in'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-900'
                    )}
                  >
                    Inches
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnit('cm')}
                    className={cn(
                      'px-4 py-1.5 text-xs font-semibold rounded-xs transition-colors',
                      unit === 'cm'
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-900'
                    )}
                  >
                    Cms
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xs">
                <table className="min-w-max w-full text-center text-xs">
                  <thead className="bg-gray-100 font-bold text-gray-700 uppercase border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">Size</th>
                      <th className="py-2.5 px-3">Chest ({unit})</th>
                      <th className="py-2.5 px-3">Length ({unit})</th>
                      <th className="py-2.5 px-3">Shoulder ({unit})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-gray-800">
                    {rows.map((row) => (
                      <tr key={row.size} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-bold text-gray-900">{row.size}</td>
                        <td className="py-2.5 px-3">{row.chest}</td>
                        <td className="py-2.5 px-3">{row.length}</td>
                        <td className="py-2.5 px-3">{row.shoulder}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-gray-500 text-center mt-1">
                *Garment measurements in {unit === 'in' ? 'inches' : 'centimeters'}. Recommended to buy your true size.
              </p>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
