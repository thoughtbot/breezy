#### Custom reducers
If you find yourself needing functionality beyond what the default reducers provide, take a look at how [Breezy shapes it store](#how-does-it-look-like) and add your own reducers:

```javascript
yarn add reduce-reducers
```

and modify your `application.js`

```javascript
....
import reduceReducers from 'reduce-reducers'
import {setIn} from '@jho406/breezy/dist/utils/immutability'
import {pagePath} from '@jho406/breezy/dist/utils/helpers'

function myCustomReducer(state = {}, action) {
  switch(action.type) {
  case 'USER_UPLOADS_FILES': {
    const {pageKey, keypath, someValue} = action
    const path = pagePath(pageKey, keypath)
    const nextState = setIn(state, path, someValue)

    return nextState
  }
  default:
    return state
  }
}

const {reducer, ...otherStuff} = Breezy.start({...})

const {
  breezy: breezyReducer,
  pages: pagesReducer,
} = reducer

const store = createStore(
  combineReducers({
    breezy: breezyReducer,
    pages: reduceReducers(pagesReducer, myCustomReducer),
  }),
  initialState,
  applyMiddleware(thunk)
)
```

## React Redux helpers
```javascript
import {mapStateToProps, mapDispatchToProps} from '@jho406/breezy'

....

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MyComponent)
```

### API

#### mapStateToProps
An out-of-the-box `mapStateToProps` to be used with react-redux's `connect`.

Breezy will include all props you build in your `xyz.js.props` and the following:

prop | Notes
--- | ---
csrfToken | Breezy will automatically append this to your `POST`, `PUT`, and `DELETE` requests, but if you need to write your own fetch, this prop is available to your components.
pageKey | The pageKey Breezy used to fetch your `xyz.js.props` from the store.

#### mapDispatchToProps
A hash of thunks and useful immutable action creators to be used with react-redux's `connect`.

Here's what's included:
```javascript
export const mapDispatchToProps = {
  visit,
  remote,
  setInPage,
  delInPage,
  extendInPage,
  setInJoint,
  delInJoint,
  extendInJoint,
  saveAndProcessSJRPage,
}
```

## Nav Component

A `Nav` component for your redux application.

```
import Nav from '@jho406/breezy/dist/NavComponent'
...
<Provider store={store}>
  <Nav
    mapping={this.props.mapping}
    history={history}
    initialPageKey={initialPageKey}
  />
</Provider>

```

### API

#### navigateTo
```javascript
this.props.navigateTo('/posts', {ownProps:{restored: true}})
```

If there is an existing page in your store `navigateTo` will restore the props, render the correct component, and return `true`. Otherwise it will return `false`. This is useful if you want to restore an existing page before making a call to `visit` or `remote`.

Parameter | Notes
--- | ---
pageKey | The location where your props are stored in breezy. Use your rails `foo_path` helpers.
options| Additional options, see below.

Options | Notes
--- | ---
ownProps | Any additional props to be passed to the next page component.

## Built-in Thunks

### API

#### visit
Makes an ajax call to a page, pushes to `History`, and sets the response to the `pages` store. Use `visit` when you want full page-to-page transitions on the user's last click.

For a browser-like navigational experience, combine with [withBrowserBehavior](#withBrowserBehavior)

```javascript
visit(pathQuery).then(({rsp, page, pageKey, screen, needsRefresh, canNavigate}) => {})

visit(pathQuery, {...fetchRequestOptions}).then(({rsp, page, pageKey, screen, needsRefresh, canNavigate}) => {})

visit(pathQuery, {...fetchRequestOptions}, pageKey).then(({rsp, page, pageKey, screen, needsRefresh, canNavigate}) => {})

visit(pathQuery, {...fetchRequestOptions}, pageKey).catch(({message, fetchArgs, url, pageKey}) => {})

```

Arguments | Type | Notes
--- | --- | ---
pathQuery| `String` | The path and query of the url you want to fetch from. The path will be prefixed with a `BASE_URL` that you configure.
fetchRequestOptions | `Object` |  Any fetch request options. Note that breezy will override the following headers: `accept`, `x-requested-with`, `x-breezy-request`, `x-xhr-referer`, `x-csrf-token`, and `x-http-method-override`.
pageKey | `String` | Optional. The key that breezy will use to store the recieved page. If not specified, Breezy will use the response's `content-location` headers. See [setting the content location](#setting-the-content-location)

Callback options | Type | Notes
--- | --- | ---
canNavigate | `Boolean` | There can only be one visit anytime. If 2 visits happen at the same time, both will be fufilled, but only the last one will be passed a `canNavigate = true` in its callback.
needsRefresh | `Boolean` | If the new request has new JS assets to get - i.e., the last fingerprint is different from the new fingerprint, then it will return true.
screen | `String` | The screen that your react application should render next.
page | `Object` | The full parsed page response from your `foobar.js.props` template.
rsp | `Object` | The raw response object
pageKey | `String` | Location in the Breezy store where `page` is stored.


Additional `.catch` error attributes* | Type | Notes
--- | --- | ---
fetchArgs | `Array` | The arguments passed to `fetch`, as tuple `[url, {req}]`. You can use this to implement your own retry logic.
url | `String` | The full url, passed to `fetch`.
pageKey | `String` | Location in the Breezy store where `page` is stored


#### remote
Remote DOES NOT affect your `History`. Remote makes an ajax call and saves the response to the `pages` store in async fashion. Use this if you want to [update parts](#filtering-nodes) of the current page or preload other pages.

Combine with [withBrowserBehavior](#withBrowserBehavior)

```javascript
remote(pathQuery, {}, pageKey).then(({rsp, page, screen, needsRefresh, canNavigate}) => {})

remote(pathQuery, {...fetchRequestOptions}, pageKey).then(({rsp, page, screen, needsRefresh, canNavigate}) => {})

remote(pathQuery, {...fetchRequestOptions}, pageKey).then(({rsp, page, screen, needsRefresh, canNavigate}) => {})

remote(pathQuery, {...fetchRequestOptions}, pageKey).catch(({message, fetchArgs, url, pageKey}) => {})

```

Shares the same arguments as `visit` with a few key differences:

1. You must explicitly provide it with a `pageKey`. This is to prevent async requests from saving into the wrong state. Use with the included `mapStateToProps`, which provides a `this.props.pageKey`. For example:

```
this.props.remote(url.toString(), {}, this.props.pageKey)
```

You can also wrap this function with sane defaults using `withBrowserBehavior` which will [automatically](#withBrowserBehavior) add the `pageKey` for you.

2. `canNavigate` is not available as an option passed to your then-able function.

#### withBrowserBehavior
Enhances `visit` and `remote` with navigation behavior on the returned Promises. For example, if the request `500`s, Breezy will navigate to '/500.html'. You can read the full behavior [here](https://github.com/jho406/Breezy/blob/master/breezy/lib/utils/react.js#L131).

```javascript
  import {...someStuff..., withBrowserBehavior} from '@jho406/breezy'

  constructor (props) {
    const {visit, remote} = withBrowserBehavior(props.visit, props.remote)
    this.visit = visit.bind(this)
    this.remote = remote.bind(this) //Note that the wrapped remote will automatically add the `pageKey` parameter for you. You do not need to explicity provide it if you wrap it.
  }
```

Arguments | Type | Notes
--- | --- | ---
visit| `Function` | The visit function injected by `mapDispatchToProps`
remote| `Function` | The remote function injected by `mapDispatchToProps`. The wrapped `remote` function will add the `pageKey` argument automatically for you.


#### saveAndProcessSJRPage
Save and process a rendered view from BreezyTemplate. It will also handle any deferment, and joint updating. Useful if you want to stream a fully rendered `your_template.js.props` to preload, or graft nodes via websockets.

Arguments | Type | Notes
--- | --- | ---
pageKey| `String` | The page key where you want template to be saved in. Use your rails `foo_path` helpers.
pageSJR| `String` | A rendered BreezyTemplate

### Filtering nodes
Breezy can filter your content tree for a specific node. This is done by adding a `_bz=keypath.to.node` in your URL param and setting the content type to `.js`. BreezyTemplates will no-op all node blocks that are not in the keypath, ignore deferment and caching (if an `ActiveRecord::Relation` is encountered, it will append a where clause with your provided id) while traversing, and return the node. Breezy will then `setIn` that node back onto its tree on the client side. Joints will also automatically be updated where needed.

For example:

```javascript
store.dispatch(visit('/?_bz=header.shopping_cart'))
```


### The Breezy store shape
How should you structure your store? Should I replicate my business models, like `User`, on the client side? Use an [ORM](https://github.com/tommikaikkonen/redux-orm) to manage it? How much should I denormalize or normalize? How much business logic should I bring over?

Breezy's store shape falls on the extreme end of denormalization, every page is given a node in the redux tree. There is likely duplication of state across children for example, a shared `User` header. Instead of normalizing state, Breezy give you tools that make it [easy](#automatically-updating-cross-cutting-concerns) to update and manage cross-cutting concerns like a shared header.

Breezy's opinion is that its much saner to leave the business models to the backend, and shape state on the frontend for ~~only~~ mostly presentational purposes. In other words, there is no `User` model on the front end, just pages with `User`-like data.

#### How does it look like

Breezy occupies 2 nodes in your Redux state tree.

```javascript
{
  breezy, // <-breezy's private store.
  pages, // where the results of your props live
  ...yourStuff
}
```

`pages` is where the results of your props templates live. Its a hash where the keys are the path of your visited url. Internally, it looks like this:
```javascript
pages: {
  '/bar': {
    data:{...propsFromBreezyTemplates},
    ...otherMetaInfoLikeCSRFTokensOrPartials
  },
  '/bar?foo=123': {
    data:{...propsFromBreezyTemplates},
    ...otherMetaInfoLikeCSRFTokensOrPartials
  },
  '/foo':{
    data:{...propsFromBreezyTemplates},
    ...otherMetaInfoLikeCSRFTokensOrPartials
  }
}

```



### Automatically updating cross cutting concerns
Breezy can automatically update all `pages` using meta information about partial usage from the last request. You just have to add the option `joint: true` to your partials.

For example:
```ruby
json.header do
  json.cart 30
end
```

Extract your header into a partial and add the option `joint: true`
```ruby
json.header partial: ['header', joint: true]
```

### Manually updating cross cutting concerns
If you want finer control, or want to perform optimistic updates, breezy provides [action creators](#setinjoint) that will immutably update across `pages`.

## Rails controller helpers and behavior
### API
#### use_breezy
```ruby
class PostsController < ApplicationController
  # `use_breezy` enables breezy functionality
  # on application.html.erb
  before_action :use_breezy

  def index
...
```

Enables Breezy funtionality, and renders a blank HTML view, allowing for JSX to take over on `application.html.erb`.

#### render
You can override behavior through the `breezy` option:

```ruby
  def index
    render :index, breezy: {..more_options..}
  end
```

Option| Type | Notes
--- | --- | ---
screen| `String` | Override which screen the will render. Defaults to the template id (path to template without the rails root and file ext).

When using the screen option, remember that Breezy determines which React component to render via the mapping in `application.js`.

```javascript
const screenToComponentMapping = {
  'posts/index': PostIndex
}
```

### Setting the content location

On non-GET requests, Breezy uses the response's `content-location` to create the key used to store your props. This is because when you render in a `create` or `update`, the returned response does not neccesarily reflect the url the user should see. For example, if i'm on `posts/new` and you make a POST request to `posts/`, you may render `posts/new` for any errors you'd like to show.

It is recommended that set this header in your `create` and `update` methods.

```
def create
  @post = Post.new(post_params)

  if @post.save
    redirect_to @post, notice: 'Post was successfully created.'
  else
    response.set_header("content-location", new_post_path)
    render :new, breezy: {screen: 'PostsNew'}
  end
end
```

## Immutability Helpers

### API
Breezy includes immutability helpers inspired by [Scour.js](https://github.com/rstacruz/scour). You would need to use keypaths to traverse the prop tree. For example, given a page that looks like this:

```
'/posts': {
  posts: [
  {
    post_id: 1
    title: 'hello world'
    comments: [
      {
        comment_id: 1,
        body: 'Here's a comment
      }
    ]
  }
  ]
}
```

To reach the comment body you could do this:

```
'posts.0.comment.0.body'
```

or find first by its attribute and value

```
'posts.post_id=1.comment.0.body'
```

The above would find the first occurance where `post_id=1` before continuing traversing.

#### setInJoint
```javascript
setInJoint({name, keypath, value})
```
Traverses to the node by joint name, then keypath, and immutably sets a value across all `pages`.
```javascript

this.props.setInJoint({
  name: 'header',
  keypath: 'cart.total',
  value: 100
})

```

#### extendInJoint
```javascript
extendInJoint({name, keypath, value})
```
Traverses to the node by joint name, then keypath, and immutably extends the value across all `pages`.
```javascript

this.props.extendInJoint({
  name: 'header',
  keypath: 'profile.address',
  value: {zip: 11214}
})

```

#### delInJoint
```javascript
delInJoint({name, keypath})
```
Traverses to the node by joint name, then keypath, and immutably delete the value across all `pages`.
```javascript

this.props.delInJoint({
  name: 'header',
  keypath: 'profile.address',
})

```

#### setInPage
```javascript
setInPage({pagekey, keypath, value})
```

At the page specificed by the URL, traverses to the node by keypath and immutably set the value.

```javascript
this.props.setInPage({
  pageKey: '/foo?bar=5',
  keypath: 'header.cart.total',
  value: 100
})

```


#### extendInPage
```javascript
extendInPage({pageKey, keypath, value})
```

At the page specificed by the URL, traverses to the node by keypath and immutably extend the value.

```javascript
this.props.extendInPage({
  pageKey: '/foo?bar=5',
  keypath: 'header.cart',
  value: {total: 100}
})

```

#### delInPage
```javascript
delInPage({pageKey, keypath})
```

At the page specificed by the URL, traverses to the node by keypath and immutably delete the value.

```javascript
this.props.delInPage({
  pageKey: '/foo?bar=5',
  keypath: 'header.cart'
})

```


## BreezyTemplate
BreezyTemplate is a queryable Server-generated Javascript Response (SJR) templating library based on JBuilder that you use to bulid the props that your container components receive. It has support for partials, russian-doll caching, and can selectively render paths of your props tree without executing others. It supports most of JBuilder syntax, but it does have a few key [differences](#differences-from-jbuilder).

Example:
```ruby
json.menu do
  json.current_user do
    json.email current_user.email
    json.avatar current_user.avatar
    json.inbox current_user.messages.count
  end
end

json.dashboard(defer: :auto) do
  sleep 5
  json.complex_post_metric 500
end

json.posts do
  page_num = params[:page_num]
  paged_posts = @posts.page(page_num).per(20)

  json.list do
    json.array! paged_posts, key: :id do |post|
      json.id post.id
      json.description post.description
      json.comments_count post.comments.count
      json.edit_path edit_post_path(post)
    end
  end

  json.pagination_path posts_path
  json.current paged_posts.current_page
  json.total @posts.count
end

json.flash flash.to_h

json.footer nil, partial: 'footer'
```

### API

In general, BreezyTemplate functionality like partials or deferement, can only be enabled as options on a node.

For inline attributes, the first parameter is the value, and the last parameter are feature options.

```ruby
json.post @post, partial: "blog_post", some_feature: true
json.post @post, partial: ["blog_post", as: 'article'], some_feature: [true, {more_options: '123'}]
```

For blocks, the first parameter are always feature options.

```ruby
json.comments partial: "blog_post", some_feature: true do
end

#or

options = partial: ["blog_post", as: 'article'], some_feature: [true, {more_options: '123'}]

json.post options do
  json.title 'Hi!'
end
```

#### Lists
To support [filtering nodes](#filtering-nodes), any list passed to `array!` must implement `member_at(index)` and `member_by(attr, value)`. For example, if you were using a delegate:

```
class ObjectCollection < SimpleDelegator
  def member_at(index)
    at(index)
  end

  def member_by(attr, val)
    find do |ele|
      ele[attr] == val
    end
  end
end

```

Then in your template:

```
data = ObjectCollection.new([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}])

json.array! data do
  ...
end
```

Similarly for ActiveRecord:

```
class ApplicationRecord < ActiveRecord::Base
  def self.member_at(index)
    offset(index).limit(1)
  end

  def self.member_by(attr, value)
    find_by(Hash[attr, val])
  end
end
```

Then in your template:

```

json.array! Post.all do
  ...
end
```


##### Array core extension
For convenience, BreezyTemplate includes a core_ext that adds these methods to `Array`. For example:

```
require 'breezy_template/core_ext'
data = [{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]

json.posts
  json.array! data do
    ...
  end
end
```

Unfortunately, BreezyTemplate doesn't know what the elements are in your collection. The example above will be fine for [filtering](#filtering_nodes) by index `\posts?_bz=posts.0`, but will raise a `NotImplementedError` if you filter by attribute `/posts?_bz=posts.id=1`. So you may still have to provide your own delegator.

#### Partials
Partials are supported. The following will render the file `views/posts/_blog_posts.js.props`, and set a local variable `foo` assigned with @post, which you can use inside the partial.


```ruby
json.posts @post, partial: ["blog_post", as: 'foo']
```


More usage:

```ruby
# We use a `nil` because of the last argument hash. The contents of the partial is what becomes the value.
json.post nil, partial: "blog_post"

#or

# Set @post as a local `article` within the `blog_post` partial.
json.post @post, partial: ["blog_post", as: 'article']

#or
# Add more locals
json.post @big_post, partial: ["blog_post", locals: {email: 'tests@test.com'}]

#or

# Use a partial for each element in an array
json.array! @posts, partial: ["blog_post", as: :blog_post]
```

#### Partial Joints
Breezy does not normalize your store, instead it relies on your partial's metadata to make it easy to update cross cutting concerns like a shared header. To enable this behavior, we use the `joint` option.

For example, to update all your headers across all pages like so:

```javascript
extendInJoint({
  name: 'header',
  keypath: 'profile.address',
  value: {zip_code: 11214}
})
```

You would need use partials and add the option `joint: true`. Then the key `header` will be accessible by `extendInJoint`.

```ruby
# index.js.breezy
json.header null, partial: ["profile", joint: true]


# _profile.js.breezy
json.profile do
  json.address do
    json.state "New York City"
  end
end

```

A joint uniquely identifies a rendered partial across the application. By default, the name of the joint is named after the key where the partial is used. You can also rename a joint:

```ruby
# index.js.breezy
json.header null, partial: ["profile", joint: 'super_header']
```

When using joints with Arrays, the argument **MUST** be a lamda that returns a string:

```ruby
require 'breezy_template/core_ext' #See (lists)[#Lists]

json.array! ['foo', 'bar'], partial: ["footer", joint: ->(x){"somefoo_#{x}"}]
```

Use joints sparingly, and only if you are sure a partial is a cross-cutting concern. Headers, footers, and partials for list elements are good candidates, while a partial containing lists is not.

#### Caching

Usage:

```ruby
json.author(cache: "some_cache_key") do
  json.first_name "tommy"
end

#or

json.profile "hello", cache: "cachekey" #

#or

json.profile nil, cache: "cachekey", partial: ["profile", locals: {foo: 1}]

#or nest it

json.author(cache: "some_cache_key") do
  json.address(cache: "some_other_cache_key") do
    json.zip 11214
  end
end

#or use it on arrays
require 'breezy_template/core_ext' #See (lists)[#Lists]

opts = {
  cache: ->(i){ ['a', i] }
}
json.array! [4,5], opts do |x|
  json.top "hello" + x.to_s
end

#or on arrays with partials

opts = {
  cache: (->(d){ ['a', d.id] }),
  partial: ["blog_post", as: :blog_post]
}
json.array! @options, opts

```

#### Deferment
You can defer rendering of expensive nodes in your content tree using the `defer: :auto` option. Behind the scenes BreezyTemplates will no-op the block entirely, replace the value with `undefined` as a standin, and append a bit of meta data to the response. When the client recieves the payload, breezy will use the meta data to issue a `remote` dispatch to fetch the missing node and graft it at the appropriate keypath on the client side.

Usage:
```ruby
json.dashboard(defer: :auto) do
  sleep 10
  json.some_fancy_metric 42
end
```

A manual option is also available:

```ruby
json.dashboard(defer: :manual) do
  sleep 10
  json.some_fancy_metric 42
end
```
If `:manual` is used, Breezy will no-op the block and do nothing after it recieves the response. Its up to you to use [node filtering](#filtering_nodes) to fetch the node seperately. A common usecase would be tab content that does not load until you click the tab.


#### Working with arrays
If you want to defer elements in an array, you should specify which attribute you want to use to identify the uniqueness of the element via the `key` options. This helps Breezy generate a more specific keypath in its requests, otherwise it'll just use the index.

For example:

```ruby
require 'breezy_template/core_ext' #See (lists)[#Lists]
data = [{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]

json.posts
  json.array! data, key: :some_id do |item|
    json.some_id item.id # the attribute i want to use as `key`.
    json.contact(defer: :auto) do
      json.address '123 example drive'
    end
  end
end
```

When Breezy receives the response, it will automatically kick off `remote(?_bz=posts.some_id=1.contact)` and `remote(?_bz=posts.some_id=2.contact)`.

### Differences from JBuilder

1. Blocks, Arrays, Sets are NOT additive. The last one wins! So

```ruby
json.author do
  json.name 'john'
end

json.author do
  json.age '30'
end
```

would only produce
```
{author: {age: 30}}
```

2. No shortcut `extracts!` syntax. This means, in order to do something like this:

```ruby
json.author person, :name, :age

or

json.(person, :name, :age)
```

you have to use `extract!` explicity

```ruby
json.extract! person, :name, :age
```

3. No collection shortcuts. So this:

```ruby
json.comments comments do |comment|
  json.content comment.content
end
```

has to become this:

```ruby
json.comments do
  json.array! comments do |item|
    json.content item.content
  end
end
```

4. `json.array!` method signature is `json.array!(collection, options) {}`. So this

```ruby
json.array! comments, :content, :id
```

has to become this:

```ruby
json.comments do
  json.array! comments do |item|
    json.id item.id
    json.content item.content
  end
end
```

5. You can't pass JBuilder objects as values. The following will error out.

```ruby
to_nest = Jbuilder.new{ |json| json.nested_value 'Nested Test' }

json.set! :nested, to_nest
```

6. Any collection passed to `array!` must implement `member_at(index)` and `member_by(attr, value)`. See [lists](#lists)

7. Key formatting via `json.key_format` is removed.

## Special Thanks!
Thanks to [jbuilder](https://github.com/rails/jbuilder), [scour](https://github.com/rstacruz/scour), [turbolinks3](https://github.com/turbolinks/turbolinks-classic), [turbograft](https://github.com/Shopify/turbograft/)

## Tutorial
Soon!
