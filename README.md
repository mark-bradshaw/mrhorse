## MrHorse

Policies for [**hapi**](https://github.com/hapijs/hapi) routes.

Lead Maintainer: [Mark Bradshaw](https://github.com/mark-bradshaw)

### Policies

[MrHorse](https://github.com/mark-bradshaw/mrhorse) is useful for applying policies (characteristics) to routes in hapi.

Policies can be used for authentication, authorization, reply modification and shaping, or logging.  You may create policies such as `isLoggedIn`, `hasAccessToWidget`, `addTracking`, or `logForAnalytics`.  Policies can be applied as either a pre-handler, before the request is processed, or a post-handler, after a reply has been created.

### Usage

To install mrhorse:

```
npm install mrhorse --save
```

*Mrhorse* looks for policies in a folder you create.  I recommend calling it `policies`.  You can have this folder site anywhere in your hapi folder structure.  If you are using plugins for different site functionality, each plugin can have its own separate policies folder.

Once you have created your policies folder you must setup *mrhorse*.  In your plugin's index.js, where you have the `register` function:

```
var mrhorse = require('mrhorse');

mrhorse.setup(server, {
      policyDirectory: __dirname + '/policies'
  }, function(err) {
      if (err) {
          return console.log(err);
      }
  });
```

Now create a policy inside the `policies` folder.  This is just a simple javascript file that exports one function.  The name of the file should be the same as the function name.  For this example you would name the file `isAdmin.js`.

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

The function must call the callback and provide a boolean value indicating whether the request can continue on for further processing.  If you callback with `false` hapi will be sent a forbidden error to reply with.  Alternately you can provide your own custom error object.  By default you will be a 403 forbidden error if you don't provide an alternative error.  If your policy has nothing to do with authentication or authorization, you will probably just want to always respond back with true to continue normal processing of the request.

You can specify whether this policy should run as a pre-handler, a post-handler, or (in a more exotic scenario) both, by adding the `pre` and `post` objects to the function as seen above.  You don't have to add these if you don't want to.  By default all policies are assumed to be pre-handlers only.

Now that you've created your policy, apply it to whatever routes you want.

```
var routes = [
   {
       method: 'your_method',
       path: '/your/path/here',
       config: {
           handler: your_route_handler,
           plugins: {
               policies: ['isAdmin']
           }
       }
   }
];
```

Using policies you can easily mix and match your business logic into your routes in a declarative manner.  This makes it much easier to see what is being done on each route, and allows you to centralize your authentication, authorization, or logging in one place.