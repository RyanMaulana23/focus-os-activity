'use client';

import { useState, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { useUIStore } from '@/lib/stores/uiStore';
import { 
  User, 
  Lock, 
  Mail, 
  Camera, 
  Eye, 
  EyeOff, 
  LogIn, 
  UserPlus, 
  ShieldAlert, 
  CheckCircle,
  Sun,
  Moon
} from 'lucide-react';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80', // Female chic
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80', // Male professional
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80', // Female smiling
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80', // Male hipster
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80', // Female casual
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&h=150&q=80', // Male casual
];

export function AuthPage() {
  const { login, register, isLoading, error: authError, clearError } = useAuthStore();
  const { isLightMode, toggleTheme } = useUIStore();
  const [isLoginView, setIsLoginView] = useState(true);

  // Form states
  const [nama, setNama] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Custom states
  const [showPassword, setShowPassword] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [customAvatarBase64, setCustomAvatarBase64] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleView = () => {
    setIsLoginView(!isLoginView);
    setLocalError(null);
    clearError();
    setPassword('');
    setConfirmPassword('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setLocalError('Ukuran file maksimal adalah 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setCustomAvatarBase64(base64String);
      setSelectedAvatar(base64String);
      setLocalError(null);
    };
    reader.readAsDataURL(file);
  };

  const handlePresetSelect = (avatarUrl: string) => {
    setCustomAvatarBase64(null);
    setSelectedAvatar(avatarUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (isLoginView) {
      // Login validation
      if (!username.trim() || !password.trim()) {
        setLocalError('Mohon lengkapi seluruh kolom login.');
        return;
      }

      const success = await login(username, password);
      if (success) {
        setSuccessMsg('Berhasil masuk! Menyiapkan workspace Anda...');
      }
    } else {
      // Register validation
      if (!nama.trim() || !username.trim() || !email.trim() || !password.trim()) {
        setLocalError('Mohon isi seluruh kolom pendaftaran.');
        return;
      }

      if (username.trim().includes(' ')) {
        setLocalError('Username tidak boleh mengandung spasi.');
        return;
      }

      if (password.length < 5) {
        setLocalError('Password minimal harus 5 karakter.');
        return;
      }

      if (password !== confirmPassword) {
        setLocalError('Konfirmasi password tidak cocok.');
        return;
      }

      const success = await register(
        nama,
        username,
        email,
        password,
        selectedAvatar
      );

      if (success) {
        setSuccessMsg('Pendaftaran berhasil! Selamat datang di Focus OS.');
      }
    }
  };

  const currentError = localError || authError;

  return (
    <div className={`relative min-h-screen w-full flex items-center justify-center p-4 transition-all duration-300 overflow-y-auto ${
      isLightMode 
        ? 'bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 text-slate-800' 
        : 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white'
    }`}>
      {/* Theme Toggle in Auth Page */}
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={toggleTheme}
          className={`p-3 rounded-xl border transition-all duration-300 cursor-pointer active:scale-95 shadow-md ${
            isLightMode 
              ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200' 
              : 'bg-slate-900/80 hover:bg-slate-850 text-slate-200 border-slate-800'
          }`}
          title={isLightMode ? 'Ganti ke Mode Gelap' : 'Ganti ke Mode Terang'}
        >
          {isLightMode ? <Moon className="w-5 h-5 text-violet-500" /> : <Sun className="w-5 h-5 text-amber-400" />}
        </button>
      </div>

      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-violet-600/10 blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

      {/* Main Glassmorphic Container */}
      <div className={`relative w-full max-w-lg rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-500 transform scale-100 z-10 ${
        isLightMode 
          ? 'bg-white/80 border-slate-200/60 shadow-slate-300/40' 
          : 'bg-slate-900/65 border-slate-800/60 shadow-black/50'
      }`}>
        
        {/* Header Branding */}
        <div className="pt-8 px-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 logo-glow mb-4">
            <span className="text-2xl font-bold text-white">F</span>
          </div>
          <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
            isLightMode ? 'text-slate-900' : 'text-white'
          }`}>
            {isLoginView ? 'Masuk ke Focus OS' : 'Buat Akun Focus OS'}
          </h2>
          <p className={`text-xs sm:text-sm mt-2 font-medium ${
            isLightMode ? 'text-slate-500' : 'text-slate-400'
          }`}>
            {isLoginView 
              ? 'Kelola tugas, catatan, kebiasaan, dan playlist belajar offline Anda' 
              : 'Gabung untuk workspace produktivitas terisolasi yang modern'}
          </p>
        </div>

        {/* Auth Forms */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {/* Notifications */}
          {currentError && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 animate-shake">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm font-medium leading-relaxed">{currentError}</div>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 animate-pulse">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm font-medium leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* REGISTER VIEW ONLY: Name & Avatar selection */}
          {!isLoginView && (
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                  isLightMode ? 'text-slate-650' : 'text-slate-400'
                }`}>
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                    placeholder="Contoh: Budi Santoso"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm border outline-none transition-all ${
                      isLightMode 
                        ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500' 
                        : 'bg-slate-950/60 border-slate-800 text-white focus:bg-slate-950 focus:border-violet-500 focus:ring-1 focus:ring-violet-500'
                    }`}
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                  isLightMode ? 'text-slate-650' : 'text-slate-400'
                }`}>
                  Foto Profil / Avatar
                </label>
                
                <div className="flex items-center gap-4">
                  {/* Current Active Avatar */}
                  <div className="relative group w-16 h-16 rounded-xl border-2 border-violet-500 overflow-hidden flex-shrink-0 bg-slate-800">
                    <img 
                      src={selectedAvatar} 
                      alt="Selected Profile" 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      title="Upload foto kustom"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Preset / Upload selectors */}
                  <div className="flex-1">
                    <div className="text-xs text-slate-400 mb-1.5 font-medium">Pilih avatar default atau upload:</div>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {PRESET_AVATARS.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handlePresetSelect(url)}
                          className={`w-8 h-8 rounded-lg overflow-hidden border-2 transition-transform duration-200 active:scale-90 ${
                            selectedAvatar === url ? 'border-violet-500 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={url} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                      
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`px-2 py-1 h-8 rounded-lg text-xs font-semibold flex items-center gap-1 border border-dashed transition-all active:scale-95 ${
                          customAvatarBase64 
                            ? 'border-violet-500 text-violet-500 bg-violet-50/10' 
                            : 'border-slate-600 hover:border-slate-400 text-slate-400'
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Upload
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Username / Email */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
              isLightMode ? 'text-slate-650' : 'text-slate-400'
            }`}>
              {isLoginView ? 'Username atau Email' : 'Username'}
            </label>
            <div className="relative">
              {isLoginView ? (
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              ) : (
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              )}
              <input
                type={isLoginView ? "text" : "text"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder={isLoginView ? "Ketik username atau email" : "Ketik username unik"}
                className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm border outline-none transition-all ${
                  isLightMode 
                    ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500' 
                    : 'bg-slate-950/60 border-slate-800 text-white focus:bg-slate-950 focus:border-violet-500 focus:ring-1 focus:ring-violet-500'
                }`}
              />
            </div>
          </div>

          {/* REGISTER VIEW ONLY: Email Field */}
          {!isLoginView && (
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                isLightMode ? 'text-slate-650' : 'text-slate-400'
              }`}>
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Contoh: user@email.com"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm border outline-none transition-all ${
                    isLightMode 
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500' 
                      : 'bg-slate-950/60 border-slate-800 text-white focus:bg-slate-950 focus:border-violet-500 focus:ring-1 focus:ring-violet-500'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
              isLightMode ? 'text-slate-650' : 'text-slate-400'
            }`}>
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm border outline-none transition-all ${
                  isLightMode 
                    ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500' 
                    : 'bg-slate-950/60 border-slate-800 text-white focus:bg-slate-950 focus:border-violet-500 focus:ring-1 focus:ring-violet-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* REGISTER VIEW ONLY: Confirm Password */}
          {!isLoginView && (
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                isLightMode ? 'text-slate-650' : 'text-slate-400'
              }`}>
                Konfirmasi Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-10 py-3 rounded-xl text-sm border outline-none transition-all ${
                    isLightMode 
                      ? 'bg-slate-50 border-slate-200 text-slate-900 focus:bg-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500' 
                      : 'bg-slate-950/60 border-slate-800 text-white focus:bg-slate-950 focus:border-violet-500 focus:ring-1 focus:ring-violet-500'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3.5 rounded-xl font-bold text-sm tracking-wide text-white bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses...
              </span>
            ) : isLoginView ? (
              <>
                <LogIn className="w-4 h-4" />
                Masuk Sekarang
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Daftar Akun Baru
              </>
            )}
          </button>
        </form>

        {/* Separator / Switch View */}
        <div className={`p-6 text-center border-t text-sm font-medium ${
          isLightMode ? 'border-slate-100 text-slate-550' : 'border-slate-800/80 text-slate-400'
        }`}>
          {isLoginView ? (
            <>
              Belum memiliki akun Focus OS?{' '}
              <button
                type="button"
                onClick={handleToggleView}
                className="text-violet-500 hover:text-violet-400 font-bold hover:underline cursor-pointer active:scale-95 transition-all"
              >
                Daftar Akun Baru
              </button>
            </>
          ) : (
            <>
              Sudah memiliki akun?{' '}
              <button
                type="button"
                onClick={handleToggleView}
                className="text-violet-500 hover:text-violet-400 font-bold hover:underline cursor-pointer active:scale-95 transition-all"
              >
                Masuk Sekarang
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
