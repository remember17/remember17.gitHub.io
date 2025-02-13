require(['gitbook', 'jquery'], function(gitbook, $) {
    var SITES = {
        'twitter': {
            'label': 'Twitter',
            'icon': 'fa fa-twitter',
            'onClick': function(e) {
                e.preventDefault();
                window.open('https://x.com/areahao');
            }
        },
        'weibo': {
            'label': 'Weibo',
            'icon': 'fa fa-weibo',
            'onClick': function(e) {
                e.preventDefault();
                window.open('https://weibo.com/u/1877098637');
            }
        },
        'mail': {
            'label': '邮箱',
            'icon': 'fa fa-envelope',
            'onClick': function(e) {
                e.preventDefault();
                window.location.href = "https://fivehow.com/about/2017-06-06-about";
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
                window.location.href = "/";
            }
        }
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
