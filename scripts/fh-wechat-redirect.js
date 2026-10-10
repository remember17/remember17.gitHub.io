(function () {
  var params = new URLSearchParams(window.location.search);
  var target = params.get('target');
  var openLink = document.getElementById('openLink');
  var copyLink = document.getElementById('copyLink');
  var productIcon = document.getElementById('productIcon');
  var productName = document.getElementById('productName');
  var pageTitle = document.getElementById('pageTitle');
  var pageMessage = document.getElementById('pageMessage');
  var isWeChat = /MicroMessenger/i.test(navigator.userAgent);
  var storeUrl = null;
  var products = {
    '6758816670': {
      key: 'now',
      name: 'Now for iPhone',
      icon: '/assets/products/app-icons/now.jpg',
    },
    '6759785632': {
      key: 'now',
      name: 'Now for Mac',
      icon: '/assets/products/app-icons/now.jpg',
    },
    '6446240226': {
      key: 'today',
      name: 'Today',
      icon: '/assets/products/app-icons/today.png',
    },
    '1579304692': {
      key: 'recordbox',
      name: '记录Box',
      icon: '/assets/products/app-icons/recordbox.png',
    },
  };

  try {
    storeUrl = new URL(target || '');
    if (storeUrl.protocol !== 'https:' || storeUrl.hostname !== 'apps.apple.com') {
      storeUrl = null;
    }
  } catch (error) {
    storeUrl = null;
  }

  if (!storeUrl) {
    document.body.dataset.state = 'invalid';
    productIcon.hidden = true;
    productName.textContent = 'FiveHow';
    pageTitle.textContent = '链接不可用';
    pageMessage.textContent = '这个 App Store 链接无效，请返回官网后重试。';
    openLink.href = '/';
    openLink.textContent = '返回首页';
    copyLink.hidden = true;
    return;
  }

  var appIdMatch = storeUrl.pathname.match(/id(\d+)/);
  var product = appIdMatch && products[appIdMatch[1]];
  if (product) {
    document.body.dataset.product = product.key;
    productIcon.src = product.icon;
    productIcon.alt = product.name + ' App 图标';
    productName.textContent = product.name;
    document.title = product.name + ' · 在浏览器中打开';
  } else {
    productIcon.hidden = true;
  }

  openLink.href = storeUrl.href;

  copyLink.addEventListener('click', async function () {
    try {
      await navigator.clipboard.writeText(storeUrl.href);
      copyLink.textContent = '已复制';
    } catch (error) {
      copyLink.textContent = '复制失败';
    }
  });

  if (!isWeChat) {
    document.body.dataset.state = 'redirecting';
    pageTitle.textContent = '正在前往 App Store';
    pageMessage.textContent = '即将为你打开下载页面。';
    window.setTimeout(function () {
      window.location.replace(storeUrl.href);
    }, 200);
  }
})();
