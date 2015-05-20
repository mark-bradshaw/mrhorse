## MrHorse

Manage your [**hapi**](https://github.com/hapijs/hapi) routes with modular policies.  Hapi 8 ready!

Lead Maintainer: [Mark Bradshaw](https://github.com/mark-bradshaw), [contributors](CONTRIBUTORS.md)

[![Build Status](https://travis-ci.org/mark-bradshaw/mrhorse.svg?branch=master)](https://travis-ci.org/mark-bradshaw/mrhorse) [![Coverage Status](https://img.shields.io/coveralls/mark-bradshaw/mrhorse.svg)](https://coveralls.io/r/mark-bradshaw/mrhorse) [![Dependencies Up To Date](https://david-dm.org/mark-bradshaw/mrhorse.svg?style=flat)](https://david-dm.org/mark-bradshaw/mrhorse)

### What is it?

This is inspired in part by policies in the sails.js project.  In sails policies are mostly used for authentication and authorization.  In hapi they can do just about anything.  Wouldn't it be nice to easily configure your routes for authentication by adding an 'isLoggedIn' tag?  Or before replying to a request checking to see if 'userHasAccessToWidget'?  Maybe you'd like to do some a/b testing, and want to change some requests to a different handler with 'splitAB'.  Or you'd like to add some special analytics tracking to some of your api requests, after your controller has already responded, with 'trackThisAtAWS'.  You create the policies and MrHorse applies them as directed, when directed.

MrHorse allows you to do all of these and more in a way that centralizes repeated code, and very visibly demonstrates what routes are doing.  You don't have to guess any more whether a route is performing an action.

It looks like this:
```javascript
server.route({
    method: 'GET',
    path: '/loggedin',
    handler: function(request, reply) {},
    config: {
        plugins: {
            policies: ['isLoggedIn', 'addTracking', 'logThis']
        }
    }
});

server.route({
    method: 'GET',
    path: '/admin',
    handler: function(request, reply) {},
    config: {
        plugins: {
            policies: ['isLoggedIn', 'isAnAdmin', 'onlyInUS']
        }
    }
});
```

### Why use this

Often your route handlers end up doing a lot of repeated work to collect data, check for user rights, tack on special data, and otherwise prepare to do the work of replying to a request.  It'd be very nice to keep the code that keeps getting repeated in a single location, and just apply it to routes declaratively. Often you end up repeating the same small bit of code across a lot of handlers to check for rights, or generate some tracking code, update a cookie, etc.  It's hard to see where these actions are happening across your site, code gets repeated, and updating that code to correct a bug can be tricky.

[MrHorse](https://github.com/mark-bradshaw/mrhorse) let's you take those repeated bits of code and centralize them into  "policies", which are just single purpose javascript functions with the signature `function(request, reply, next)`.  Policies are a good fit whenever you find yourself repeating code in your handlers.  Policies can be used for authentication, authorization, reply modification and shaping, logging, or just about anything else you can imagine.  Policies can be applied at any point in the [Hapi request life cycle](http://hapijs.com/api#request-lifecycle), before authentication, before the request is processed, or even after a response has been created.  Once you've created a policy, you just apply it to whatever routes need it and let MrHorse take care of the rest.

Using policies you can easily mix and match your business logic into your routes in a declarative manner.  This makes it much easier to see what is being done on each route, and allows you to centralize your authentication, authorization, or logging in one place to DRY out your code.  If a policy decides that there's a problem with the current request is can immediately reply back with a 403 forbidden error, or the error of your choice.  You always have the option of doing a custom reply, as well, and MrHorse will see that and step out of the way.


### Why use MrHorse instead of Hapi route prerequisites

Hapi provides a somewhat similar mechanism for doing things before a route handler is executed, called route prerequisites.  MrHorse seems to be overlapping this functionality, so why not just use prerequisites?

1. MrHorse puts more focus on whether to continue on to the next policy, allowing you to more easily short circuit a request and skip other policies or the route handler.  This makes authentication and authorization tasks more straightforward.  Since you can stop processing with any policy, it allows you to fail quickly and early, and avoid later processing.
1. MrHorse gives you the option of running policies at any point in the request life cycle, including **after** a request handler has run.  This allows you to easily modify responses, add additional data, or do logging tasks and still run your normal handler.  With prerequisites, you can take over a response, but your route handler won't get run.  It gives you no ability to do additional processing post handler.
1. MrHorse helps you to keep your policy type code in a central location, and loads it up for you.  Prerequisites don't provide any help with this.
1. MrHorse can allow policies to run at even more places in the request life cycle than just right before the handler.  This is a flexibility that prerequisites probably will never have.


### Examples

Look in the `example` folder to see MrHorse in action.


### Install

To install mrhorse:

```
npm install mrhorse --save
```


### Updating from v0.0.3
Version 1.0.0 makes breaking changes from prior versions.  If you were using MrHorse prior to version 1.0.0, you should update your code as follows:

* All the cases of the direct plugin initialisation should be updated from
```javascript
server.plugins.mrhorse.loadPolicies(server, __dirname + '/policies', function(err) {
    ...
    });
```
to
```javascript
server.plugins.mrhorse.loadPolicies(server, {
        policyDirectory: __dirname + '/policies'
    }, function(err) {
    ...
    });
```

The difference is that going forward all options to loadPolicies function will be sent in a container object.

* If you were using the ```post``` configuration option in our policy, like:
```javascript
var policy = function(request, reply, next) {
   ... your policy code
};

// These are optional
policy.post = true;

module.exports = policy;
```

You should update it to:

```javascript
var policy = function(request, reply, next) {
   ... your policy code
};

// These are optional
policy.applyPoint = 'onPostHandler';

module.exports = policy;
```


### Setup

*Mrhorse* looks for policy files in a directory you create.  I recommend calling the directory `policies`, but you can choose any name you want.  You can have this directory sit anywhere in your hapi project structure.  If you are using plugins for different site functionality, each plugin can have its own, separate policies directory.

Once you have created your policies directory you must tell MrHorse where it is.  You do this in two ways.  You can either pass the directory location in to the mrhorse plugin when you register it, like this:

```javascript
server.register({
        register: require('mrhorse'),
        options: {
            policyDirectory: __dirname + '/policies'
        }
    },
    function(err) {
      ...
    });
```

Or you can provide a directory location using the `loadPolicies` function, like this:

```javascript
server.plugins.mrhorse.loadPolicies(server, {
        policyDirectory: __dirname + '/policies'
    }, function(err) {
    ...
    });
```

Both strategies are fine, and can be complementary.  If your hapi project uses plugins to separate up functionality it is perfectly acceptable for each plugin to have its own `policies` folder.  Just use the `loadPolicies` function in each plugin.  See the example folder for additional detail.

You can use mrhorse in as many places as you want.  It's ok to have multiple policies folders in different locations, and tell mrhorse to look in each one.  The only requirement is that each policy file name **must** be globally unique.

By default policies are applied at the `onPreHandler` event in the request lifecycle if no other event is specified in the policy.  Each policy can control which event to apply at.  You can also change the default event to whatever you want.  You would do this by passing in `defaultApplyPoint` in the options object when registering the plugin, like this:

```javascript
server.register({
        register: require('mrhorse'),
        options: {
            policyDirectory: __dirname + '/policies'
            defaultApplyPoint: 'onPreHandler' /* optional.  Defaults to onPreHandler */,
        }
    },
    function(err) {
      ...
    });
```


#### Policies

Now create a policy file inside the `policies` folder.  This is just a simple javascript file that exports one javascript function.  The name of the file should be the name you want to use for your policy.  MrHorse uses the file name, **not** the function name, to identify the policy so make sure you name the file appropriately.  If this policy file is named `isAdmin.js`, then the policy would be identified as `isAdmin`.

```javascript
var isAdmin = function(request, reply, next) {
   var role = _do_something_to_check_user_role(request);
   if (role && role === 'admin') {
       return next(null, true); // All is well with this request.  Proceed to the next policy or the route handler.
   } else {
       return next(null, false); // This policy is not satisfied.  Return a 403 forbidden.
   }
};

// This is optional.  It will default to 'onPreHandler' unless you use a different defaultApplyPoint.
isAdmin.applyPoint = 'onPreHandler';

module.exports = isAdmin;
```

The policy function **must** call the `next` callback and provide a boolean value indicating whether the request can continue on for further processing in the hapi lifecycle [`next(null, true)`].  If you don't call the `next` callback, hapi will **never** respond to the request.  It will timeout.

If you callback with false [`next(null, false)`] hapi will be sent a 403 forbidden error to reply with, by default.  Alternately you can provide your own error object to give a different type of response [`next(Boom.notFound(), false)`].

You can also provide a custom message as a third parameter [`next(null, false, 'Custom message')`].  This will return back the default 403 forbidden error, but will include your message in the body.

If your policy has nothing to do with authentication or authorization, you will just want to respond back with true to continue normal processing of the request [`next(null, true)`].

By default all policies are assumed to be pre-handlers unless you specify otherwise.  You can, however, choose to run a policy at any point in the request life cycle by specifying one of the event names that Hapi provides.  If you would like additional information about events are called in the Hapi request life cycle, please refer to the [Hapi documentation](http://hapijs.com/api#request-lifecycle).

The events in the life cycle are:
1. 'onRequest',
1. 'onPreAuth',
1. 'onPostAuth',
1. 'onPreHandler',
1. 'onPostHandler',
1. 'onPreResponse'

Post handlers can alter the response created by the response handler before it gets sent.  This is useful if you want to add additional data to the response before it goes out on the wire.  The response can be found in `request.response.source`, **only** after the request handler has run.  Before that time there is no response object.

#### Apply to routes

Now that you've created your policy, apply it to whatever routes you want.

```javascript
var routes = [
   {
       method: 'your_method',
       path: '/your/path/here',
       handler: your_route_handler,
       config: {
           plugins: {
               policies: ['isAdmin']
           }
       }
   }
];
```
