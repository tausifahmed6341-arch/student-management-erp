import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  CreditCard,
  CheckCircle,
  Receipt,
  DollarSign,
  AlertCircle,
  Download,
  Printer,
  Plus,
  Building,
  Clock,
  X,
} from 'lucide-react';
import type { FeeStructure, FeePayment } from '../../types';

export const FeesView: React.FC = () => {
  const { token, user, isStudent, isAdmin, studentProfile } = useAuth();
  const [feeData, setFeeData] = useState<any>(null);
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Payment Form State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('2500');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [targetStudentId, setTargetStudentId] = useState('');
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  const fetchFeeData = async () => {
    if (!token) return;
    try {
      const studentId = studentProfile?.id || (user?.role === 'student' ? 'stu_alan_24CS001' : 'stu_alan_24CS001');
      const [studentFeeRes, structRes] = await Promise.all([
        fetch(`/api/fees/student/${studentId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/fees/structures', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (studentFeeRes.ok) {
        const sf = await studentFeeRes.json();
        setFeeData(sf);
        setTargetStudentId(sf.student?.id || studentId);
      }
      if (structRes.ok) {
        setStructures(await structRes.json());
      }
    } catch (e) {
      console.error('Error loading fee details:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeData();
  }, [token, studentProfile?.id, user?.id]);

  const handleMakePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount) return;
    setIsProcessingPay(true);

    try {
      const res = await fetch('/api/fees/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          student_id: targetStudentId,
          amount_paid: Number(paymentAmount),
          payment_method: paymentMethod,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setShowPaymentModal(false);
        fetchFeeData();
        // Load receipt
        handleViewReceipt(json.payment.id);
      }
    } catch (e) {
      console.error('Payment error:', e);
    } finally {
      setIsProcessingPay(false);
    }
  };

  const handleViewReceipt = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/fees/receipt/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedReceipt(data.receipt);
      }
    } catch (e) {
      console.error('Error fetching receipt:', e);
    }
  };

  return (
    <div id="erp_fees_view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Fee Management & Bursar Portal</h2>
          <p className="text-xs text-slate-500">
            Tuition obligation tracking, electronic payment logs, and university tax receipts.
          </p>
        </div>

        <button
          onClick={() => setShowPaymentModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
        >
          <CreditCard className="w-3.5 h-3.5" />
          {isAdmin ? 'Record Student Payment' : 'Pay Semester Dues'}
        </button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-500">Total Semester Obligation</span>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            ${feeData?.totalFeeObligation?.toLocaleString() || '3,200'}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Tuition, Labs & Campus Services</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-500">Total Paid to Date</span>
          <div className="text-3xl font-extrabold text-emerald-600 mt-2">
            ${feeData?.totalPaid?.toLocaleString() || '3,200'}
          </div>
          <span className="text-xs text-emerald-600 font-medium mt-1 inline-flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Verified by Bursar
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <span className="text-xs font-bold uppercase text-slate-500">Outstanding Balance</span>
          <div className={`text-3xl font-extrabold mt-2 ${feeData?.pendingBalance > 0 ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
            ${feeData?.pendingBalance?.toLocaleString() || '0'}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {feeData?.pendingBalance > 0 ? '⚠️ Due before exam week' : '✓ Zero outstanding dues'}
          </span>
        </div>
      </div>

      {/* Payment History & Receipts */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-600" />
            Transaction Ledger & Official Receipts
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {feeData?.payments?.length || 0} Transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-y border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Receipt No</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Method</th>
                <th className="py-2.5 px-3">Transaction ID</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {feeData?.payments?.map((pay: any) => (
                <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {pay.receipt_no}
                  </td>
                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{pay.payment_date}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono font-semibold text-[10px]">
                      {pay.payment_method}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">{pay.transaction_id}</td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                    ${pay.amount_paid.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-full font-semibold text-[10px] border border-emerald-200 dark:border-emerald-800">
                      {pay.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => handleViewReceipt(pay.id)}
                      className="px-2.5 py-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      View Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Logger Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                {isAdmin ? 'Record Fee Payment' : 'Pay Semester Tuition'}
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMakePayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Student</label>
                <input
                  type="text"
                  disabled
                  value={`${feeData?.student?.name || 'Student'} (${feeData?.student?.roll_number || '24CS001'})`}
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border rounded-lg text-slate-600 dark:text-slate-300"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Amount ($ USD)</label>
                <input
                  type="number"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                >
                  <option value="UPI">UPI / Instant Transfer</option>
                  <option value="NetBanking">Net Banking / Wire</option>
                  <option value="CreditCard">Credit / Debit Card</option>
                  <option value="BankDraft">University Demand Draft</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPay}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                >
                  {isProcessingPay ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedReceipt.organization.name}
                  </h4>
                  <p className="text-[10px] text-slate-500">Official Electronic Bursar Receipt</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl space-y-3 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-500">Receipt No:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedReceipt.receipt_no}</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="text-slate-700 dark:text-slate-300">{selectedReceipt.transaction_id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Date of Payment:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedReceipt.date}</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Student Name:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedReceipt.student.name}</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-slate-500">Roll Number:</span>
                  <span className="text-slate-700 dark:text-slate-300">{selectedReceipt.student.roll_number}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Program / Semester:</span>
                  <span className="text-slate-700 dark:text-slate-300">{selectedReceipt.student.batch}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedReceipt.fee_details.title}</p>
                  <p className="text-[10px] text-slate-500">Via {selectedReceipt.fee_details.payment_method}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-emerald-600">
                    ${selectedReceipt.fee_details.amount_paid.toLocaleString()}
                  </span>
                  <span className="block text-[10px] text-emerald-600 font-semibold">PAID & VERIFIED</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-slate-400">Authorized: Bursar Office</span>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Official Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
