## MrHorse

"No sir, I don't like it."

Policies for [**hapi**](https://github.com/hapijs/hapi) routes.

Lead Maintainer: [Mark Bradshaw](https://github.com/mark-bradshaw)

[![Build Status](https://travis-ci.org/mark-bradshaw/mrhorse.svg?branch=master)](https://travis-ci.org/mark-bradshaw/mrhorse)

### Why

[MrHorse](https://github.com/mark-bradshaw/mrhorse) is useful for applying policies to routes in hapi.  Policies are a good fit whenever you find yourself repeating code in your handlers.  Policies can be used for authentication, authorization, reply modification and shaping, or logging.  You might have policies like `isLoggedIn`, `hasAccessToWidget`, `addTracking`, or `logForAnalytics`.  Policies can be applied as either a pre-handler, before the request is processed, or a post-handler, after a response has been created, or both.

Using policies you can easily mix and match your business logic into your routes in a declarative manner.  This makes it much easier to see what is being done on each route, and allows you to centralize your authentication, authorization, or logging in one place to DRY out your code.

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
