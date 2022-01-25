# medic-builds-repo

Design doc for builds repository.

DDocs are [pushed up by CI](https://github.com/medic/medic-webapp/blob/master/scripts/ci/push_to_staging.sh) with a specific name. These are then [pulled back down by api](https://github.com/medic/medic-api/blob/master/controllers/upgrade.js) and deployed by [horticulturalist](https://github.com/medic/horticulturalist).

## Design Doc requirements

### Naming scheme

Three valid examples: `medic:medic:3.0.0-beta.1`, `medic:medic:3.0.0`, `medic:medic:my-awesome-feature-branch`.

The first two chunks between `:` is the namespace and the application name respectively. The namespace is just that: it has no logic relevant and is just used to scope things. The application name maps to the original ddoc name. It is what will be used to determine what to call the ddoc when deploying it.

The next section is either the version or the branch. We support both "released" versions (`1.2.3`) or and "pre-release" versions (`1.2.3-beta.4`). The pre-release label can be whatever you like. We also support an arbitrary branch name.

### Metadata

There needs to be a `build_info` property in the ddoc:
```json
{
    "build_info": {
        "namespace": "medic",
        "application": "medic",
        "version": "3.0.0",
        "time": "2018-04-09T07:48:27.015Z",
        "author": "travis-ci"
    }
}
```

## Usage

All usage is through the `builds/releases` view.

Usage is documented via the [ddoc integration test](https://github.com/medic/medic-builds-repo/blob/master/test/int/ddoc.js), showing how to use the view using the PouchDB library. Other libraries (or straight `curl`) will be similar.

Quick notes:
 - use `startkey` and `endkey` to filter the view to get what you want.
 - releases and pre-releases are sorted by the major / minor / patch / pre-releasse number
 - branches are sorted newest branch first

## Requirements for creating new releases

If you wish to write a new release your CouchDB user needs to have the `builds-admin` role defined.

The DDoc only allows branch builds to be re-written over multiple times: release and beta build types are only allowed to be created once.

## Testing

To run the integration tests you need CouchDB (1.x or 2.x).

Run the unit tests with `npm run unit-tests`.

To also run the integration tests call `npm run int-tests`. You need to pass in the URL of the CouchDB database you want to run the tests on.

The `TEST_URL` must contain any basic auth required, and the basic auth user must be able to create users and DBs. The DB passed in `TEST_DB` doesn't have to yet exist. The tests will destroy and re-create this DB when running the tests:

```
TEST_URL=http://admin:pass@localhost:5984 TEST_DB=builds-test grunt test
```

## Deployment

Automatic deployment to the build server is handled by GitHub Actions, when a branch is merged to `master`. See: https://github.com/medic/medic-builds-repo/blob/master/scripts/pushToServer.js

If you want to generate the ddoc yourself you can use `couch-compile`:

```sh
npx couch-compile ddocs/builds/ | jq .
# Or
./node_modules/.bin/couch-compile ddocs/builds/ | jq .
```
