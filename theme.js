(function () {
  const THEME_KEY = 'saas-chat-theme';
  const toggle = document.getElementById('themeToggle');
  const icon = toggle?.querySelector('.theme-icon');

  const getTheme = () => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    if (icon) {
      icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  };

  const initTheme = () => {
    const theme = getTheme();
    setTheme(theme);
  };

  if (toggle) {
    toggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      setTheme(next);
    });
  }

  initTheme();

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_KEY)) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });
})();

