(function () {
  // Mobile menu
  var menuBtn = document.getElementById('menu-btn');
  var navLinks = document.getElementById('nav-links');
  function setMenu(open) {
    navLinks.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menuBtn.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
  }
  menuBtn.addEventListener('click', function () {
    setMenu(!navLinks.classList.contains('open'));
  });
  navLinks.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) {
      setMenu(false);
      menuBtn.focus();
    }
  });

  // "Forward to family": the phone's share sheet where there is one, otherwise copy the link
  var toast = document.getElementById('toast');
  var toastTimer;
  function showToast(text) {
    toast.textContent = text;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 3200);
  }
  var shareData = {
    title: 'Sangam Setu',
    text: 'Biodata forward karne se pehle ye dekhiye: Sangam Setu, verified profiles for families.',
    url: location.origin + location.pathname
  };
  function copyLink() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareData.url).then(function () {
        showToast('Link copied. Paste it in your family group.');
      }, function () {
        showToast('Copy this link: ' + shareData.url);
      });
    } else {
      showToast('Copy this link: ' + shareData.url);
    }
  }
  document.querySelectorAll('[data-share]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (navigator.share) {
        navigator.share(shareData).catch(function (err) {
          if (err && err.name !== 'AbortError') copyLink();
        });
      } else {
        copyLink();
      }
    });
  });

  // The floating forward button appears once the hero is out of view
  var fab = document.getElementById('fab');
  var hero = document.querySelector('.hero');
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      fab.classList.toggle('away', entries[0].isIntersecting);
    }).observe(hero);
  } else {
    fab.classList.remove('away');
  }

  // Tour: tabs switch both the description and the phone screen
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"][data-tab]'));
  var screens = document.querySelectorAll('[data-screen]');
  var navItems = document.querySelectorAll('[data-nav]');
  function selectTab(name, focus) {
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      if (on && focus) t.focus();
    });
    screens.forEach(function (s) {
      s.hidden = s.getAttribute('data-screen') !== name;
    });
    navItems.forEach(function (n) {
      n.classList.toggle('on', n.getAttribute('data-nav') === name);
    });
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () {
      selectTab(tab.getAttribute('data-tab'), false);
    });
    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) {
        e.preventDefault();
        selectTab(next.getAttribute('data-tab'), true);
      }
    });
  });
  // The phone's own bottom bar switches screens too
  navItems.forEach(function (n) {
    n.style.cursor = 'pointer';
    n.addEventListener('click', function () {
      selectTab(n.getAttribute('data-nav'), false);
    });
  });
})();
