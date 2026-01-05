import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ChevronRight, Banknote, Loader } from 'lucide-react';
import CryptoJS from 'crypto-js'; // npm install crypto-js

interface Product {
  image: string;
  title: string;
  price: number;
}

interface LocationState {
  product: Product;
  quantity: number;
  totalAmount: number;
}

export default function PaymentGateway() {
  const location = useLocation();
  const navigate = useNavigate();
  const { product, quantity, totalAmount } = location.state as LocationState;

  const MERCHANT_NAME = import.meta.env.VITE_MERCHANT_NAME || 'Mahaseth Mobile All Solution';
  const TERMINAL_ID = import.meta.env.VITE_TERMINAL_ID || '2222610015419744';
  const MERCHANT_ADDRESS = import.meta.env.VITE_MERCHANT_ADDRESS || 'Kshireshwarnath MC';
  
  // FonePay credentials (get secret from FonePay merchant dashboard)
  const FONEPAY_SECRET_KEY = import.meta.env.VITE_FONEPAY_SECRET_KEY || '';

  // FonePay endpoint (use dev for testing; switch to live for production)
  const FONEPAY_ENDPOINT = 'https://dev-clientapi.fonepay.com/api/merchantRequest'; // Sandbox; live: https://clientapi.fonepay.com/api/merchantRequest

  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const fonepayFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const handleFocus = () => {
      if (isProcessing) {
        setIsProcessing(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isProcessing]);

  const getReturnUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/payment-success`; // Update to your success route; handle verification there
  };

  const handleFonePay = () => {
    if (!FONEPAY_SECRET_KEY) {
      alert('FonePay secret key missing. Add VITE_FONEPAY_SECRET_KEY to .env (get from FonePay dashboard).');
      return;
    }

    setIsLoading(true);
    setSelectedMethod('FonePay');
    setIsProcessing(true);

    const prn = `PRN-${Date.now()}`; // Payment Reference Number
    const amt = totalAmount.toFixed(2);
    const crn = 'NPR'; // Currency
    const dt = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const r1 = encodeURIComponent(product.title.substring(0, 50)); // Remarks 1 (product name)
    const r2 = encodeURIComponent(MERCHANT_NAME); // Remarks 2 (merchant name)
    const ru = encodeURIComponent(getReturnUrl()); // Return URL
    const pid = TERMINAL_ID; // Merchant ID (your terminal ID)
    const md = 'P'; // Payment mode: P for normal payment

    // Hash string: PID+MD+PRN+AMT+CRN+DT+R1+R2+RU
    const hashString = `${pid}${md}${prn}${amt}${crn}${dt}${r1}${r2}${ru}`;
    const hash = CryptoJS.HmacSHA512(hashString, FONEPAY_SECRET_KEY).toString(CryptoJS.enc.Hex).toUpperCase();

    const form = fonepayFormRef.current;
    if (form) {
      form.innerHTML = '';
      form.method = 'POST';
      form.action = FONEPAY_ENDPOINT;

      const fields = {
        PID: pid,
        MD: md,
        PRN: prn,
        AMT: amt,
        CRN: crn,
        DT: dt,
        R1: r1,
        R2: r2,
        RU: ru,
        DV: hash, // Digital Verification (hash)
      };

      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      form.submit(); // Redirects to FonePay, which allows wallet selection (Khalti, eSewa, IME, etc.) and opens app if installed
    }

    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const handleCOD = () => {
    alert('Order placed successfully with Cash on Delivery!');
    navigate('/');
  };

  const paymentMethods = [
    {
      id: 'fonepay',
      name: 'FonePay (Universal Wallet)',
      subtitle: 'Opens Khalti, eSewa, IME Pay, etc. - Enter PIN to pay',
      icon: 'https://fonepay.com/assets/images/logo.svg', // FonePay logo
      action: handleFonePay,
    },
    {
      id: 'cod',
      name: 'Cash on Delivery',
      subtitle: 'Pay when product arrives',
      icon: null,
      action: handleCOD,
    },
  ];

  if (isProcessing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <div className="flex justify-center mb-6">
            <Loader className="w-12 h-12 text-orange-600 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Redirecting to {selectedMethod}</h2>
          <p className="text-gray-600 mb-4">Opening payment page. Select your wallet (Khalti, eSewa, IME Pay, etc.) and enter PIN.</p>
          <p className="text-sm text-gray-500">Amount: Rs. {totalAmount}</p>
          <p className="text-sm text-gray-500 mt-2">Product: {product.title}</p>
          <button
            onClick={() => {
              setIsProcessing(false);
              setIsLoading(false);
            }}
            className="mt-6 w-full bg-gray-600 text-white py-2 rounded-lg font-semibold hover:bg-gray-700 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Hidden form for FonePay */}
      <form ref={fonepayFormRef} style={{ display: 'none' }} />

      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <h1 className="text-2xl font-bold">Select Payment Method</h1>
        </div>

        <div className="divide-y">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={method.action}
              disabled={isLoading}
              className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-100 disabled:opacity-50 transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center">
                  {method.icon ? (
                    <img src={method.icon} alt={method.name} className="w-10 h-10 object-contain" />
                  ) : (
                    <Banknote className="w-8 h-8 text-gray-600" />
                  )}
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold">{method.name}</h3>
                  <p className="text-sm text-gray-500">{method.subtitle}</p>
                </div>
              </div>
              <ChevronRight className="text-gray-400" />
            </button>
          ))}
        </div>

        <div className="p-6 border-t">
          <h2 className="font-semibold mb-4">Order Summary</h2>
          <div className="flex gap-4">
            <img src={product.image} alt={product.title} className="w-24 h-24 object-cover rounded border" />
            <div>
              <p className="font-medium line-clamp-2">{product.title}</p>
              <p className="text-sm text-gray-600">Quantity: {quantity}</p>
              <p className="text-sm text-gray-600">Price: Rs. {product.price}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between text-lg font-bold">
          <span>Total Amount</span>
          <span className="text-orange-600">Rs. {totalAmount}</span>
        </div>
      </div>
    </div>
  );
}