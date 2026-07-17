# changelog

all notable changes to this project are documented here. the format loosely follows
[keep a changelog](https://keepachangelog.com/en/1.1.0/), and the project aims to follow
[semantic versioning](https://semver.org/spec/v2.0.0.html).

## [unreleased]

### added

- project documentation: `ARCHITECTURE.md`, `CONTRIBUTING.md`, and per-domain docs under `docs/`.

### changed

- `updateOrderStatus` now guards against concurrent updates and treats re-applying the
  current status as a no-op, so retried webhooks and double-clicked admin actions are safe.
  the admin status endpoint accepts an optional `expectedStatus` precondition.

## [0.2.0]

### added

- orders module: order creation, per-user and admin listing, cancellation, and status
  transitions with an allowed-transition state machine.
- reviews module: product reviews and ratings with a one-review-per-user-per-product rule.

## [0.1.0]

### added

- initial relivator starter: next.js 15 app router, better-auth, drizzle + postgres,
  polar payments, and uploadthing storage.
