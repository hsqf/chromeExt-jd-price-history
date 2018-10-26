
// listen for checkForWord request, call getTags which includes callback to sendResponse
/* chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.action === 'searchHistory') {

            executeSearchHistotry(window.location.href, function (res) {
                return sendResponse(res);
            }, function (res) {
                return sendResponse(res);
            })

            //表示异步
            return true;
        }
    }
); */


init();
registerEvents();


function init() {

    var el = document.createElement('div');
    el.style = 'position:fixed; right:0; top:0;z-index: 99999;background: burlywood;'
    el.innerHTML = `   
        <input type="button" value="历史价格查询" id='btnSearch' />
        <input type="button" value="展开" id='btnHide' />
        <div id='message'></div>
        <div id='chart-price-histrory' style="height:500px;width:1000px; display:none">
        </div>   
    `;
    document.body.appendChild(el);

}


function registerEvents() {
    var btnSearch = document.getElementById('btnSearch');
    var messageEl = document.getElementById('message');
    var chartEl = document.getElementById('chart-price-histrory');
    var btnHide = document.getElementById('btnHide');
    btnSearch.onclick = function () {
        chartEl.style.display = 'block';
        var url = getRequestUrl(window.location.href);
        executeSearchHistotry(window.location.href, function (res) {
            handlerData(res);
        }, function (res) {
            handlerData(res);
        })
    }

    btnHide.onclick = function () {
        var isVisible = chartEl.style.display === 'block';
        btnHide.value = isVisible ? '展开' : '关闭';
        chartEl.style.display = isVisible ? 'none' : 'block';
    }
}



function getRequestUrl(requestUrl) {

    requestUrl = requestUrl.split('?')[0].split('#')[0];
    var url = escape(requestUrl);
    var token = d.encrypt(requestUrl, 2, true);

    var urlArr = [];
    urlArr.push('https://tool.manmanbuy.com/history.aspx?DA=1&action=gethistory&url=');
    urlArr.push(url);
    urlArr.push('&bjid=&spbh=&cxid=&zkid=&w=951&token=');
    urlArr.push(token);

    return urlArr.join('');

}


function http_get(options) {
    var timeout = options.onTimeout
    var url = options.url;
    var success = options.success;
    var error = options.error;

    var xhr = new XMLHttpRequest();
    xhr.timeout = 10000;
    xhr.ontimeout = function (event) {
        console.log('request url' + url + ', timeout');
        timeout && timeout()
    }
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4 && xhr.status == 200) {
            success && success(xhr.responseText);
        }
    }
    xhr.onerror = function () {
        error && error(xhr.statusText)
    }
    xhr.send();
}



// Returns the index of the first instance of the desired word on the page.
function executeSearchHistotry(requestUrl, success, error) {
    var isCommodityPage = checkIsCommodityPage(requestUrl);
    if (!isCommodityPage) {
        return error && error({ code: 7000, message: '无效的地址' });
    }

    var url = getRequestUrl(requestUrl);
    if (!url) {
        return error && error({ code: 7000, message: '无效的地址' });
    }

    http_get({
        url: url,
        success: function (data) {
            return success && success({ code: 10000, data });
        },
        error: function (statusText) {
            return error && error({ code: 7002, message: statusText });
        },
        timeout: function () {
            return error && error({ code: 7003, message: '无效的地址' });
        }
    })

}

function checkIsCommodityPage(url) {
    return url.indexOf('item.jd.') >= 0;
}


function handlerData(res) {
    if (res.code === 10000) {
        res.data = res.data || '{}';
        var data = JSON.parse(res.data);
        var lowPrice = +data.lowerPrice;
        var lowerDate = new Date(data.lowerDate.split('(')[1].split('-')[0]).toLocaleDateString();
        var spName = data.spName;
        var changePriceCount = data.changePriceCount;
        var objData = prepareData(data.datePrice || []);

        renderChart(spName, objData);
    } else {
        appendMessage('code:' + res.code + '    message:', res.message);
    }
}

function appendMessage(message) {
    messageEl.innerHTML += message + '<br>'
}

function renderChart(title, data) {
    var myChart = echarts.init(document.getElementById('chart-price-histrory'));

    var data = data.reverse().slice(0, 50).reverse();

    var xData = data.map(function (d) {
        return d.date;
    });

    var yData = data.map(function (d) {
        return d.price;
    });

    var option = {
        title: {
            text: title,
        },
        tooltip: {
            formatter: "{b0}: {c0}"
        },
        xAxis: {
            type: 'category',
            data: xData
        },
        yAxis: {
            type: 'value'
        },
        series: [{
            data: yData,
            type: 'line',
            markPoint: {
                data: [
                    { type: 'max', name: '最大值' },
                    { type: 'min', name: '最小值' }
                ]
            }
        }]
    };


    myChart.setOption(option);

}


function prepareData(dataStr) {
    var dataArr = dataStr.split('],');
    return dataArr.map(function (d) {
        //[Date.UTC(2017,8,19),3899.00]
        var dArr = (d + ']').replace(/\[|\]/ig, '').replace(/,/ig, '-').split(')')
        return {
            price: Math.abs(+dArr[1]),
            date: new Date(dArr[0].split('(')[1]).toLocaleDateString()
        }
    })
}
