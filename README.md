## MrHorse

Manage your [**hapi**](https://github.com/hapijs/hapi) routes with modular policies.

Lead Maintainer: [Mark Bradshaw](https://github.com/mark-bradshaw), [contributors](CONTRIBUTORS.md)

[![Build Status](https://travis-ci.org/mark-bradshaw/mrhorse.svg?branch=master)](https://travis-ci.org/mark-bradshaw/mrhorse) [![Coverage Status](https://img.shields.io/coveralls/mark-bradshaw/mrhorse.svg)](https://coveralls.io/r/mark-bradshaw/mrhorse)

### What is it?

Wouldn't it be nice to easily configure your routes for authentication by adding an 'isLoggedIn' tag?  Or before replying to a request checking to see if 'userHasAccessToWidget'?  Maybe you'd like to do some a/b testing, and want to change some requests to a different handler with 'splitAB'.  Or you'd like to add some special analytics tracking to some of your api requests, after your controller has already responded, with 'trackThisAtAWS'.  You create the policies and MrHorse applies them as directed, when directed.

MrHorse allows you to do all of these and more in a way that centralizes repeated code, and very visibly demonstrates what routes are doing.  You don't have to guess any more whether a route is performing an action.

It looks like this:
```javascript
server.route({
    method: 'GET',
    path: '/loggedin',
    handler: async function() {},
    options: {
        plugins: {
            policies: ['isLoggedIn', 'addTracking', 'logThis']
        }
    }
});

server.route({
    method: 'GET',
    path: '/admin',
    handler: async function() {},
    options: {
        plugins: {
            policies: [
                ['isLoggedIn', 'isAnAdmin'], // Do these two in parallel
                'onlyInUS'
            ]
        }
    }
});
```

### Why use this

Often your route handlers end up doing a lot of repeated work to collect data, check for user rights, tack on special data, and otherwise prepare to do the work of replying to a request.  It'd be very nice to keep the code that keeps getting repeated in a single location, and just apply it to routes declaratively. Often you end up repeating the same small bit of code across a lot of handlers to check for rights, or generate some tracking code, update a cookie, etc.  It's hard to see where these actions are happening across your site, code gets repeated, and updating that code to correct a bug can be tricky.

[MrHorse](https://github.com/mark-bradshaw/mrhorse) let's you take those repeated bits of code and centralize them into  "policies", which are just single purpose javascript functions with the signature `async function(request, h)`.  Policies are a good fit whenever you find yourself repeating code in your handlers.  Policies can be used for authentication, authorization, reply modification and shaping, logging, or just about anything else you can imagine.  Policies can be applied at any point in the [Hapi request life cycle](http://hapijs.com/api#request-lifecycle), before authentication, before the request is processed, or even after a response has been created.  Once you've created a policy, you just apply it to whatever routes need it and let MrHorse take care of the rest.

Using policies you can easily mix and match your business logic into your routes in a declarative manner.  This makes it much easier to see what is being done on each route, and allows you to centralize your authentication, authorization, or logging in one place to DRY out your code.  If a policy decides that there's a problem with the current request it can immediately reply back with a 403 forbidden error, or the error of your choice.  You always have the option of doing a custom reply as well, and MrHorse will see that and step out of the way.


### Why use MrHorse instead of Hapi route prerequisites

Hapi provides a somewhat similar mechanism for doing things before a route handler is executed, called route prerequisites.  MrHorse seems to be overlapping this functionality, so why not just use prerequisites?

1. MrHorse puts more focus on whether to continue on to the next policy, allowing you to more easily short circuit a request and skip other policies or the route handler.  This makes authentication and authorization tasks more straightforward.  Since you can stop processing with any policy, it allows you to fail quickly and early, and avoid later processing.
1. MrHorse gives you the option of running policies at any point in the [Hapi request life cycle](http://hapijs.com/api#request-lifecycle), including **after** a request handler has run.  This allows you to easily modify responses, add additional data, or do logging tasks and still run your normal handler.  With prerequisites, you can take over a response, but your route handler won't get run.  It gives you no ability to do additional processing post handler.
1. MrHorse helps you to keep your policy type code in a central location, and loads it up for you.  Prerequisites don't provide any help with this.
1. MrHorse can allow policies to run at even more places in the [Hapi request life cycle](http://hapijs.com/api#request-lifecycle) than just right before the handler.  This is a flexibility that prerequisites probably will never have.


### Examples

Look in the `example` folder to see MrHorse in action.  `node example/index.js`.


### Install

To install mrhorse:

```
npm install mrhorse --save
```


### Updating

#### From 2.x
Version 3.x contains breaking changes from 2.x. In particular, the Node callback model has been abandoned in favor of `async / await`.  This is a change in the entire Hapi ecosystem, so we are following their decision.  This also means that you must be running at least Node 8.

The following functions are now `async` and do not accept a callback parameter any longer:

* `server.plugins.mrhorse.loadPolicies`

* Policies are now defined as `async` functions. If the function does not throw, it will be considered successful (and should return `h.continue`). In other words, policy definition should change from:
```javascript
function myPolicy(request, reply, next) {
  if (isAdmin(request) === true ) {
    return next(null, true);
  }

  return next(Boom.forbidden('Sorry')); // failure
}
```
to:
```javascript
async function myPolicy(request, h) {
  if (isAdmin(request) === true) {
    return h.continue; // success
  }

  throw Boom.forbidden('Sorry'); // failure
}
```


### Setup

*Mrhorse* looks for policy files in a directory you create.  I recommend calling the directory `policies`, but you can choose any name you want.  You can have this directory sit anywhere in your Hapi project structure.  If you are using plugins for different site functionality, each plugin can have its own, separate policies directory.

Once you have created your policies directory you must tell MrHorse where it is.  You do this in two ways.  You can either pass the directory location in to the mrhorse plugin when you register it, like this:

```javascript
await server.register({
    plugin: require('mrhorse'),
    options: {
        policyDirectory: __dirname + '/policies'
    }
});
```

Or you can provide a directory location using the `loadPolicies` function, like this:

```javascript
server.plugins.mrhorse.loadPolicies(server, {
        policyDirectory: __dirname + '/policies'
    });
```

Both strategies are fine, and can be complementary.  If your Hapi project uses plugins to separate up functionality it is perfectly acceptable for each plugin to have its own `policies` folder.  Just use the `loadPolicies` function in each plugin.  See the example folder for additional detail.

You can use MrHorse in as many places as you want.  It's ok to have multiple policies folders in different locations, and tell MrHorse to look in each one.  The only requirement is that each policy file name **must** be globally unique, since policies can be used on any route in any location.

Normally MrHorse would throw an error when it encounters a duplicate policy, and that's to keep you from accidentally duplicating a policy name, but there are situations that might make sense to ignore the duplicates.  For instance, you might be using a development tool like `wallaby` that will reload your server as you change code, and inadvertently cause MrHorse to reinitialize.  This would cause the process to throw an error and likely abort the server.  In that case you can add `ignoreDuplicates: true` to your MrHorse options and duplicate policies will be silently ignored.

By default policies are applied at the `onPreHandler` event in the [Hapi request life cycle](http://hapijs.com/api#request-lifecycle) if no other event is specified in the policy.  Each policy can control which event to apply at.  You can also change the default event to whatever you want.  You would do this by passing in `defaultApplyPoint` in the options object when registering the plugin, like this:

```javascript
await server.register({
        plugin: require('mrhorse'),
        options: {
            policyDirectory: __dirname + '/policies'
            defaultApplyPoint: 'onPreHandler' /* optional.  Defaults to onPreHandler */,
        }
    });
```


#### Policies

Now create a policy file inside the `policies` folder.  This is just a simple javascript file that exports one `async` javascript function.  The name of the file should be the name you want to use for your policy.  MrHorse uses the file name, **not** the function name, to identify the policy so make sure you name the file appropriately.  If this policy file is named `isAdmin.js`, then the policy would be identified as `isAdmin`.

```javascript
const isAdmin = async function(request, h) {
   const role = _do_something_to_check_user_role(request);
   if (role && role === 'admin') {
       return h.continue; // All is well with this request.  Proceed to the next policy or the route handler.
   }

   throw Boom.forbidden( 'Noo!' ); // This policy is not satisfied.  Return a 403 forbidden.
};

// This is optional.  It will default to 'onPreHandler' unless you use a different defaultApplyPoint.
isAdmin.applyPoint = 'onPreHandler';

module.exports = isAdmin;
```

On success, the policy function **must** return `h.continue`. In case of a failure, the policy function must throw an error.

Non-Boom errors are wrapped into a `Boom.forbidden` object automatically. The `error.message` field will be returned as part of the 403 error.

By default all policies are assumed to be pre-handlers unless you specify otherwise.  You can, however, choose to run a policy at any point in the [Hapi request life cycle](http://hapijs.com/api#request-lifecycle) by specifying one of the event names that Hapi provides.  If you would like additional information about events that are called in the Hapi request life cycle, please refer to the [Hapi documentation](http://hapijs.com/api#request-lifecycle).

The events in the life cycle are:

1. 'onRequest'
2. 'onPreAuth'
3. 'onPostAuth'
4. 'onPreHandler'
5. 'onPostHandler'
6. 'onPreResponse'

Post handlers can alter the response created by the response handler before it gets sent.  This is useful if you want to add additional data to the response before it goes out on the wire.  The response can be found in `request.response.source`, **only** after the request handler has run.  Before that time there is no response object.


#### Loading many policies from a file

A single file can contain multiple policies, if it exports them in the exports object.

```javascript
module.exports = {
    myPolicy1 : async function(request, h) { ... },
    myPolicy2 : async function(request, h) { ... },
    ...
};
```


#### Adding named policies programmatically

```javascript
server.plugins.addPolicy('myPolicy1', async function(request, h) { ... });
```


#### Check if policy exists

```javascript
server.plugins.hasPolicy('myPolicy'); // true | false
```


#### Apply to routes

Now that you've created your policy, apply it to whatever routes you want.

```javascript
const routes = [
   {
       method: 'your_method',
       path: '/your/path/here',
       handler: your_route_handler,
       options: {
           plugins: {
               policies: ['isAdmin']
           }
       }
   }
];
```

##### Specifying policies dynamically as functions

In the `config.plugins.policies` array you can also include raw policy functions.
```javascript
const isAdminPolicy = async function isAdmin (request, h) {

    if (hasAdminAccess(request)) {
        return h.continue;
    }

    throw Boom.forbidden();
};

isAdminPolicy.applyPoint = 'onPreHandler';

const routes = [
   {
       method: 'your_method',
       path: '/your/path/here',
       handler: your_route_handler,
       options: {
           plugins: {
               policies: [ isAdminPolicy ]
           }
       }
   }
];
```

This can be used with currying to great effect.  For instance, a `hasRole` function can be used with policies with a variety of different named roles without creating separate functions for each type of role.

```javascript
const hasRole = function(roleName) {

    const hasSpecificRole = async function hasSpecificRole (request, h) {

        if (hasRole(request, roleName)) {
            return h.continue;
        }

        throw Boom.forbidden();
    };

    hasSpecificRole.applyPoint = 'onPreHandler';

    return hasSpecificRole;
};

const routes = [
   {
       method: 'your_method',
       path: '/your/path/here',
       handler: your_route_handler,
       options: {
           plugins: {
               policies: [ hasRole('user') ]
           }
       }
   }
];
```

##### Running ONLY dynamic policies
If you want to only assign policies dynamically by passing functions to the `policies` config option, this presents a small problem for MrHorse.  In order to not impact the efficiency of Hapi we only run our policy handlers on life cycle hooks when necessary, but due to the way dynamic policies are loaded, we can't determine which hooks are going to be needed ahead of time.

If you want to only use dynamic policies, then you'll need to give MrHorse a bit of a clue, by manually telling it which life cycle hooks to watch for.  Yes, this *DOES* include the `onPreHandler` hook.  

To provide the needed clue add the `watchApplyPoints` option to your plugin options, with an array of the apply points you will be using.

```javascript
await server.register({
        plugin: require('mrhorse'),
        options: {
            watchApplyPoints: ['onPreHandler', 'onPostHandler']
        }
    });
```

##### Running policies in parallel
If you'd like to run policies in parallel, you can specify a list of loaded policies' names as an array or as individual arguments to `MrHorse.parallel`.  When policies are run in parallel, expect all policies to complete.  If any of the policies throw an error, the error response from the left-most policy that was rejected will be returned to the browser.

```javascript
const routes = [
   {
       method: 'your_method',
       path: '/your/path/here',
       handler: your_route_handler,
       options: {
           plugins: {
               policies: [
                    'isFarmer',
                    ['eatsFruit', 'eatsVegetables']
                ]
           }
       }
   }
];
```
or equivalently,
```javascript
const routes = [
   {
       method: 'your_method',
       path: '/your/path/here',
       handler: your_route_handler,
       options: {
           plugins: {
               policies: [
                    'isFarmer',
                    MrHorse.parallel('eatsFruit', 'eatsVegetables')
                ]
           }
       }
   }
];
```

`MrHorse.parallel` optionally accepts a custom error handler as its final argument.  This may be used to aggregate errors from multiple policies into a single custom error or message.  The signature of this function is `handler(ranPolicies, results)`.

If custom error handler is used, the custom error handler **must throw** in the cases it detects any reason to reject the policy. If the error handler function returns without throwing an error, the parallel policy will be considered satisfied.

 - `ranPolicies` is an array of the names of the policies that were run, with original listed order maintained.
 - `results` is an object whose keys are the names of the individual listed policies that ran, and whose values are objects of the format,
   - `err:` the error thrown by the policy
   - `status:` a field indicating whether the policy passed (`'ok'`) or not (`'error'`)


##### Conditional Policies

Normally all policies must be satisfied.

MrHorse exposes `MrHorse.orPolicy()` function to provide an easy way to define a set of policies of which **at least one** must be satisfied.
The tests are run in parallel. Error messages from unsatisfied policies are ignored, as long as at least one listed policy is satisfied.

If all policies are unsatisfied, the request is rejected with the error message of the left-most policy.

```javascript
const MrHorse = require('mrhorse');

const routes = [
   {
       method: 'your_method',
       path: '/your/path/here',
       handler: your_route_handler,
       options: {
           plugins: {
               policies: [
                    'isAnimal', // must be satisfied
                    MrHorse.orPolicy('isMammal', 'isReptile', 'isInsect'), // at least ONE must be satisfied
                    ['isBird', 'isBluejay'] // ALL must be satisfied
                ]
           }
       }
   }
];
```
