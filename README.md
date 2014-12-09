## MrHorse

Manage your [**hapi**](https://github.com/hapijs/hapi) routes with modular policies.

Lead Maintainer: [Mark Bradshaw](https://github.com/mark-bradshaw)

[![Build Status](https://travis-ci.org/mark-bradshaw/mrhorse.svg?branch=master)](https://travis-ci.org/mark-bradshaw/mrhorse)

### What

This is inspired in part by policies in the sails.js project.  In sails they are mostly used for authentication and authorization.  In hapi they can do just about anything.  Wouldn't it be nice to easily configure your routes for authentication by adding an 'isLoggedIn' tag?  Or before reply to a page checking to see if 'userHasAccessToWidget'?  Maybe you'd like to add some special analytics tracking to some of your api requests, after your controller has responded.

MrHorse allows you to do all of these and more in a way that centralizes repeated code, and very visibly demonstrates what routes are doing.  You don't have to guess any more whether a route is performing an action.

### Why

Often your route handlers end up doing a lot of repeated work to collect data, check for user rights, tack on special data, and otherwise prepare to do the work of reply to a request.  It'd be very nice to keep the code that keeps getting repeated in a single location, and just apply it to routes as needed. Often you end up repeating the same small bit of code across a lot of handlers to check for rights, or generate some tracking code, update a cookie, etc.  It's hard to see where these actions are happening across your site, and updating that code to correct a bug can be tricky.

[MrHorse](https://github.com/mark-bradshaw/mrhorse) let's you take those repeated bits of code and centralize them into a "policy."  Policies are a good fit whenever you find yourself repeating code in your handlers.  Policies can be used for authentication, authorization, reply modification and shaping, logging, or just about anything else you can imagine.  Policies can be applied as either a pre-handler, before the request is processed, or a post-handler, after a response has been created, or both.  Once you've created a policy, you just apply it to whatever routes need it and let MrHorse take care of the rest.

Using policies you can easily mix and match your business logic into your routes in a declarative manner.  This makes it much easier to see what is being done on each route, and allows you to centralize your authentication, authorization, or logging in one place to DRY out your code.  If a policy decides that there's a problem with the current request is can immediately reply back with a 403 forbidden error, or the error of your choice.

### Examples

Look in the `example` folder to see MrHorse in action.

### Usage

To install mrhorse:

```
npm install mark-bradshaw/mrhorse --save
```

*Mrhorse* looks for policies in a folder you create.  I recommend calling it `policies`, but you can choose whatever you want.  You can have this folder sit anywhere in your hapi folder structure.  If you are using plugins for different site functionality, each plugin can have its own separate policies folder.

Once you have created your policies folder you must setup mrhorse.  You can setup mrhorse in as many places as you want.  It's ok to have multiple policies folders in different locations, and setup mrhorse to look in each one.  The only requirement is that each policy name must be globally unique.  To setup mrhorse call it with the server object, an options object with the location of the policyDirectory, and a callback.  Mrhorse will load all javascript files in the policies directory as policies to be used with routes.

```
var mrhorse = require('mrhorse');

mrhorse.setup(server, {
  policyDirectory: __dirname + '/policies'
}, function(err) {
  if (err) {
      console.log(err);
  }
});
```

Now create a policy file inside the `policies` folder.  This is just a simple javascript file that exports one function.  The name of the file should be the same as the function name.  Mrhorse uses the file name, **not** the function name, so make sure you name the file appropriately.  For this example you would name the file `isAdmin.js`.

```
var isAdmin = function(request, reply, callback) {
   var role = _do_something_to_check_user_role(request);
   if (role && (role === 'admin')) {
       return callback(null, true);
   } else {
       return callback(null, false);
   }
};

isAdmin.pre = true;
isAdmin.post = false;

module.exports = isAdmin;
```

The policy function **must** call the callback and provide a boolean value indicating whether the request can continue on for further processing in the hapi lifecycle [`callback(null, true)`].  If you don't call the callback, hapi will never respond to the request.  It will timeout.  If you callback with false [`callback(null, false)`] hapi will be sent a 403 forbidden error to reply with, by default.  Alternately you can provide your own error object to give a different type of response [`callback(Boom.notFound())`].  You can also provide a custom message as a third parameter [`callback(null, false, 'Custom message')`].  If your policy has nothing to do with authentication or authorization, you will just want to always respond back with true to continue normal processing of the request [`callback(null, true)`].

You can specify whether this policy should run as a pre-handler, a post-handler, or (in a more exotic scenario) both, by adding the `pre` and `post` objects to the function as seen above.  You don't have to add these if you don't want to.  By default all policies are assumed to be pre-handlers only, unless you specify otherwise.  If you would like additional information about when exactly pre and post handlers are called in the Hapi request life cycle, please refer to the [Hapi documentation](https://github.com/hapijs/hapi/blob/master/docs/Reference.md#request-lifecycle).

Now that you've created your policy, apply it to whatever routes you want.

```
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
