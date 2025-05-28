# Ghost Rebrander

This application will help "rebrand" a [Ghost](https://ghost.org/) instance by
replacing one string with another in ALL posts.

For example, if your blog used to be called "Cool Blog" and was now "Awesome
Blog", you may want to go through all posts and replace "Cool Blog" with
"Awesome Blog".

This will help you do that.

You can try the live version at `https://rebrander.undercoveryeti.ca`, or read
the rest of this document to learn how to run it yourself.

## Getting Started

This project is built with [Deno](https://deno.com/). If you also have Docker
installed, you can quickly run the server with

```
deno install
deno run docker
```

which will build and run a Docker container with the API server, hosting the
client app. Navigate to `http://localhost:8000` to use the Rebrander locally. If
you would like to actually deploy the app, you can override `.env.production`
with the URL it will live at and run

```
deno run docker:build
```

to build a production image you can then use.

Otherwise, you can run

```
deno install
deno run dev
```

to start the client and server in local dev mode.

## Development

### Server

The Server is a TypeScript app built with Deno and [Hono](https://hono.dev/),
and can be found in the `api` folder. It exposes a simple healthcheck route, a
`details` route to fetch the site details of a Ghost instance, and an `update`
route, which exposes a `ws` websocket route that triggers a rebrand operation
and periodically reports on it's status.

The server will also host the client app for convenience.

The server makes heavy use of the
[neverthrow](https://github.com/supermacro/neverthrow) Result type in it's
return values, to make it clear what functions can have errors and to help
leverage the type system to enforce checking.

### Server Testing

Tests for files are present beside the file in question with a `.test.ts`
postfix added. It uses the Deno test functions. As of this writing, the VS Code
plugin only recognizes the `Deno.test` construct for it's Testing and test
debugging feature, not the BDD/Jest style `describe`/`it` constructs, so tests
are written that way even though they primarily use the `expect` package for
actual assertions.

### Client

The client application is actually built with [Vite](https://vite.dev/), and
uses [SolidJS](https://www.solidjs.com/) as its framework.

It lives primarily in the `src` folder, though it does import a few schemas and
types from the sever's `api` folder.

The application will first take a URL and verify that it's a Ghost site. It will
then accept input of a
[Custom Integration API key](https://ghost.org/integrations/custom-integrations/)
(or Staff Access Token with sufficient access), a target string to replace, and
the string to replace it with.

Upon submission, it will use the server's update websocket to send the
configuration and trigger the update. It will then listen to the websocket for
status updates and errors from the server, displaying the information to the
user. Any posts that fail to update will have links to their edit page created
for manual intervention.

Once the update is complete, a summary will be shown to the user.

#### Client Testing

The client tests are written with vitest. Using Solid, the application is
structured such that most of the complexity lives in the siteInfo and rebrander
utilities. They both follow a similar pattern, exporting a function that takes
some config and returns an object with one or more Solid signal getters,
setters, and a single Resource that does the bulk of the (async) work.

The idea is to make it easy to write tests around those utilies validating all
of the business logic, and then just have a couple very simple components wired
up to display or update the signals and control which components are shown.
