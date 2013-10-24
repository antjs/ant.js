更新日志
----
Version **0.1.3** -- 2013-10-24 -- [diff][0.1.3]

* More Tests.
* Tests can run in node now, not only phantom.js.
* Two way binding for all editable element.

Version **0.1.2** -- 2013-09-02

* 修复带有 `a-` 前缀属性导致程序报错的问题.


Version **0.1.1** -- 2013-09-01

* 传入的对象数据将拷贝一份, 而不再作为引用值使用.
* 实现了数组操作和 DOM 操作映射关系的精确同步. 包括:  `push`, `pop`, `shift`, `unshift`, `splice`, `reverse`.
* 现在一个 ant 实例也可以作为子模板.

[0.1.3]: https://github.com/antjs/ant.js/compare/v0.1.2...v0.1.3