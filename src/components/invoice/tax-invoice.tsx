'use client';

import { format } from 'date-fns';
import { Download, FileText, Printer, X } from 'lucide-react';
import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AdminOrder, Order } from '@/lib/types';
import { money } from '@/lib/utils';

export function TaxInvoiceModal({
  order,
  open,
  onOpenChange,
}: {
  order: Order | AdminOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const invoiceNumber = `INV-${new Date(order.createdAt).getFullYear()}-${(order.reference ?? order.id.slice(0, 8)).toUpperCase()}`;
  const invoiceDate = format(new Date(order.createdAt), 'dd MMMM yyyy');
  const addr = order.shippingAddress;

  // Approximate tax calculations (GST 18% standard split or from order taxMinor)
  const totalTax = order.taxMinor || Math.round((order.subtotalMinor - order.discountMinor) * 0.18 / 1.18);
  const taxableValue = (order.subtotalMinor - order.discountMinor) - totalTax;
  const isInterState = addr?.state && !['delhi', 'new delhi', 'dl'].includes(addr.state.toLowerCase());
  const cgst = isInterState ? 0 : Math.round(totalTax / 2);
  const sgst = isInterState ? 0 : Math.round(totalTax / 2);
  const igst = isInterState ? totalTax : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0 print:hidden bg-muted/30">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="size-4 text-[#187b7b]" />
            <span>Tax Invoice / Bill of Supply</span>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 text-xs font-semibold"
            >
              <Printer className="size-3.5" />
              <span>Print / Save PDF</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Printable Area */}
        <div
          ref={invoiceRef}
          className="p-6 sm:p-8 overflow-y-auto space-y-6 text-xs text-foreground bg-white text-black font-sans print:p-0 print:overflow-visible print:m-0"
          id="tax-invoice-printable"
        >
          {/* Header */}
          <div className="flex justify-between items-start border-b pb-4 gap-4">
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-[#187b7b]">ECOM STORE</h1>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">Premium Lifestyle & Essentials</p>
              <div className="mt-2 space-y-0.5 text-[11px] text-gray-600">
                <p><strong>GSTIN:</strong> 07AAAAA0000A1Z5</p>
                <p>Okhla Industrial Area, Phase-III, New Delhi, 110020, India</p>
                <p>Email: support@ecomstore.com | Phone: +91 98765 43210</p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <span className="inline-block px-2.5 py-1 bg-gray-100 text-gray-800 font-bold uppercase tracking-wider text-[10px] rounded">
                TAX INVOICE
              </span>
              <p className="font-mono font-bold text-sm text-gray-900 mt-1">{invoiceNumber}</p>
              <p className="text-gray-500 text-[11px]">Invoice Date: {invoiceDate}</p>
              <p className="text-gray-500 text-[11px]">
                Payment: <strong>{order.paymentMethod === 'cod' ? 'Cash on Delivery (COD)' : 'Online Paid (Cashfree)'}</strong>
              </p>
            </div>
          </div>

          {/* Billing & Shipping Section */}
          <div className="grid grid-cols-2 gap-6 bg-gray-50 p-3.5 rounded border border-gray-200">
            <div>
              <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-1">Billed & Shipped To:</p>
              <p className="font-bold text-gray-900 text-sm">{addr?.fullName || 'Customer'}</p>
              <p className="text-gray-600 mt-0.5">{addr?.line1}</p>
              {addr?.line2 && <p className="text-gray-600">{addr.line2}</p>}
              <p className="text-gray-600">
                {addr?.city}{addr?.state ? `, ${addr.state}` : ''} {addr?.postalCode}
              </p>
              <p className="text-gray-600">{addr?.country || 'India'}</p>
              {addr?.phone && <p className="text-gray-600 mt-1">Phone: {addr.phone}</p>}
              {Boolean((order as any).customerEmail) && <p className="text-gray-600">Email: {(order as any).customerEmail}</p>}
            </div>
            <div className="text-right space-y-1">
              <p className="font-bold text-gray-700 uppercase tracking-wider text-[10px] mb-1">Order Details:</p>
              <p className="text-gray-600">Order Ref: <strong>{order.reference ?? order.id}</strong></p>
              <p className="text-gray-600">Order Date: {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}</p>
              {order.trackingNumber && (
                <p className="text-gray-600">
                  AWB: <strong>{order.carrier || 'Courier'} - {order.trackingNumber}</strong>
                </p>
              )}
              <p className="text-gray-600">Place of Supply: <strong>{addr?.state || 'Delhi (07)'}</strong></p>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300 bg-gray-100 text-[11px] uppercase tracking-wider text-gray-700 font-bold">
                <th className="py-2 px-2 text-center w-8">#</th>
                <th className="py-2 px-2">Item & Description</th>
                <th className="py-2 px-2 text-center">HSN</th>
                <th className="py-2 px-2 text-center w-12">Qty</th>
                <th className="py-2 px-2 text-right">Unit Price</th>
                <th className="py-2 px-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {order.items.map((it, idx) => (
                <tr key={idx} className="text-gray-800">
                  <td className="py-2 px-2 text-center text-gray-500 font-mono">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <p className="font-semibold text-gray-900">{it.name}</p>
                    {it.variantLabel && (
                      <p className="text-[10px] text-gray-500">{it.variantLabel}</p>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center text-gray-500 font-mono text-[10px]">
                    {it.variantId ? it.variantId.slice(0, 6).toUpperCase() : '610910'}
                  </td>
                  <td className="py-2 px-2 text-center font-semibold">{it.quantity}</td>
                  <td className="py-2 px-2 text-right font-mono">
                    {money(it.unitAmountMinor, order.currency)}
                  </td>
                  <td className="py-2 px-2 text-right font-bold font-mono">
                    {money(it.unitAmountMinor * it.quantity, order.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Calculation Breakdown */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-1.5 text-xs text-gray-700">
              <div className="flex justify-between py-0.5 border-b border-gray-100">
                <span>Subtotal (Gross):</span>
                <span className="font-mono">{money(order.subtotalMinor, order.currency)}</span>
              </div>
              {order.discountMinor > 0 && (
                <div className="flex justify-between py-0.5 text-emerald-700 border-b border-gray-100">
                  <span>Discount {order.couponCode ? `(${order.couponCode})` : ''}:</span>
                  <span className="font-mono">-{money(order.discountMinor, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between py-0.5 border-b border-gray-100">
                <span>Shipping & Handling:</span>
                <span className="font-mono">{order.shippingMinor > 0 ? money(order.shippingMinor, order.currency) : 'FREE'}</span>
              </div>
              {!isInterState ? (
                <>
                  <div className="flex justify-between py-0.5 text-gray-600 text-[11px]">
                    <span>CGST (9%):</span>
                    <span className="font-mono">{money(cgst, order.currency)}</span>
                  </div>
                  <div className="flex justify-between py-0.5 text-gray-600 text-[11px] border-b border-gray-100">
                    <span>SGST (9%):</span>
                    <span className="font-mono">{money(sgst, order.currency)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between py-0.5 text-gray-600 text-[11px] border-b border-gray-100">
                  <span>IGST (18%):</span>
                  <span className="font-mono">{money(igst, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 font-extrabold text-sm text-gray-900 border-t-2 border-gray-900">
                <span>Grand Total (INR):</span>
                <span className="font-mono">{money(order.totalMinor, order.currency)}</span>
              </div>
            </div>
          </div>

          {/* Footer & Disclaimer */}
          <div className="border-t pt-4 flex justify-between items-end text-[10px] text-gray-500">
            <div className="space-y-0.5 max-w-sm">
              <p className="font-bold uppercase tracking-wider text-gray-700">Declaration & Terms:</p>
              <p>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
              <p>This is a computer-generated tax invoice and does not require physical signature.</p>
            </div>
            <div className="text-right">
              <div className="border-b border-gray-400 w-36 mb-1 pb-4">
                <span className="font-serif italic font-bold text-gray-700 text-xs">Ecom Store India</span>
              </div>
              <p className="font-bold text-gray-700">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
