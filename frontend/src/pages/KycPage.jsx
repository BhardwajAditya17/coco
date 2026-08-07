import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Smartphone, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw, 
  CreditCard,
  Building2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const API_BASE_URL = 'http://localhost:5002/api/v1';

export default function KycPage() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  // Onboarding Wizard Steps: 1 = Enter ID, 2 = Verify OTP, 3 = Completed
  const [step, setStep] = useState(1);
  
  // Form State
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [clientRefId, setClientRefId] = useState('');
  
  // UI & Feedback State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Resend OTP Countdown Timer
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let interval = null;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      setCanResend(true);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleAadhaarChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (rawValue.length <= 12) {
      setAadhaarNumber(rawValue);
    }
  };

  const formattedAadhaar = aadhaarNumber
    .replace(/(\d{4})/g, '$1 ')
    .trim();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  };

  const handleInitiateOtp = async (e) => {
    e.preventDefault();
    setError('');
    
    if (aadhaarNumber.length !== 12) {
      setError('Please enter a valid 12-digit identification number.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/kyc/initiate-otp`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ aadhaar_number: aadhaarNumber }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to trigger OTP verification.');
      }

      setClientRefId(data.client_ref_id || '');
      setSuccessMsg('OTP sent successfully to your mobile number.');
      setStep(2);
      setTimer(60);
      setCanResend(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    if (otp.length !== 6) {
      setError('Please enter the full 6-digit OTP received on your mobile.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/kyc/verify-otp`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          otp, 
          client_ref_id: clientRefId 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed. Please check the OTP.');
      }

      // Update Auth context state so route guards register the verification immediately
      if (updateUser) {
        updateUser({ aadhaar_status: 'verified' });
      }

      setSuccessMsg('Identity verified successfully!');
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = () => {
    if (!canResend) return;
    setOtp('');
    handleInitiateOtp({ preventDefault: () => {} });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <ShieldCheck className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Identity Verification (KYC)
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600">
          Complete e-KYC to unlock account access and view the community feed
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-2xl sm:px-10">
          
          <div className="mb-8">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
              <span className={step >= 1 ? 'text-blue-600 font-bold' : ''}>1. Identification</span>
              <span className={step >= 2 ? 'text-blue-600 font-bold' : ''}>2. Mobile OTP</span>
              <span className={step === 3 ? 'text-green-600 font-bold' : ''}>3. Verified</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-blue-600 h-1.5 transition-all duration-500 ease-out"
                style={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
              />
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleInitiateOtp} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  12-Digit Identification Number
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={formattedAadhaar}
                    onChange={handleAadhaarChange}
                    placeholder="0000 0000 0000"
                    className="block w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg text-slate-900 tracking-wider"
                    required
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Your ID is processed securely via e-KYC servers.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || aadhaarNumber.length !== 12}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Send OTP <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="text-center mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600 mb-2">
                  <Smartphone className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-600">
                  Enter the 6-digit OTP sent to the mobile number linked with ID ending in <span className="font-semibold text-slate-800">****{aadhaarNumber.slice(-4)}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 text-center">
                  Enter 6-Digit OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="------"
                  className="block w-full text-center py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-2xl tracking-[0.5em] text-slate-900"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  'Verify & Continue'
                )}
              </button>

              <div className="text-center pt-2">
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-500 flex items-center justify-center gap-1 mx-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Resend OTP
                  </button>
                ) : (
                  <p className="text-xs text-slate-500">
                    Resend OTP in <span className="font-mono font-semibold text-slate-700">{timer}s</span>
                  </p>
                )}
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="text-center py-4 space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">KYC Verification Complete</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Your identity has been verified successfully.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Verification Status:</span>
                  <span className="font-semibold text-green-600">VERIFIED</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Next Required Step:</span>
                  <span className="font-semibold text-slate-800">Fee Payment / Platform Access</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/payment')}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shadow-md shadow-green-600/20 transition-all cursor-pointer"
              >
                Proceed to Payment <CreditCard className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}