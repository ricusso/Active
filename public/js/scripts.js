$(document).ready(function() {
  const $sidebar = $('#sidebar');
  const $mobileSidebar = $('#mobileSidebar');
  const $overlay = $('#sidebarOverlay');
  const $toggle = $('#sidebarToggle');
  const $burgerBtn = $('#burgerBtn');

  if ($toggle.length) {
    $toggle.on('click', function(e) {
      e.preventDefault();
      $sidebar.toggleClass('collapsed');
      $('body').toggleClass('sidebar-collapsed', $sidebar.hasClass('collapsed'));
      localStorage.setItem('sidebarCollapsed', $sidebar.hasClass('collapsed'));
    });
  }

  if ($burgerBtn.length) {
    $burgerBtn.on('click', function() {
      $mobileSidebar.toggleClass('active');
      $overlay.toggleClass('active');
    });

    $overlay.on('click', function() {
      $mobileSidebar.removeClass('active');
      $overlay.removeClass('active');
    });
  }

  window.showToast = function(message, type = 'info') {
    const $container = $('#toast-container');
    if (!$container.length) return;

    const $toast = $('<div class="toast"></div>')
      .addClass(type)
      .text(message)
      .appendTo($container);

    setTimeout(() => $toast.addClass('show'), 10);
    setTimeout(() => {
      $toast.removeClass('show');
      setTimeout(() => $toast.remove(), 300);
    }, 4000);
  };

  $('.btn-pay').on('mousedown', function() {
    $(this).css('transform', 'scale(0.98)');
  }).on('mouseup mouseleave', function() {
    $(this).css('transform', 'scale(1)');
  });
});
