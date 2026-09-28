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

  // Privacy demo: profile before and after a request is accepted
  var notes = {
    before: 'Before a request is accepted, the contact number is locked. The address shows only the city and state.',
    after: 'After acceptance, both sides see the contact person and number. The address still shows only the city and state.'
  };
  var demoButtons = document.querySelectorAll('[data-demo]');
  var demoScreens = document.querySelectorAll('[data-demo-screen]');
  var demoNote = document.getElementById('demo-note');
  demoButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var state = btn.getAttribute('data-demo');
      demoButtons.forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      demoScreens.forEach(function (s) {
        s.hidden = s.getAttribute('data-demo-screen') !== state;
      });
      demoNote.textContent = notes[state];
    });
  });

  // App tour: tabs switch both the description panel and the phone screen
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
  // The phone's own bottom bar works too, for mouse and touch users
  navItems.forEach(function (n) {
    n.style.cursor = 'pointer';
    n.addEventListener('click', function () {
      selectTab(n.getAttribute('data-nav'), false);
    });
  });
})();
