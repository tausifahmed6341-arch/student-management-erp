import { Router, Response } from 'express';
import { db } from '../db';
import { authenticateToken, authorizeRoles, canAccessStudent, AuthenticatedRequest } from '../auth';
import type { FeeStructure, FeePayment, Notification } from '../../src/types';

export const feesRouter = Router();

feesRouter.use(authenticateToken);

// GET /api/fees/structures
feesRouter.get('/structures', (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const structures = Array.from(db.feeStructures.values())
    .filter((f) => f.org_id === org_id)
    .map((s) => ({
      ...s,
      batch: db.batches.get(s.batch_id),
    }));

  return res.json(structures);
});

// POST /api/fees/structures
feesRouter.post('/structures', authorizeRoles('admin'), (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { batch_id, title, semester, total_amount, due_date, description } = req.body;

  if (!batch_id || !title || !total_amount || !due_date) {
    return res.status(400).json({ error: 'batch_id, title, total_amount, and due_date are required' });
  }

  const structure: FeeStructure = {
    id: `fee_${Date.now()}`,
    org_id,
    batch_id,
    title,
    semester: Number(semester) || 1,
    total_amount: Number(total_amount),
    due_date,
    description,
  };

  db.feeStructures.set(structure.id, structure);
  return res.status(201).json(structure);
});

// GET /api/fees/student/:student_id
feesRouter.get('/student/:student_id', (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { student_id } = req.params;

  const student = db.studentProfiles.get(student_id);
  if (!student || student.org_id !== org_id) {
    return res.status(404).json({ error: 'Student not found' });
  }
  if (!canAccessStudent(req, student.user_id)) return res.status(403).json({ error: 'You cannot view another student\'s fee record.' });

  const batch = db.batches.get(student.batch_id);
  const user = db.users.get(student.user_id);

  // Find fee structure for this batch
  const feeStructures = Array.from(db.feeStructures.values()).filter(
    (f) => f.org_id === org_id && f.batch_id === student.batch_id
  );

  const payments = Array.from(db.feePayments.values()).filter(
    (p) => p.student_id === student_id && p.org_id === org_id
  );

  const totalFeeObligation = feeStructures.reduce((sum, f) => sum + f.total_amount, 0);
  const totalPaid = payments
    .filter((p) => p.status === 'Success')
    .reduce((sum, p) => sum + p.amount_paid, 0);
  const pendingBalance = Math.max(0, totalFeeObligation - totalPaid);

  return res.json({
    student: {
      id: student.id,
      name: user?.name,
      roll_number: student.roll_number,
      batch: batch?.name,
      semester: batch?.current_semester,
    },
    totalFeeObligation,
    totalPaid,
    pendingBalance,
    isOverdue: pendingBalance > 0,
    feeStructures,
    payments,
  });
});

// POST /api/fees/pay (Payment logger for admin or student payment portal)
feesRouter.post('/pay', (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { student_id, fee_structure_id, amount_paid, payment_method } = req.body;

  if (!student_id || !amount_paid) {
    return res.status(400).json({ error: 'student_id and amount_paid are required' });
  }

  const student = db.studentProfiles.get(student_id);
  if (!student || student.org_id !== org_id) {
    return res.status(404).json({ error: 'Student not found' });
  }
  if (!canAccessStudent(req, student.user_id)) return res.status(403).json({ error: 'You cannot record a payment for another student.' });

  const targetFeeStructureId = fee_structure_id || Array.from(db.feeStructures.values()).find((f) => f.batch_id === student.batch_id)?.id || 'fee_default';
  const receiptNo = `REC-${new Date().getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`;
  const txnId = `TXN-${Date.now().toString().slice(-8)}`;

  const payment: FeePayment = {
    id: `pay_${Date.now()}`,
    org_id,
    student_id,
    fee_structure_id: targetFeeStructureId,
    amount_paid: Number(amount_paid),
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: payment_method || 'UPI',
    transaction_id: txnId,
    receipt_no: receiptNo,
    status: 'Success',
  };

  db.feePayments.set(payment.id, payment);

  // Create payment confirmation notification
  const notif: Notification = {
    id: `notif_fee_${Date.now()}`,
    org_id,
    user_id: student.user_id,
    title: '💳 Fee Payment Received',
    message: `Payment of $${payment.amount_paid} received successfully via ${payment.payment_method}. Receipt #${receiptNo}.`,
    type: 'system',
    is_read: false,
    created_at: new Date().toISOString(),
  };
  db.notifications.set(notif.id, notif);

  return res.status(201).json({
    message: 'Fee payment recorded successfully.',
    payment,
    receiptNo,
  });
});

// GET /api/fees/receipt/:payment_id (Generate official university receipt)
feesRouter.get('/receipt/:payment_id', (req: AuthenticatedRequest, res: Response) => {
  const org_id = req.user!.org_id;
  const { payment_id } = req.params;

  const payment = db.feePayments.get(payment_id);
  if (!payment || payment.org_id !== org_id) {
    return res.status(404).json({ error: 'Payment record not found' });
  }

  const student = db.studentProfiles.get(payment.student_id);
  const user = student ? db.users.get(student.user_id) : null;
  const batch = student ? db.batches.get(student.batch_id) : null;
  const org = db.organizations.get(org_id);
  const feeStructure = db.feeStructures.get(payment.fee_structure_id);

  return res.json({
    receipt: {
      receipt_no: payment.receipt_no,
      transaction_id: payment.transaction_id,
      date: payment.payment_date,
      organization: {
        name: org?.name || 'University ERP',
        code: org?.code,
        address: org?.address,
        phone: org?.phone,
      },
      student: {
        name: user?.name,
        roll_number: student?.roll_number,
        batch: batch?.name,
        semester: batch?.current_semester,
      },
      fee_details: {
        title: feeStructure?.title || 'Tuition and Campus Fees',
        amount_paid: payment.amount_paid,
        payment_method: payment.payment_method,
        status: payment.status,
      },
      authorized_by: 'Bursar Office & Financial Services',
    },
  });
});
