# 内容区域曝光情况统计插件
## 方法
### register(target, configOrCallback)
注册元素监听
#### 参数
- `target` 需要监听的dom
- `configOrCallback` 配置对象`config`或回调函数
##### `config`说明
| 名字 | 说明 |
| ratio | target和window的交叉比，默认75%, |
| once | 是否只监听一次，true的话上报成功后就会注销监听器 |
| callback | 回调函数，返回true表示不走内置上报逻辑，上报方法有callback自己实现 |
