import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import {
  Radio,
  Fingerprint,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wifi,
  Sparkles,
  User,
} from 'lucide-react';

export const BiometricsSimulatorView: React.FC = () => {
  const { token, user, organization } = useAuth();
  const { isConnected } = useSocket();

  const [deviceId, setDeviceId] = useState('GATE_01_MAIN_PORTAL');
  const [rollNumber, setRollNumber] = useState('24CS001');
  const [verificationStatus, setVerificationStatus] = useState<'SUCCESS' | 'FAILED'>('SUCCESS');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const [recentScans, setRecentScans] = useState<Array<{
    id: string;
    roll: string;
    studentName: string;
    device: string;
    time: string;
    status: 'SUCCESS' | 'FAILED';
  }>>([
    {
      id: 'scan_1',
      roll: '24CS001',
      studentName: 'Alan Turing',
      device: 'GATE_01_MAIN_PORTAL',
      time: '09:02:14 AM',
      status: 'SUCCESS',
    },
    {
      id: 'scan_2',
      roll: '24CS002',
      studentName: 'Grace Hopper',
      device: 'LAB_CS_202_SCANNER',
      time: '09:04:45 AM',
      status: 'SUCCESS',
    },
  ]);

  const handleSimulateScan = async () => {
    if (!rollNumber.trim()) return;
    setIsScanning(true);
    setScanResult(null);

    try {
      const res = await fetch('/api/attendance/biometric/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          device_id: deviceId,
          student_roll_number: rollNumber,
          timestamp: new Date().toISOString(),
          verification_status: verificationStatus,
        }),
      });

      const json = await res.json();
      setScanResult({
        ok: res.ok,
        data: json,
      });

      if (res.ok) {
        const newEntry = {
          id: `scan_${Date.now()}`,
          roll: rollNumber,
          studentName: json.student?.name || 'Verified Student',
          device: deviceId,
          time: new Date().toLocaleTimeString(),
          status: verificationStatus,
        };
        setRecentScans((prev) => [newEntry, ...prev.slice(0, 9)]);
      }
    } catch (e: any) {
      setScanResult({ ok: false, data: { error: e.message || 'Hardware bridge error' } });
    } finally {
      setIsScanning(false);
    }
  };

  const sampleRolls = ['24CS001', '24CS002', '24CS003', '24CS004', '24CS005'];

  return (
    <div id="erp_biometrics_view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Biometric Hardware Bridge (Layer 6)</h2>
          <p className="text-xs text-slate-500">
            Simulates optical fingerprint and RFID hardware punches, immediately dispatching real-time WebSocket room events.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            Hardware Bridge Online
          </span>
        </div>
      </div>

      {/* Hardware Simulator Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Terminal Device Panel */}
        <div className="lg:col-span-7 bg-white text-slate-800 rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/80 flex items-center justify-center border border-indigo-400/40 text-amber-300">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Biometric Scanner Device Simulator</h3>
                <p className="text-[10px] text-slate-400 font-mono">Firmware: v3.2.0 • Socket Protocol: TCP/WSS</p>
              </div>
            </div>

            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-md font-mono border border-indigo-500/30">
              {organization?.code || 'APEX'}
            </span>
          </div>

          {/* Quick Roll Picker */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Quick Student Roll Picker
            </label>
            <div className="flex flex-wrap gap-1.5">
              {sampleRolls.map((r) => (
                <button
                  key={r}
                  onClick={() => setRollNumber(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    rollNumber === r
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">Student Roll Number / RFID UID</label>
              <input
                type="text"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. 24CS001"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Hardware Terminal Device</label>
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="GATE_01_MAIN_PORTAL">Gate 01 - Main Campus Portal</option>
                <option value="LAB_CS_202_SCANNER">Lab CS 202 - Optical Terminal</option>
                <option value="LIBRARY_RFID_GATE">Library - North Turnstile</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-medium mb-1 text-xs">Optical Sensor Verification Output</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="vstatus"
                  checked={verificationStatus === 'SUCCESS'}
                  onChange={() => setVerificationStatus('SUCCESS')}
                  className="accent-indigo-600"
                />
                <span>SUCCESS (Match Score &gt; 98%)</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="vstatus"
                  checked={verificationStatus === 'FAILED'}
                  onChange={() => setVerificationStatus('FAILED')}
                  className="accent-indigo-600"
                />
                <span>FAILED (Unrecognized / Rejected)</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleSimulateScan}
            disabled={isScanning || !rollNumber}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-98 cursor-pointer shadow-lg shadow-indigo-600/30 disabled:opacity-50"
          >
            <Fingerprint className="w-5 h-5 text-amber-300" />
            {isScanning ? 'Transmitting Optical Signal...' : 'Trigger Biometric Hardware Punch'}
          </button>

          {/* Result Alert */}
          {scanResult && (
            <div className={`p-4 rounded-xl text-xs flex items-start gap-3 border ${
              scanResult.ok
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {scanResult.ok ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">{scanResult.data?.message || scanResult.data?.error}</p>
                {scanResult.ok && (
                  <p className="mt-1 font-mono text-[11px] text-emerald-300">
                    Broadcasted to: room:org_{organization?.id || 'org_apex'}, room:user_{scanResult.data?.student?.id}, room:batch_{scanResult.data?.student?.batch_id}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Live Terminal Punch Stream */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-indigo-600 animate-pulse" />
              Live Hardware Punch Stream
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">WebSockets (Socket.io)</span>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
            {recentScans.map((scan) => (
              <div
                key={scan.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs flex items-start justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{scan.roll}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{scan.studentName}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{scan.device}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold font-mono ${
                    scan.status === 'SUCCESS'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {scan.status}
                  </span>
                  <span className="block text-[10px] text-slate-400 mt-1">{scan.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
