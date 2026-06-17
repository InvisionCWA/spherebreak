(function () {
  const body = document.body;
  const nav = document.getElementById('site-nav');
  const toggle = document.querySelector('.menu-toggle');
  const refreshButton = document.querySelector('.leaderboard-refresh');
  const allTimeRoot = document.getElementById('leaderboard-alltime');
  const weeklyRoot = document.getElementById('leaderboard-weekly');
  const playLinks = document.querySelectorAll('.play-link');
  const query = new URLSearchParams(window.location.search);

  function getSafePlayUrl(candidate) {
    const fallback = body.dataset.playUrl || '/';
    const value = typeof candidate === 'string' ? candidate.trim() : '';
    if (!value) return fallback;

    if (window.location.protocol === 'file:') {
      return value.startsWith('/') && !value.startsWith('//') ? value : fallback;
    }

    try {
      const parsed = new URL(value, window.location.origin);
      if (parsed.origin !== window.location.origin) return fallback;
      if (!/^https?:$/.test(parsed.protocol)) return fallback;
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch (_error) {
      return fallback;
    }
  }

  const configuredPlayUrl = getSafePlayUrl(body.dataset.playUrl || '/');
  playLinks.forEach((link) => {
    link.setAttribute('href', configuredPlayUrl);
  });

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      const next = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', next);
      toggle.setAttribute('aria-expanded', String(next));
    });

    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', function () {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function getApiBase() {
    const configured = query.get('api') || body.dataset.apiBase;
    if (configured) return configured.replace(/\/$/, '');
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
      return window.location.origin;
    }
    return 'http://localhost:3000';
  }

  function createShell(className, title, copy) {
    const shell = document.createElement('div');
    shell.className = className;

    const label = document.createElement('p');
    const labelClasses = {
      'loading-shell': 'loading-copy',
      'error-shell': 'error-copy',
      'empty-shell': 'empty-copy',
    };
    label.className = labelClasses[className] || 'empty-copy';
    label.textContent = title;
    shell.appendChild(label);

    const text = document.createElement('p');
    text.className = 'leaderboard-note';
    text.textContent = copy;
    shell.appendChild(text);

    return shell;
  }

  function renderLoading(root) {
    root.replaceChildren();
    const shell = createShell('loading-shell', 'Loading', 'Contacting the public leaderboard service.');
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    shell.prepend(spinner);
    root.appendChild(shell);
  }

  function renderEmpty(root, copy) {
    root.replaceChildren(createShell('empty-shell', 'No ranked data yet', copy));
  }

  function renderError(root, copy) {
    root.replaceChildren(createShell('error-shell', 'Leaderboard unavailable', copy));
  }

  function formatPercent(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 'N/A';
    return `${Math.round(numeric * 100)}%`;
  }

  function formatMs(value) {
    if (!Number.isFinite(value)) return 'No record';
    return `${Math.round(value)} ms`;
  }

  function appendStat(container, label, value) {
    const chip = document.createElement('span');
    chip.className = 'stat-chip';
    chip.textContent = `${label}: ${value}`;
    container.appendChild(chip);
  }

  function renderAllTime(entries) {
    allTimeRoot.replaceChildren();

    if (!Array.isArray(entries) || entries.length === 0) {
      renderEmpty(allTimeRoot, 'Complete a ranked match to appear in the all-time standings.');
      return;
    }

    const list = document.createElement('ol');
    list.className = 'leaderboard-list';

    entries.slice(0, 6).forEach((entry) => {
      const item = document.createElement('li');
      item.className = 'leaderboard-row';

      const top = document.createElement('div');
      top.className = 'leaderboard-row__top';

      const name = document.createElement('div');
      name.className = 'leaderboard-name';
      name.textContent = `${entry.rank}. ${entry.displayName}`;
      top.appendChild(name);

      if (entry.isBot) {
        const badge = document.createElement('span');
        badge.className = 'status-badge';
        badge.textContent = 'Bot account';
        top.appendChild(badge);
      }

      const rating = document.createElement('span');
      rating.className = 'rank-pill';
      rating.textContent = `Rating ${entry.rating}`;
      top.appendChild(rating);

      const stats = document.createElement('div');
      stats.className = 'leaderboard-row__stats';
      appendStat(stats, 'Record', `${entry.wins}W-${entry.losses}L`);
      appendStat(stats, 'Win rate', formatPercent(entry.winRate));
      appendStat(stats, 'Best score', entry.bestScore);
      appendStat(stats, 'Best combo', entry.bestCombo);
      appendStat(stats, 'Best streak', entry.bestStreak);
      appendStat(stats, 'Fastest Break', formatMs(entry.fastestValidBreakMs));

      item.append(top, stats);
      list.appendChild(item);
    });

    allTimeRoot.appendChild(list);
  }

  function renderWeekly(entries) {
    weeklyRoot.replaceChildren();

    if (!Array.isArray(entries) || entries.length === 0) {
      renderEmpty(weeklyRoot, 'Ranked weekly standings fill once recent matches are recorded.');
      return;
    }

    const list = document.createElement('ol');
    list.className = 'leaderboard-list';

    entries.slice(0, 6).forEach((entry) => {
      const item = document.createElement('li');
      item.className = 'leaderboard-row';

      const top = document.createElement('div');
      top.className = 'leaderboard-row__top';

      const name = document.createElement('div');
      name.className = 'leaderboard-name';
      name.textContent = `${entry.rank}. ${entry.displayName}`;

      const score = document.createElement('span');
      score.className = 'rank-pill';
      score.textContent = `${entry.weeklyScore} pts`;

      top.append(name, score);

      const stats = document.createElement('div');
      stats.className = 'leaderboard-row__stats';
      appendStat(stats, 'Matches', entry.matches);
      appendStat(stats, 'Window', 'Last 7 days');

      item.append(top, stats);
      list.appendChild(item);
    });

    weeklyRoot.appendChild(list);
  }

  async function fetchLeaderboard(period) {
    const response = await fetch(`${getApiBase()}/api/leaderboard?period=${encodeURIComponent(period)}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Leaderboard request failed with ${response.status}`);
    }

    const payload = await response.json();
    return Array.isArray(payload.entries) ? payload.entries : [];
  }

  async function loadLeaderboards() {
    renderLoading(allTimeRoot);
    renderLoading(weeklyRoot);

    const [allTimeResult, weeklyResult] = await Promise.allSettled([
      fetchLeaderboard('all-time'),
      fetchLeaderboard('weekly'),
    ]);

    if (allTimeResult.status === 'fulfilled') {
      renderAllTime(allTimeResult.value);
    } else {
      console.error('Failed to load all-time leaderboard:', allTimeResult.reason);
      renderError(allTimeRoot, 'The public ranked feed could not be loaded right now. Try refreshing again shortly.');
    }

    if (weeklyResult.status === 'fulfilled') {
      renderWeekly(weeklyResult.value);
    } else {
      console.error('Failed to load weekly leaderboard:', weeklyResult.reason);
      renderError(weeklyRoot, 'Weekly standings are temporarily unavailable. No client-side writes were attempted.');
    }

  }
  if (refreshButton) {
    refreshButton.addEventListener('click', loadLeaderboards);
  }

  loadLeaderboards();
})();
