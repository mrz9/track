/**
 * 内容区域曝光情况统计插件
 * 使用方法：
 * <div id="demo">
 *  ...
 * </div>
 * import { register } from 'track'
 * register(document.getElementById('demo'))
 */
// observer实例
let observer;
// 回调函数集合，用到dom做key, 需要用map类型
const configMap = new Map();
// 时间集合，用于记录进入数据和离开时间
const timeMap = new Map();

// 需要马上执行
function throttle(fn, time = 1000) {
    let flag = true;
    return () => {
        if (!flag) return;
        flag = false;
        fn();
        setTimeout(() => {
            flag = true;
        }, time);
    };
}

// 监听回调
function observeCallback(entries, observer) {
    entries.forEach(entry => {
        if (!configMap.has(entry.target)) return false;
        const config = configMap.get(entry.target);
        const entryTimer = timeMap.get(entry.target);
        // 进入窗口并且交叉比例大于配置项
        if (entry.isIntersecting && entry.intersectionRatio >= config.ratio) {
            if (!entryTimer.startTime) {
                entryTimer.startTime = entry.time;
            }
        } else if (entry.intersectionRatio === 0) {
            entryTimer.endTime = entry.time;

            /**
             * 如果存在startTime， 则这次就是有效展示行为
             * 可以根据业务场景判断持续多长时间才算有效
             */
            if (entryTimer.startTime) {
                const params = {
                    ...entryTimer,
                    time: entryTimer.endTime - entryTimer.startTime
                };
                // 如果callback return true，表示跳过内部上报逻辑，自己处理上报
                if (!config.callback(params, entry, observer)) {
                    // 执行上报逻辑
                    console.log('doing report handle....');
                }
                if (config.once) {
                    unregister(entry.target);
                }
            }

            // 完成需要还原start,end time
            if (configMap.has(entry.target)) {
                timeMap.set(entry.target, {
                    startTime: 0,
                    endTime: 0,
                    leaveTime: 0
                });
            }
        }
    });
}

// 监听离屏时间
function bindLeaveEvent() {
    // 计算页面失去焦点的场景
    let blurTime;
    // 鼠标离开窗口时间
    let leaveTime = 0;

    const inHandle = throttle(focusWindowHandle);

    function focusWindowHandle() {
        if (!blurTime) return;
        leaveTime = Date.now() - blurTime;
        blurTime = 0;
        /**
         * 遍历正在记录的target，如果有startTime表示正在记录
         * 添加离屏幕时间
         */
        timeMap.forEach(value => {
            if (value.startTime) {
                value.leaveTime = leaveTime;
            }
        });
        leaveTime = 0;

        window.removeEventListener('focus', inHandle);
        // 滚动时不会触发focus事件，滚动行为也要触发leaveTime计算
        window.removeEventListener('scroll', inHandle);
    }

    window.addEventListener('blur', () => {
        leaveTime = 0;
        blurTime = Date.now();

        window.addEventListener('focus', inHandle);
        // 滚动时不会触发focus事件，滚动行为也要触发leaveTime计算
        window.addEventListener('scroll', inHandle);
    });
}

// 创建Observer
function createObserver() {
    let options = {
        threshold: [0, 0.25, 0.5, 0.75, 1.0]
    };

    observer = new IntersectionObserver(observeCallback, options);
    bindLeaveEvent();
    return observer;
}

/**
 * 注册监听
 * @param {HTMLElement} target 需要监听的dom
 * @param {Function | Object} configOrCallback 配置参数或者回调函数
 * config: {
 *  ratio:  target和window的交叉比，默认75%,
 *  once: 是否只监听一次，true的话上报成功后就会注销监听器，
 *  callback: 回调函数，返回true表示不走内置上报逻辑，上报方法有callback自己实现
 * }
 */
export const register = (target, configOrCallback) => {
    if (!observer) {
        createObserver();
    }

    let config = {
        callback: () => {}, // 默认没有返回值，return true 表示该target自己处理上报逻辑
        ratio: 0.75, // target和window的交叉比，默认75%,
        once: true // 是否只监听一次，true的话上报成功后就会注销监听器
    };

    if (typeof configOrCallback === 'function') {
        config.callback = configOrCallback;
    } else if (toString.call(configOrCallback) === '[object Object]') {
        config = {
            ...config,
            ...configOrCallback
        };
    }

    // 保存target的配置
    configMap.set(target, config);

    timeMap.set(target, {
        startTime: 0,
        endTime: 0,
        leaveTime: 0
    });
    observer.observe(target);
};

/**
 * 注销监听
 * @param {HTMLElement} target 需要注销监听的dom
 */
export const unregister = target => {
    configMap.delete(target);
    timeMap.delete(target);
    if (observer) {
        observer.unobserve(target);
    }
};
