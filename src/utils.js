// ==========================================
// UTILITIES MODULE (shared helpers)
// ==========================================

export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'info';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error')   icon = 'alert-triangle';

  toast.innerHTML = `<i data-lucide="${icon}"></i><span>${message}</span>`;
  container.appendChild(toast);

  if (window.lucide) window.lucide.createIcons();

  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
