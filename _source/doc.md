Ant.js 可以为前端 Web 应用提供一个绑定数据的模板系统, 使其具有数据模型驱动界面视图(MDV)的能力. 

兼容性和依赖
----

- Ant.js 可以在 IE6+ 的浏览器中使用, 其核心部分不需要任何依赖. 委托事件扩展部分需要 jQuery.
- 借助 [jsdom][3], ant.js 也可以在 node.js 中作为 HTML 的模板引擎. 


模板语法
----
  
  类似 [mustache][1] 和 [polymer][2] 的弱逻辑模板, ant.js 的模板只使用少数的几种规则.

  Ant 模板可以是 DOM 对象, 也可以是一段 HTML 字符串. 模板 DOM 对象的根节点不应该包含 `a-if` 和 `a-repeat` 属性.
  
  一个典型的 ant 模板:
  
```html
<section id="main">
  <input a-model='completedAll' type="checkbox" a-if="todos.length" />
  <ul id="todo-list">
    <li a-repeat="todos" a-if="show" class="{{completed: completed}}">
      <div class="view">
        <input type="checkbox" class="toggle" a-model="completed" />
        <label>{{{title}}}</label>
        <button class="destroy"></button>
      </div>
      <input type="text" a-model="title" class="edit"/>
    </li>
  </ul>
</section>
```
  
### 变量占位符

  `{{name}}`

  两组大括号表示普通变量. 变量占位符只能位于文本节点和属性节点当中, 属性节点包括属性名和属性值. 深度变量用点表示法表示, 如: `{{todos.length}}`
  
### 条件属性

  `a-if="val"`

  有 `a-if` 属性的节点会根据 `a-if` 属性的值对应的数据来决定该节点是否存在于 DOM 树中.
  
  如模板: 
  
```html
<ul a-if="todos.length"><ul>
```

  对应数据 `{todos: []}`, 由于 `todos` 数组的长度为零, 所以该 `ul` 将不会出现在 DOM 树中.
  
  __如果不是__: `^` 标示符和条件属性配合使用时, 值的 true false 与 DOM 的显示与否刚好相反. 
  
  如:
  
```html
<div a-if="^todos.length">对不起! 没有数据</div>
```

  对应数据 `{todos: []}`, 当 `todos` 数组的长度为零时该节点将会显示.
  
  
### 循环属性

  `a-repeat="list"`

  带有 `a-repeat` 属性的元素将根据对应数组的长度而重复. 并且该元素及其子元素的变量占位符的作用域将会切换到数组数据当中. 类似 mustache, 如果想使用数组之外的父辈变量, 直接使用其变量名即可.
  
  每个列表节点对象生成的时候会被添加一个名为 `a-index` 的对象属性(property), 其值是元素在数组中的索引.
  
  如对于模板:
  
```html
<ul>
  <li a-repeat="todos">
    {{title}}
  <li>
</ul>
```
    
  其对应的数据为:
  
```javascript
{
  todos: [
    {title: '买早餐'}
  , {title: '吃早餐'}
  ]
}
```
  
  最终将会渲染成:

```html
<ul>
  <li>买早餐</li>
  <li>吃早餐</li>
</ul>
```

### 双向绑定属性

  `a-model="val"` 
  
  而所谓的双向绑定, 即是在数据和表单值中任何一个发生了变化, 都会将该变化自动更新到另一层中.
  
  在表单控件元素中加上 `a-model` 属性就表示该表单控件与某条数据相绑定了.
  
  对于表单元素的绑定值, 目前分为 4 种情况: 
  
  1. 对于普通的文本输入框如 `input:text`, `textarea` 等, 与 `a-model` 绑定的是其 `value` 属性.
  
  2. 复选框 `<input type='checkbox' a-model='somekey' />`. 与 `a-model` 绑定的是其选中状态. 即: 当用户选中时, 'somekey' 对应的值将会被设置成 `true`, 反之为 `false`.
  
  3. 单选框 
  
    ```html
    <input type=radio value=red, a-model=color />
    <input type=radio value=blue, a-model=color />
    ```
  
  单选框往往是一组出现的, 同一组单选框应该有同一个 `a-model`, 与 `a-model` 绑定的是当前选中单选框的 `value` 值. 如: 用户选中 `value=red` 的单选框时, `color` 的值将设成 `red`.
  
  4. 下拉框
  
    ```html
    <select a-model='select'>
      <option value='option1'>option1</option>
      <option value='option2'>option2</option>
    </select>
    <select a-model='selects' multiple='true'>
      <option value='option1'>option1</option>
      <option value='option2'>option2</option>
    </select>
    ```
    
    select 控件分为单选和多选. 单选下拉列表绑定的数据是其选中 option 元素的 value 值.
    
    多选的下拉框, 其绑定的数据是包含所有选中 option 元素 value 值的数组.
    
