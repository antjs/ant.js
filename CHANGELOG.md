更新日志
----
Version **[0.3.0-dev]** 

* 使用 CommonJs(browserify) 代替 AMD(requirejs) 作为内部模块规范.
* 迭代指令使用 `in` 和 repeat 的方式.
* 废弃 mustache 式的变量向上查找机制.
* 移除 `.isRendered` 属性.
* 移除 `.update` 方法.
* 移除 `update, beforeInit, afterInit` 事件.
* 移除了对 opts.init 参数的自动调用.
* 更加友好明确的报错提示.
* 新增 opts.watchers 参数.
* 绑定的 promise 支持.
* 新增 `a-attr` 指令.

Version **[0.2.3]** -- 2014-04-01

* Bugs fix.
* 深层数据变动现在会向上层冒泡.
* 内置 filter 调整.
* 修复 filter 不能递归的问题.
* 更新 jsdom 版本到 0.10.4.


Version **[0.2.2]** -- 2013-12-26

* 添加 `render` 方法缺省的值
* 修复几个问题


Version **[0.2.1]** -- 2013-12-14
  
* 大幅提高 `.render` 的性能


Version **[0.2.0]** -- 2013-12-14

* 所有的 ant 属性(a-model, a-repeat, a-if) 都要使用 `{{}}` 去绑定了.
* 子模板方法 `.setParital` 的参数变更: `opts.node` --> `opts.target`.
* 表达式支持.
* HTML 元素属性可以作为绑定目标了.
* 条件属性支持.
* Filter 管道支持.
* 循环的索引用 `$index` 表示.


Version **[0.1.3]** -- 2013-10-24

* 更多测试用例.
* 测试不光跑在 phantom.js 中了, 可以真正的在 nodeJs 环境中跑了.
* 为可编辑 HTML 元素添加双向绑定功能.


Version **[0.1.2]** -- 2013-09-02

* 修复带有 `a-` 前缀属性导致程序报错的问题.


Version **[0.1.1]** -- 2013-09-01

* 传入的对象数据将拷贝一份, 而不再作为引用值使用.
* 实现了数组操作和 DOM 操作映射关系的精确同步. 包括:  `push`, `pop`, `shift`, `unshift`, `splice`, `reverse`.
* 现在一个 ant 实例也可以作为子模板.
