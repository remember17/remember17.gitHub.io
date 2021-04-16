require(['gitbook', 'jquery'], function(gitbook, $) {
    var SITES = {
        'mail': {
            'label': '邮箱',
            'icon': 'fa fa-envelope',
            'onClick': function(e) {
                e.preventDefault();
                window.location.href = "mailto:wuhao.code@gmail.com";
            }
        },
        'github': {
            'label': 'GitHub',
            'icon': 'fa fa-github',
            'onClick': function(e) {
                e.preventDefault();
                window.open('https://github.com/remember17');
            }
        },
        'home': {
            'label': '主页',
            'icon': 'fa fa-home',
            'onClick': function(e) {
                e.preventDefault();
                window.location.href = "https://www.fivehow.com";
            }
        },
        'jianshu': {
            'label': '简书',
            'icon': 'fa fa-link',
            'onClick': function(e) {
                e.preventDefault();
                window.open('https://www.jianshu.com/u/3104fe86dfee');
            }
        },
        'juejin': {
            'label': '掘金',
            'icon': 'fa fa-link',
            'onClick': function(e) {
                e.preventDefault();
                window.open('https://juejin.cn/user/2647279729902221/posts');
            }
        },
        // 'weibo': {
        //     'label': 'Weibo',
        //     'icon': 'fa fa-weibo',
        //     'onClick': function(e) {
        //         e.preventDefault();
        //         window.open('http://service.weibo.com/share/share.php?content=utf-8&url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title));
        //     }
        // },
        // 'facebook': {
        //     'label': 'Facebook',
        //     'icon': 'fa fa-facebook',
        //     'onClick': function(e) {
        //         e.preventDefault();
        //         window.open('http://www.facebook.com/sharer/sharer.php?s=100&p[url]='+encodeURIComponent(location.href));
        //     }
        // },
        // 'twitter': {
        //     'label': 'Twitter',
        //     'icon': 'fa fa-twitter',
        //     'onClick': function(e) {
        //         e.preventDefault();
        //         window.open('http://twitter.com/home?status='+encodeURIComponent(document.title+' '+location.href));
        //     }
        // },
        // 'google': {
        //     'label': 'Google+',
        //     'icon': 'fa fa-google-plus',
        //     'onClick': function(e) {
        //         e.preventDefault();
        //         window.open('https://plus.google.com/share?url='+encodeURIComponent(location.href));
        //     }
        // },
        // 'instapaper': {
        //     'label': 'Instapaper',
        //     'icon': 'fa fa-instapaper',
        //     'onClick': function(e) {
        //         e.preventDefault();
        //         window.open('http://www.instapaper.com/text?u='+encodeURIComponent(location.href));
        //     }
        // },
        // 'vk': {
        //     'label': 'VK',
        //     'icon': 'fa fa-vk',
        //     'onClick': function(e) {
        //         e.preventDefault();
        //         window.open('http://vkontakte.ru/share.php?url='+encodeURIComponent(location.href));
        //     }
        // }
    };



    gitbook.events.bind('start', function(e, config) {
        var opts = config.sharing;

        // Create dropdown menu
        var menu = $.map(opts.all, function(id) {
            var site = SITES[id];

            return {
                text: site.label,
                onClick: site.onClick
            };
        });

        // Create main button with dropdown
        // if (menu.length > 0) {
        //     gitbook.toolbar.createButton({
        //         icon: 'fa fa-link',//'fa fa-share-alt',
        //         label: 'Share',
        //         position: 'right',
        //         dropdown: [menu]
        //     });
        // }

        // Direct actions to share
        $.each(SITES, function(sideId, site) {
            if (!opts[sideId]) return;

            gitbook.toolbar.createButton({
                icon: site.icon,
                label: site.text,
                position: 'right',
                onClick: site.onClick
            });
        });
    });
});
