define(function (require) {

    var $ = require('jquery');

    /**
     * 获取上传文件的名称和后缀名
     *
     * @param {string} file 上传文件值
     * @return {Object} fileName 为上传文件名 extension 为上传文件后缀
     */
    function getFileInfo(file) {
        var fileName = file.replace(/.*\\|\//, '');
        var extension = fileName.indexOf('.') !== -1 ? fileName.replace(/.*[.]/, '') : '';
        return {
            fileName: fileName,
            extension: extension
        };
    }

    var getUID = (function () {
        var id = 0;
        return function () {
            return 'ajaxupload' + id++;
        };
    })();


    var defaultOptions = {
        // 触发上传事件的target
        target: '',

        // 上传文件的url
        action: '',

        // 上传文件按钮的name
        name: 'uploadfile',

        // 上传文件附加的data
        data: {},

        // 是否上传成功直接提交
        autoSubmit: true,

        // 期待返回的类型，默认为json
        responseType: 'json',

        // 上传按钮hover上去增加的样式
        hoverClass: 'hover',

        // 当上传按钮禁用时候增加的样式
        disabledClass: 'disabled',

        // 当点击上传文件选择文件的时候触发，只有当autoSubmit为false的时候使用
        // 可以return false 来阻止提交
        onChange: function (file, extension) {},

        onSubmit: function (file, extension) {},

        // 当成功上传文件后触发
        onComplate: function (file, response) {}

    };

    var ajaxupload = function (options) {
        this.options = $.extend({}, defaultOptions, options);

        var target = $(this.options.target);

        if (!target.size()) {
            throw new Error('Please make sure that youre passing a valid element');
        }

        this.target = target;
        this.disabled = false;

        this.init();
    };

    ajaxupload.prototype = {
        enabled: function () {
            this.disabled = false;
            this.target.removeClass(this.options.disabledClass).prop('disabled', false);
        },

        disable: function () {
            this.disabled = true;
            this.target.addClass(this.options.disabledClass).prop('disabled', true);
        },

        init: function () {

            var me = this;

            me.enabled();

            me.target.on('mouseenter', function () {
                if (me.disabled) {
                    return;
                }

                if (!me.input) {
                    me.creatInput();
                }

            });
        },

        creatInput: function () {
            var input = $('<input type="file" name="' + this.options.name + '">');
            input.css({
                position: 'absolute',
                right: 0,
                fontSize: 480,
                cursor: 'pointer'
            });

            var inputWrapper = $('<div></div>');

            var offset = this.target.offset();

            inputWrapper.css({
                position: 'absolute',
                overflow: 'hidden',
                width: this.target.width(),
                height: this.target.height(),
                opacity: 0,
                zIndex: 10000,
                left: offset.left,
                top: offset.top
            });

            inputWrapper.append(input);

            $('body').append(inputWrapper);

            var me = this;
            var options = me.options;
            input
                .on('change', function () {
                    if (!input.val()) {
                        return;
                    }

                    me.fileInfo = getFileInfo(input.val());

                    if (false === options.onChange.call(me, me.fileInfo.fileName, me.fileInfo.extension)) {
                        me.clearInput();
                        return;
                    }

                    if (options.autoSubmit) {
                        me.submit();
                    }
                })
                .on('mouseenter', function () {
                    input.addClass(options.hoverClass);
                })
                .on('mouserleave', function () {
                    input.removeClass(options.hoverClass);
                });

            me.input = input;
        },

        clearInput: function () {
            if (!this.input) {
                return;
            }
            // this.input.val('') ie6不能成功清除file值
            // 重新设置this.input 为里面的内容
            this.input = $(this.input.parent().html());

            this.fileInfo = null;
        },

        creatIframe: function () {
            var id = getUID();
            var iframe = $('<iframe src="javascript:false;"/>');

            iframe.attr({
                name: id,
                id: id
            }).hide();

            $('body').append(iframe);

            return iframe;
        },

        creatForm: function (iframe) {
            var options = this.options;
            var form = $('<form method="post" enctype="multipart/form-data"></form>');
            form.attr({
                target: iframe.attr('name'),
                action: options.action
            }).hide();

            for (var i in options.data) {
                if (options.data.hasOwnProperty(i)) {
                    var input = $('<input type="hidden">');

                    input.attr({
                        name: i,
                        value: options.data[i]
                    });

                    form.append(input);
                }
            }
            // 数据都放到form后再放到body内
            $('body').append(form);

            return form;

        },

        getResponse: function (iframe, file) {
            var options = this.options;
            var me = this;

            iframe.on('load', function () {
                var doc = iframe[0].contentDocument ? iframe[0].contentDocument : iframe[0].decument;

                if (doc.readyState && doc.readyState != 'complete') {
                    // Opera 触发load事件多次
                    // 甚至当dom并没有加载完成
                    // 这个修正不影响别的浏览器
                    return;
                }

                // fixing Opera 9.64
                if (doc.body && doc.body.innerHTML == "false") {
                    // In Opera 9.64 event was fired second time
                    // when body.innerHTML changed from false
                    // to server response approx. after 1 sec
                    return;
                }

                var response;
                if (doc.XMLDocument) {
                    response = doc.XMLDocument;
                }

                if (doc.body) {
                    response = doc.body.innerHTML;

                    if (options.responseType === 'json') {
                        response = $.parseJSON(response);

                        options.onComplate.call(me, file, response);
                    }
                }

                iframe.remove();

            });
        },

        submit: function () {
            var options = this.options;

            if (!this.input || !this.input.val()) {
                return;
            }

            if (false === options.onSubmit.call(this, this.fileInfo.fileName, this.fileInfo.extension)) {
                this.clearInput();
                return;
            }

            var iframe = this.creatIframe();
            var form = this.creatForm(iframe);
            this.input.parent().remove();
            form.append(this.input);

            form.submit();
            form.remove();
            this.input = null;

            this.getResponse(iframe, this.fileInfo.fileName);
            this.creatInput();

        }

    };

    return ajaxupload;
});