### 条件变量
  
  `{{val: str}}`

  条件变量可以根据数据中某个值得真假来决定 DOM 中是否出现另一个字符. 
  
  比如对于`{{val: str}}`标记, 如果数据中, `val` 为真的话, 该段标记将显示成 `str` 字符, 如果 `val` 为假, 该段标记则表示一个空字符串.
  
  类似于 `a-if` 属性, `^` 标记表示反向. `{{^val: str}}`
  
### 非转义 HTML

  `{{{unescapeHTML}}}`
  
  三组大括号 `{{{unescapeHTML}}}` 表示里边的数据不会被转义, 就是说如果数据中包含 HTML 标签, 则会被当做 DOM 节点解析出来.
   
### 子模板

  `{{> partial}}`
  
  占位符 `{{> partialName}}` 表示该处将插入子模板 partialName 中的内容. partialName 与 `ant.optioins.partials` 中的值对应. 
  
  当子模板内容是字符串时, `{{{>partialName}}}`将不转义该字符串. 如果字符串中包含 HTML 标签, 将解析成 DOM 节点. 子模板是一个 DOM 节点时, 则将忽略非转义选项.
  
  子模板可以通过 `ant.setPartial` 方法延时添加.
  

构造函数 Ant
---

  构造一个 Ant 实例. 

### new Ant(template[, options])

  返回值: `ant` 实例

- **template** `String | HTMLElement`

  模板必须是 DOM 对象或者是一段字符串. 如果是一个 DOM 对象, 则该元素不应包含 `a-repeat` 或 `a-if` 属性.
  
- **options** `Object`
  
  所有的配置参数都是可省略的.

  + **options.data** `Object`   
  
    与模板绑定的数据对象的一个拷贝. Data 如果缺省, 可以在稍后用 `ant.render(data)` 传入.
    
  + **options.partials** `Object`
  
    子模板集合. 一个子模板同样可以是字符串或 DOM 对象. 并且没有 `a-repeat` 和 `a-if` 属性的限制.
    
    如: 
    
    HTML 代码: 
    
    ```html
    <div id=template>
      <h1>标题</h1>
      {{> content}}
    <div>
    ```
    
    ```javascript
    new Ant(document.getElementById('template'), {
      partials: {
        content: '<p>{{contents}}</p>'
      }
    });
    ```
  
  + **options.lazy** `Boolean` 
  
    默认值为 false. 表单元素与数据双向绑定时, 该参数决定了用户更改表单元素的值时更新到数据层的时机. 值为 `false` 时, 用户在 `input textarea` 中输入时会立即更新到数据层, 监听的是元素的 `input` 事件. 为 `true` 时, 用户的输入只有在表单元素丢失焦点是才会更新到数据层, 即监听的是 `change` 事件.
    
  + **options.el** `String|Object`
  
    模板在 DOM 的目标对象. 如果是字符串则表示一个新的标签元素名(如: `div, p, ul` 等). 该参数和模板有 6 种组合情况: 
    
    1. 模板是一个 DOM 对象, `options.el` 为空, 则 `ant.el` 就是模板对象
    2. 模板是一个 DOM 对象, `options.el` 为另一个 DOM 节点, 则 `ant.el` 表示 `options.el`, 并且模板对象将被插入 到 `options.el` 中
    3. 模板是一个 DOM 对象, `options.el` 为一个字符串, 则新建一个标签名为 `options.el` 的标签元素, 并将模板对象插入到 `options.el` 中.
    4. 模板是字符串, `options.el` 为空, 则会新建一个 div 表示 `ant.el`, 其 innerHTML 是模板字符串
    5. 模板是字符串, `options.el` 是一个 DOM 元素, 则 `options.el` 表示 `ant.el`, 其 innerHTML 是模板字符串
    6. 模板是字符串, `options.el` 也是一个字符串, 则会新建一个标签名为 `options.el` 的元素与表示 `ant.el`, 其 innnerHTML 是模板字符串

    
