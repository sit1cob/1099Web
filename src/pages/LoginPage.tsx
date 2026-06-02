import { useState, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const [vendorId, setVendorId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const heroImgRef = useRef<HTMLImageElement>(null);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!vendorId.trim()) {
      setError('Please enter Vendor ID');
      return;
    }
    if (!password.trim()) {
      setError('Please enter password');
      return;
    }

    setIsLoading(true);
    try {
      await login(vendorId, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };


  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroImgRef.current) return;
    const { clientX, clientY } = e;
    const x = (clientX / window.innerWidth - 0.5) * 20;
    const y = (clientY / window.innerHeight - 0.5) * 20;
    heroImgRef.current.style.transform = `scale(1.1) translate(${x}px, ${y}px)`;
    heroImgRef.current.style.transition = 'transform 0.1s ease-out';
  };

  const handleMouseLeave = () => {
    if (!heroImgRef.current) return;
    heroImgRef.current.style.transform = `scale(1) translate(0px, 0px)`;
    heroImgRef.current.style.transition = 'transform 0.5s ease-in-out';
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center overflow-hidden select-none font-sans relative"
      style={{ background: 'linear-gradient(180deg, #0d2d52 0%, #071a33 40%, #040e1e 100%)' }}
    >
      {/* Background decorative elements */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-600/8 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-200px] left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[420px] px-6 flex flex-col items-center py-10">

        {/* Hero Portraits */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-[120px] h-[120px] rounded-2xl border-[2.5px] border-blue-400/40 overflow-hidden shadow-[0_8px_32px_rgba(0,100,255,0.2)] -mr-5 z-10 rotate-[-4deg]">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFmsdVGCPFkJuk1qIqVeEzQw1Y96j1RD-aCx4pgza6m7eXyFQB4ZhelY4Wqrpu_Tb87mWBLP-xmKNyk05fqpCQRzv9pQljrluA1qEpr-08hRMHp_8cqW32uupnzpRyz9own35p85vS9RLa3u3gbB9DXBtX4GHg72J90XgrsaK66HwRec6uuOTet8_lQ9SruD5ZMvZWpsGmrzDro4sPXQRAwvfyYefISGlyIJq0iSDt6vdoYIHdUWF2vizIfnPc4FJEm1MgTdzRwHhZ"
              alt="Technician 1"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="w-[120px] h-[120px] rounded-2xl border-[2.5px] border-blue-400/40 overflow-hidden shadow-[0_8px_32px_rgba(0,100,255,0.2)] z-20 rotate-[4deg]">
            <img
              src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=300&h=300&fit=crop&crop=faces"
              alt="Technician 2"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Branding */}
        <p className="text-blue-200/80 text-[16px] font-semibold tracking-wider mb-1.5">Sears KAIros</p>
        <h1 className="text-white text-[52px] leading-[56px] font-black tracking-tight mb-2.5">
          Sasha<span className="text-[#fdc425]">1099</span>
        </h1>
        <p className="text-blue-300/50 text-[12px] font-extrabold uppercase tracking-[0.3em] mb-10">
          SEARS HOME SERVICES
        </p>

        {/* Login Card */}
        <div className="w-full bg-[#0b2240]/80 backdrop-blur-xl border border-blue-400/15 rounded-2xl px-7 py-8 shadow-[0_16px_64px_rgba(0,0,0,0.4)]">

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/15 border border-red-400/30 text-red-300 px-4 py-3 rounded-xl mb-5 text-sm font-medium">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email / Vendor ID */}
            <div>
              <label
                className="block text-[11px] tracking-[0.2em] font-extrabold text-blue-200/70 mb-2.5 uppercase text-center"
                htmlFor="vendorId"
              >
                EMAIL ADDRESS
              </label>
              <div className="relative">
                <input
                  className="w-full px-4 py-4 bg-[#071a33] border border-blue-300/20 rounded-xl text-white placeholder:text-blue-200/30 text-[15px] focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/20 transition-all"
                  id="vendorId"
                  type="text"
                  placeholder="Email address"
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-[11px] tracking-[0.2em] font-extrabold text-blue-200/70 mb-2.5 uppercase text-center"
                htmlFor="password"
              >
                PASSWORD
              </label>
              <div className="relative">
                <input
                  className="w-full px-4 py-4 bg-[#071a33] border border-blue-300/20 rounded-xl text-white placeholder:text-blue-200/30 text-[15px] focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-400/20 transition-all pr-12"
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-blue-300/40 hover:text-blue-200/70 transition-colors cursor-pointer text-[22px]"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'visibility_off' : 'visibility'}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#fdc425] to-[#e8a708] hover:from-[#ffe066] hover:to-[#fdc425] transition-all active:scale-[0.98] py-4 rounded-xl text-[#3d2e00] text-[18px] font-extrabold text-center flex items-center justify-center gap-2.5 group cursor-pointer disabled:opacity-60 shadow-[0_4px_20px_rgba(253,196,37,0.25)] mt-2"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
          </form>

        </div>

        {/* Footer */}
        <footer className="mt-14 flex items-center justify-center gap-2 text-blue-300/30 text-[12px] font-medium tracking-wide">
          <span>v2.0.4</span>
          <span className="text-blue-300/20">·</span>
          <span>Sears Home Services © 2026</span>
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;
