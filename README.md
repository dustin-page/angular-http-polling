# angular-http-polling
An AngularJS service that allows for continuously polling a remote server.

## Requirements

* **AngularJS v1.5.8+** is currently required.

## Installation

Install this plugin with:
```bash
$ bower install angular-http-polling
```

## Usage

### Injection

Add `ngHTTPPoll` as a dependency to your module and inject `$httpoll`:

```javascript
angular.module('YourModule',['ngHTTPPoll'])
    .controller('YourController', ['$httpoll'], function ($httpoll){
        // ...
    })
```

### Config Options

`$httpoll` wraps Angular's [`$http`](https://docs.angularjs.org/api/ng/service/$http) methods, polling the endpoint multiple times, based on the kind of behavior you configure. The API is the same for `$http`, except that it accepts additional keys in the config object:

- `retries` [integer] The maximum number of retries that the poller will attempt until it receives a status code in either the `successRange` or `errorRange` _(default: 50)_
- `delay` [integer] Time (in milliseconds) to delay the next retry after a response is received _(default: 100)_
- `retryOnError` [boolean] Polling continues if an error response is received _(default: true)_
- `timeout` [integer] Timeout for polling - no further retries will be attempted. A false-y value means that the poller will never timeout. _(default: false)_
- `successRange` [array]: A range of HTTP status codes that the poller should interpret as a success _(default: [200, 201])_
- `errorRange` [array]: A range of HTTP status codes that the poller should interpret as errors _(default: [400, 599])_
- `until` [function(response, config, state, actions)]: Until fires after every request. Polling will stop when this function returns a truth-y value (or unless polling time exceeds the set `timeout`). An error thrown from within the`until` function will stop polling, and the error's message will be sent to a `catch` function, if defined.

### Until Parameters

- `response`: The last response from the HTTP provider
- `config`: The current config values
- `state`: Gives access to the current state of polling
    - `retryCount`: The number of retries that have already been performed
- `actions`:
    - `pass` [function()]: Calls the default `until` logic
    - `reConfig` [function(config)]: Overrides the config values for future requests



#### Examples

```javascript

// A GET request with only 10 retries
$httpoll({
    url: '/some_resource/123',
    method: 'GET',
    data: {resource: {...}},
    retries: 10
})

// A GET request that retries 50 times, with 200ms between each response/request
$httpoll.get('/some_resource', {retries: 50, delay: 20})

// A POST request that continues to retry if the server returns an error
$httpoll.post('/some_resource', {resource: {...}}, {retryOnError: true})
```

### Provider

By default, `$httpoll` uses angular's `$http` service to make HTTP requests. However, you may change this using the `provider` method. This is especially useful for mocking requests in testing, but could theoretically be used to integrate another HTTP service provider. The provider should accept a configuration object as its sole argument.

#### Example

```javascript
$httpoll.provider = mockHttpProviderFunction
```

**Note:** Changing providers will break the HTTP shortcut methods unless the config object for the custom provider is the same as $http.


## Development and Testing

0. Install [Node.js](http://nodejs.org/) and NPM (should come with)

0. Install local dependencies:

 ```bash
 $ npm install
 $ bower install
 ```

0. Run tests:

 ```bash
 $ karma start
 ```