### Ant.extend(prototypeProperties[, staticProperties])

  构造函数的扩展. 可以扩展 Ant 的原型对象来为实例提供属性和方法, 也可以直接扩展构造函数的静态方法.
  
  - **prototypeProperties** `Object`
    
    扩展的原型对象.
    
  - **staticProperties** `Object`
  
    扩展的静态方法.
  
  如:
  
  ```javascript
    var Comment = Ant.extend({
      addReply: function(reply){
        this.get('replys').push(reply)
      }
    });

    var CommentAdmin = Comment.extend({
      removeReply: function() {
        //...
      }
    });
```

实例方法:
----

### .get(keypath)

  获取数据中 _keypath_ 对应的值.

  - **keypath** `String`
  
    参数 _keypath_ 表示数据在集合中的键值路径, 可用下标标示法或点标示法.

  如:
  ```javascript
    var ant = new Ant(el, {
      data: {
        title: '标题'
      , lists: [{name: '作者'}]
      }
    });
    ant.get('title');
    ant.get('list.0.name');
    ant.get('list[0].name');
  ```
  
### .set(keypath[, val, opts])

  更新到 keypath 对应的值. 

  - **keypath** `String|Object`
  
    需要更新的键值路径. 当一个参数是一个对象的时候, 则会将该对象并入数据中.
    
  - **val** `AnyType`
  
    需要更新的值. 
    
  - **opts** `Object`
    
    + **opts.silence** `Boolean`
    
      默认情况下, 设置一个新值会立即更新模板, 并会触发 `update` 事件. 该值为 `true` 的时候, 将不会更新模板, 只会安静的更改 `ant.data` 中的值.
      
    + **opts.isExtend** `Boolean`
    
      扩展数据还是替换数据:
      
       1. 为 true 时, 新传入的数据将会扩展原有数据, 只会替换简单类型数据.
       2. 为 false 是, 将会替换原有同路径的数据.
      
      该参数的默认值取决于第一个参数: 第一个参数是数据路径是该值默认为 false, 而第一个数据是数据对象的时候则默认为 true.
      
        
    
  如, 对于已有数据的示例:
  
```javascript
ant.data = {
  title: 'Ballad Of A Thin Man'
, artist: {
    name: 'Bob Dylan'
  }
};
```
  
  对其进行 `set` :
  
```
ant.set('artist', {age: 24});//替换 'artist' 的值. ant.data 为: {title: 'Ballad Of A Thin Man', artist: {age: 24}}
ant.set({artist: {name: 'Bob Dylan', age: 25}});//扩展整个数据对象. ant.data 为: {title: 'Ballad Of A Thin Man', artist: {name: 'Bob Dylan', age: 25}}
ant.set('artist', {country: 'USA'}, true)//扩展 'artist'. ant.data 的值: {title: 'Ballad Of A Thin Man', artist: {name: 'Bob Dylan', age: 25, contry: 'USA'}}
ant.set({newObj: {}, title: 'Matrix'}, false)//完全替换原有 'ant.data'. ant.data 的值为: {newObj: {}, title: 'Matrix'}
```

### .render([data])

  如果初始化构造的时候没有传入数据, 可用该方法进行数据绑定. 触发 `render` 事件.

  - **data** `Object` 需要与模板绑定的数据.
 
