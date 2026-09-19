// src/utils/mobile.js
// Detecta si el usuario está en un celular (por User-Agent + Touch)

export function esMobile() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

export function esTouch() {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function esMobileSeguro() {
  return esMobile() || esTouch();
}