### .update([keyPath, data, isExtend])

  直接用数据更新局部或者全部模板, 并且不更新数据层. 触发 `update` 事件.
  
  参数同 `set` 方法.
  
### .clone([opts])

  拷贝当前 ant 实例对象.
  
  - **opts** `Object`
    
    扩展参数.
  
### .on(eventName, callback)

  监听 ant 的事件或自定义事件.
  
  - **eventName** `String` 事件名
  
    Ant 自带事件包括: `render, update`. 
  
  - **callback** `Function` 事件回调
  
### .off(eventName[, callback])

  取消事件的监听
  
### .trigger(eventName[, extraParameters ])

  触发自定义事件.

  - **eventName** `String` 事件名.
  
  - **extraParameters** `AnyType` 
  
  所有的附加参数都会传递给事件监听函数.
  
### .init(tpl[, options])

  每个实例创建时都会调用该初始化函数. 其参数同构造函数参数.
 
### .setPartial(info)

  添加或者更改子模板. 根据 `ant.isRendered` 数据, 决定该子模板是否渲染.
  
  该方法对于添加延时加载的子模板非常有用.
  
  - **info.content** `String|HTMLElement` 子模板内容
  - **[info.name]** `String` 子模板标示符. 对应模板中 `{{>partialName}}`. 没有预定义子模板, 该项可省略.
  - **[info.node]** `HTMLElement` 子模板的目标节点. 对于预定义好的子模板, 该项可省略.
  - **[info.escape]** `Boolean` 是否转义字符串子模板
  - **[info.path]** `String` 指定子模板中变量在数据中的作用域
  
 
实例属性: 
----
  
### .el

  `HTMLELement`

  所有的 Ant 实例对象都有一个 `el` 属性来表示该模板的 DOM 对象. 
  
### .tpl

  `String`

  `.el` 对象对应的 HTML 字符串.
  
### .data

  `Object`

  与模板绑定的数据.
  
### .options

  `Object`

  对应传入构造函数的第二个参数.
  
### .isRendered

  `Boolean`

  该参数标示模板与数据的绑定状态. 初始化没有传入 data 时, 该值为 false, 传入了 data 或者手动调用 `render` 方法后其值为 true.

  
操作数组
----
Ant.js 使用 `ant.set` 方法来改变普通对象的值并触发界面更新. 对于数组同样也可以使用 `set` 方法. 比如有数据 `{list: [{name: 'Ant'}, {name: 'Bee'}]}`, 可以使用 `ant.set('list[0].name', 'Cicada')` 来改变数组数据的值并更新界面. 

更好的操作数组的方法是使用数组的自带方法, 比如更改修改数据就使用 `splice` 方法. Ant.js 封装了常用的数组操作方法, 调用这些方法的时候会自动更新 DOM 界面. 这些方法包括: `push`, `pop`, `unshift`, `shift`, `splice`, `reverse`, `sort`.

 
事件委托
----
事件委托是作为 ant.js 的一个扩展而存在. 其提供了类似 [Backbone][0] 的事件回调编写方式. 借助于 jQuery 强大的自定义事件系统, ant.js 的自定义事件也将跟随 DOM 树向上冒泡. 

```javascript
var ant = new Ant(element, {
  data: data
, events: {
    'click button': function(e) {
      //做些什么
    }
  , 'change input': function(e){}
  , 'click': function(e){}
  , 'render': function() {}
  }
});
```
 

使用示例
----

[Github 代码库中](https://github.com/antjs/ant.js/tree/master/examples) 列举一些使用示例. 

而下面列举了一些在线示例: 

- [ant.js 使用教程](http://antjs.org/learn/)
- [noBackend 的实时评论系统](http://antjs.org/examples/backbase/)
 
  
[0]: http://documentcloud.github.io/backbone/#View-delegateEvents
[1]: http://mustache.github.io/mustache.5.html
[2]: http://www.polymer-project.org/platform/template.html
[3]: https://github.com/tmpvar/jsdom